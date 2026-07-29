import {
    getDonationItemStatus,
    getProgressPercent,
} from "../daycareDonationsData";
import type {
    DonationCategory,
    DonationItem,
    DonationSelection,
} from "../types";
import styles from "../DaycareDonations.module.scss";
import DonationProjectCard from "./DonationProjectCard";
import ProgressBar from "./ProgressBar";

type DonationCategorySectionProps = {
    category: DonationCategory;
    donationItems: DonationItem[];
    index: number;
    onDonate: (selection: DonationSelection) => void;
};

const openingPriority: Record<string, number> = {
    electricity: 1,
    plumbing: 2,
    shade: 3,
    security: 4,
    lighting: 5,
    "daycare-kitchen": 6,
    painting: 7,
    drywall: 8,
    storage: 9,
    furniture: 10,
    unexpected: 11,
};

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("he-IL").format(value);

const DonationCategorySection = ({
    category,
    donationItems,
    index,
    onDonate,
}: DonationCategorySectionProps) => {
    const categoryItems = donationItems.filter(
        (item) => item.categoryId === category.id
    );
    const categoryRaised = categoryItems.reduce(
        (total, item) => total + item.raised,
        0
    );
    const categoryRemaining = Math.max(0, category.goal - categoryRaised);
    const categoryProgress = getProgressPercent({
        goal: category.goal,
        raised: categoryRaised,
    });
    const items = categoryItems
        .filter((item) => getDonationItemStatus(item) !== "complete")
        .sort((first, second) => {
            const firstRemaining = first.goal - first.raised;
            const secondRemaining = second.goal - second.raised;
            const firstProgress = getProgressPercent(first);
            const secondProgress = getProgressPercent(second);
            const firstGroup =
                getDonationItemStatus(first) === "closed"
                    ? 3
                    : firstProgress >= 80
                      ? 0
                      : firstRemaining <= 1_000
                        ? 1
                        : 2;
            const secondGroup =
                getDonationItemStatus(second) === "closed"
                    ? 3
                    : secondProgress >= 80
                      ? 0
                      : secondRemaining <= 1_000
                        ? 1
                        : 2;

            return (
                firstGroup - secondGroup ||
                (openingPriority[first.id] ?? 99) -
                    (openingPriority[second.id] ?? 99) ||
                firstRemaining - secondRemaining
            );
        });

    return (
        <section
            className={`${styles.categorySection} ${
                index % 2 === 1 ? styles.categorySectionAlt : ""
            }`}
            aria-labelledby={`category-${category.id}-title`}
            id={`category-${category.id}`}
        >
            <div className={styles.categoryHeading}>
                <div className={styles.categoryCopy}>
                    <div className={styles.categoryTitleRow}>
                        <div>
                            <p className={styles.categoryNumber}>
                                פרק {String(index + 1).padStart(2, "0")}
                            </p>
                            <h2 id={`category-${category.id}-title`}>
                                {category.title}
                            </h2>
                            <p>{category.description}</p>
                        </div>
                        <strong className={styles.categoryPercent}>
                            {categoryProgress}%
                        </strong>
                    </div>
                    <div className={styles.categoryProgress}>
                        <div className={styles.categoryProgressNumbers}>
                            <span>
                                יעד <strong>₪{formatCurrency(category.goal)}</strong>
                            </span>
                            <span>
                                גויסו{" "}
                                <strong>₪{formatCurrency(categoryRaised)}</strong>
                            </span>
                            <span>
                                נותרו{" "}
                                <strong>
                                    ₪{formatCurrency(categoryRemaining)}
                                </strong>
                            </span>
                        </div>
                        <ProgressBar
                            value={categoryProgress}
                            label={`${categoryProgress}% גויסו עבור ${category.title}`}
                        />
                    </div>
                </div>
            </div>

            <div
                className={`${styles.cardsGrid} ${
                    items.length === 1
                        ? styles.cardsGridSingle
                        : items.length === 2
                          ? styles.cardsGridDouble
                          : ""
                }`}
            >
                {items.map((item) => (
                    <DonationProjectCard
                        key={item.id}
                        item={item}
                        onDonate={onDonate}
                    />
                ))}
            </div>
        </section>
    );
};

export default DonationCategorySection;
