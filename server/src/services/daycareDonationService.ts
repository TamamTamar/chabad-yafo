import {
    DAYCARE_DONATION_CAMPAIGN_SLUG,
    defaultDaycareDonationCampaign,
} from "../config/daycareDonationDefaults";
import { areDaycareDonationPaymentsEnabled } from "../config/daycareDonationSecurity";
import { DaycareDonationCampaign } from "../models/DaycareDonationCampaign";
import { DaycareDonationRecord } from "../models/DaycareDonationRecord";

type ConfirmedDonationAmount = {
    amount: number;
    itemId?: string | null;
};

type GoalCategory = { id: string; goal: number };
type GoalItem = { categoryId: string; goal: number };

type PublicDonationSource = {
    _id: unknown;
    amount: number;
    donorName?: string | null;
    dedication?: string | null;
    displayDonorName?: boolean | null;
    receivedAt: Date;
};

export const toPublicDaycareDonation = (record: PublicDonationSource) => ({
    id: String(record._id),
    donorName:
        record.displayDonorName !== false && record.donorName
            ? record.donorName
            : "תרומה אנונימית",
    amount: record.amount,
    dedication: record.dedication || undefined,
    receivedAt: record.receivedAt,
});

export const deriveDaycareDonationGoals = (
    categories: GoalCategory[],
    items: GoalItem[]
) => {
    const categoryGoals = new Map<string, number>();
    categories.forEach((category) => categoryGoals.set(category.id, 0));
    items.forEach((item) => {
        categoryGoals.set(
            item.categoryId,
            (categoryGoals.get(item.categoryId) ?? 0) + item.goal
        );
    });

    const campaignGoal = [...categoryGoals.values()].reduce(
        (total, goal) => total + goal,
        0
    );

    return { campaignGoal, categoryGoals };
};

export const synchronizeDaycareDonationGoals = (campaign: {
    goal: number;
    categories: GoalCategory[];
    items: GoalItem[];
}) => {
    const derived = deriveDaycareDonationGoals(
        campaign.categories,
        campaign.items
    );
    campaign.goal = derived.campaignGoal;
    campaign.categories.forEach((category) => {
        category.goal = derived.categoryGoals.get(category.id) ?? 0;
    });
    return derived;
};

export const calculateDaycareDonationTotals = (
    records: ConfirmedDonationAmount[]
) => {
    const raisedByItem = new Map<string, number>();
    let generalRaised = 0;
    let raised = 0;

    records.forEach((record) => {
        raised += record.amount;
        if (record.itemId) {
            raisedByItem.set(
                record.itemId,
                (raisedByItem.get(record.itemId) ?? 0) + record.amount
            );
        } else {
            generalRaised += record.amount;
        }
    });

    return { raised, generalRaised, raisedByItem };
};

export const ensureDefaultDaycareDonationCampaign = async () => {
    await DaycareDonationCampaign.updateOne(
        { slug: DAYCARE_DONATION_CAMPAIGN_SLUG },
        { $setOnInsert: defaultDaycareDonationCampaign },
        { upsert: true, runValidators: true }
    );

    const campaign = await DaycareDonationCampaign.findOne({
        slug: DAYCARE_DONATION_CAMPAIGN_SLUG,
    });

    if (!campaign) {
        throw new Error("Daycare donation campaign could not be initialized");
    }

    return campaign;
};

export const getDaycareDonationCampaignSnapshot = async () => {
    const campaign = await ensureDefaultDaycareDonationCampaign();
    const records = await DaycareDonationRecord.find({
        campaignSlug: campaign.slug,
        status: "confirmed",
    })
        .select({
            amount: 1,
            itemId: 1,
            donorName: 1,
            dedication: 1,
            displayDonorName: 1,
            receivedAt: 1,
        })
        .sort({ receivedAt: -1 })
        .lean();

    const { raised, generalRaised, raisedByItem } =
        calculateDaycareDonationTotals(records);
    const derivedGoals = deriveDaycareDonationGoals(
        campaign.categories,
        campaign.items
    );

    const categories = [...campaign.categories]
        .sort((first, second) => first.order - second.order)
        .map((category) => {
            const categoryRaised = campaign.items
                .filter((item) => item.categoryId === category.id)
                .reduce(
                    (total, item) =>
                        total + (raisedByItem.get(item.id) ?? 0),
                    0
                );
            const goal =
                derivedGoals.categoryGoals.get(category.id) ?? 0;
            return {
                id: category.id,
                title: category.title,
                shortTitle: category.shortTitle,
                description: category.description,
                goal,
                raised: categoryRaised,
                remaining: Math.max(0, goal - categoryRaised),
                overflow: Math.max(0, categoryRaised - goal),
                order: category.order,
                visual: category.visual,
            };
        });

    const items = [...campaign.items]
        .sort(
            (first, second) =>
                first.order - second.order ||
                first.openingPriority - second.openingPriority
        )
        .map((item) => {
            const itemRaised = raisedByItem.get(item.id) ?? 0;
            const acceptingDonations =
                item.statusOverride === "open"
                    ? true
                    : item.statusOverride === "closed"
                      ? false
                      : item.acceptingDonations && itemRaised < item.goal;

            return {
                id: item.id,
                categoryId: item.categoryId,
                title: item.title,
                description: item.description,
                goal: item.goal,
                raised: itemRaised,
                remaining: Math.max(0, item.goal - itemRaised),
                overflow: Math.max(0, itemRaised - item.goal),
                order: item.order,
                openingPriority: item.openingPriority,
                acceptingDonations,
                statusOverride: item.statusOverride,
                visual: item.visual,
            };
        });

    return {
        slug: campaign.slug,
        title: campaign.title,
        goal: derivedGoals.campaignGoal,
        active: campaign.active,
        publicVisible:
            process.env.NODE_ENV !== "production" ||
            process.env.DAYCARE_DONATIONS_PUBLIC_VISIBLE === "true",
        paymentsEnabled:
            campaign.active &&
            areDaycareDonationPaymentsEnabled(),
        raised,
        remaining: Math.max(0, derivedGoals.campaignGoal - raised),
        overflow: Math.max(0, raised - derivedGoals.campaignGoal),
        generalRaised,
        donationCount: records.length,
        recentDonations: records.slice(0, 60).map(toPublicDaycareDonation),
        categories,
        items,
        updatedAt: campaign.updatedAt,
    };
};
