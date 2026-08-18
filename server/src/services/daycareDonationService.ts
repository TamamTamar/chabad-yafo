import {
    DAYCARE_DONATION_CAMPAIGN_SLUG,
    defaultDaycareDonationCampaign,
} from "../config/daycareDonationDefaults";
import { areDaycareDonationPaymentsEnabled } from "../config/daycareDonationSecurity";
import { DaycareDonationCampaign } from "../models/DaycareDonationCampaign";
import { DaycareDonationRecord } from "../models/DaycareDonationRecord";

export const convertDaycareDonationToIls = (
    amount: number,
    currency: "ILS" | "USD",
    exchangeRate = 1
) => Math.round(amount * (currency === "USD" ? exchangeRate : 1));

type ConfirmedDonationAmount = {
    amount: number;
    itemId?: string | null;
    allocations?: Array<{
        itemId: string;
        amount: number;
    }> | null;
};

export type DaycareDonationAllocation = {
    itemId: string;
    amount: number;
};

type GoalCategory = { id: string; goal: number };
type GoalItem = { categoryId: string; goal: number };

type PublicDonationSource = {
    _id: unknown;
    amount: number;
    originalAmount?: number | null;
    originalCurrency?: "ILS" | "USD" | null;
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
    originalAmount:
        record.originalCurrency === "USD" && record.originalAmount
            ? record.originalAmount
            : undefined,
    originalCurrency:
        record.originalCurrency === "USD" ? "USD" as const : undefined,
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
        if (record.allocations?.length) {
            record.allocations.forEach((allocation) => {
                raisedByItem.set(
                    allocation.itemId,
                    (raisedByItem.get(allocation.itemId) ?? 0) +
                        allocation.amount
                );
            });
        } else if (record.itemId) {
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

export const normalizeDaycareDonationAllocations = (
    value: unknown,
    donationAmount: number,
    validItemIds: ReadonlySet<string>
): DaycareDonationAllocation[] => {
    if (!Array.isArray(value)) {
        throw new Error("Donation allocations must be an array");
    }
    if (value.length > Math.min(2, validItemIds.size)) {
        throw new Error("Donation allocations count is invalid");
    }
    if (value.length === 0) return [];

    const seenItemIds = new Set<string>();
    const allocations = value.map((entry) => {
        if (!entry || typeof entry !== "object") {
            throw new Error("Donation allocation is invalid");
        }
        const candidate = entry as Record<string, unknown>;
        const itemId =
            typeof candidate.itemId === "string"
                ? candidate.itemId.trim()
                : "";
        const amount = Number(candidate.amount);

        if (!validItemIds.has(itemId)) {
            throw new Error("Donation allocation item was not found");
        }
        if (seenItemIds.has(itemId)) {
            throw new Error("Donation allocation items must be unique");
        }
        if (!Number.isFinite(amount) || amount <= 0) {
            throw new Error("Donation allocation amount is invalid");
        }

        seenItemIds.add(itemId);
        return {
            itemId,
            amount: Math.round(amount * 100) / 100,
        };
    });

    const allocatedCents = allocations.reduce(
        (total, allocation) => total + Math.round(allocation.amount * 100),
        0
    );
    if (allocatedCents !== Math.round(donationAmount * 100)) {
        throw new Error("Donation allocations must equal the donation amount");
    }

    return allocations;
};

export const ensureDefaultDaycareDonationCampaign = async () => {
    await DaycareDonationCampaign.updateOne(
        { slug: DAYCARE_DONATION_CAMPAIGN_SLUG },
        { $setOnInsert: defaultDaycareDonationCampaign },
        { upsert: true, runValidators: true }
    );

    await DaycareDonationCampaign.updateOne(
        {
            slug: DAYCARE_DONATION_CAMPAIGN_SLUG,
            fieldUpdates: { $exists: false },
        },
        { $set: { fieldUpdates: defaultDaycareDonationCampaign.fieldUpdates } },
        { runValidators: true }
    );

    await DaycareDonationCampaign.updateOne(
        {
            slug: DAYCARE_DONATION_CAMPAIGN_SLUG,
            recommendedChoiceIds: { $exists: false },
        },
        { $set: { recommendedChoiceIds: [] } },
        { runValidators: true }
    );

    const campaign = await DaycareDonationCampaign.findOne({
        slug: DAYCARE_DONATION_CAMPAIGN_SLUG,
    });

    if (!campaign) {
        throw new Error("Daycare donation campaign could not be initialized");
    }

    return campaign;
};

export const getDaycareDonationCampaignSnapshot = async (options?: {
    includeUnpublishedUpdates?: boolean;
}) => {
    const campaign = await ensureDefaultDaycareDonationCampaign();
    const records = await DaycareDonationRecord.find({
        campaignSlug: campaign.slug,
        status: "confirmed",
    })
        .select({
            amount: 1,
            originalAmount: 1,
            originalCurrency: 1,
            itemId: 1,
            allocations: 1,
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

    const fieldUpdates = [...(campaign.fieldUpdates ?? [])]
        .filter(
            (update) =>
                options?.includeUnpublishedUpdates || update.published
        )
        .sort(
            (first, second) =>
                (second.publishedAt ?? second.updatedAt).getTime() -
                (first.publishedAt ?? first.updatedAt).getTime()
        )
        .map((update) => ({
            id: update.id,
            title: update.title,
            description: update.description,
            itemId: update.itemId,
            published: update.published,
            publishedAt: update.publishedAt,
            imageUrl: update.image.storageKey
                ? `/api/daycare-donations/field-updates/${encodeURIComponent(update.id)}/image`
                : update.image.src,
            imageAlt: update.image.alt,
            createdAt: update.createdAt,
            updatedAt: update.updatedAt,
        }));

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
        recommendedChoiceIds: campaign.recommendedChoiceIds ?? [],
        fieldUpdates,
        updatedAt: campaign.updatedAt,
    };
};
