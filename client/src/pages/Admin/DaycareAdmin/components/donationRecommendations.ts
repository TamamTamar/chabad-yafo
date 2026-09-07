import type { DonationItem } from "../../../DaycareDonations/types";

export const getInactiveRecommendedItems = (
    items: DonationItem[],
    choiceIds: string[],
    getInactiveLabel: (item: DonationItem) => string | null
) => choiceIds
    .map((choiceId) => items.find((item) => item.id === choiceId))
    .filter((item): item is DonationItem =>
        item !== undefined && Boolean(getInactiveLabel(item))
    );
