import { ArrowLeft, HeartHandshake, Target, Zap } from "lucide-react";
import {
    getDonationItemStatus,
    getProgressPercent,
} from "../daycareDonationsData";
import type { DonationItem, DonationSelection } from "../types";
import styles from "../DaycareDonations.module.scss";

type RecommendedDonationChoicesProps = {
    donationItems: DonationItem[];
    generalRaised: number;
    recommendedChoiceIds: string[];
    onDonate: (selection: DonationSelection) => void;
};

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("he-IL").format(value);

const getRemaining = (item: DonationItem) =>
    Math.max(0, item.remaining ?? item.goal - item.raised);

const RecommendedDonationChoices = ({
    donationItems,
    generalRaised,
    recommendedChoiceIds,
    onDonate,
}: RecommendedDonationChoicesProps) => {
    const openItems = donationItems.filter(
        (item) => {
            const status = getDonationItemStatus(item);

            return (
                item.acceptingDonations &&
                status !== "complete" &&
                status !== "closed" &&
                getRemaining(item) > 0
            );
        }
    );
    const urgentItem = [...openItems].sort(
        (first, second) =>
            (first.openingPriority ?? 999) -
                (second.openingPriority ?? 999) ||
            getRemaining(first) - getRemaining(second)
    )[0];
    const quickWinItem = [...openItems]
        .filter((item) => item.id !== urgentItem?.id)
        .sort(
            (first, second) =>
                getRemaining(first) - getRemaining(second) ||
                getProgressPercent(second) - getProgressPercent(first)
        )[0];

    const automaticIds = [urgentItem?.id, quickWinItem?.id, "general"].filter(
        (value): value is string => Boolean(value)
    );
    const configuredIds =
        recommendedChoiceIds.length === 3 ? recommendedChoiceIds : [];
    const validItemIds = new Set(openItems.map((item) => item.id));
    const selectedIds = [...configuredIds, ...automaticIds, ...validItemIds]
        .filter(
            (choiceId, index, choices) =>
                (choiceId === "general" || validItemIds.has(choiceId)) &&
                choices.indexOf(choiceId) === index
        )
        .slice(0, 3);

    const donateToItem = (item: DonationItem) =>
        onDonate({ kind: "item", id: item.id, title: item.title });

    return (
        <section
            className={styles.recommendedSection}
            aria-labelledby="recommended-donations-title"
            id="campaign-parts"
        >
            <header className={styles.recommendedHeading}>
                <p className={styles.sectionEyebrow}>שלוש דרכים פשוטות לעזור</p>
                <h2 id="recommended-donations-title">מה הכי יעזור עכשיו?</h2>
                <p>
                    בחרנו עבורכם את הצרכים שכדאי לקדם כרגע. תמיד אפשר גם
                    לפתוח את הרשימה המלאה בהמשך.
                </p>
            </header>

            <div className={styles.recommendedGrid}>
                {selectedIds.map((choiceId, index) => {
                    const isGeneral = choiceId === "general";
                    const item = isGeneral
                        ? undefined
                        : openItems.find((entry) => entry.id === choiceId);
                    if (!isGeneral && !item) return null;

                    return (
                        <article
                            key={choiceId}
                            className={`${styles.recommendedCard} ${
                                isGeneral
                                    ? styles.recommendedGeneral
                                    : index === 0
                                      ? styles.recommendedUrgent
                                      : ""
                            }`}
                        >
                            <div className={styles.recommendedIcon} aria-hidden="true">
                                {isGeneral ? (
                                    <HeartHandshake />
                                ) : index === 0 ? (
                                    <Zap />
                                ) : (
                                    <Target />
                                )}
                            </div>
                            <span className={styles.recommendedLabel}>
                                {isGeneral
                                    ? "נותנים לנו לבחור"
                                    : index === 0
                                      ? "הכי דחוף עכשיו"
                                      : index === 1
                                        ? "יעד שכדאי לקדם"
                                        : "צורך נוסף במעון"}
                            </span>
                            <h3>
                                {isGeneral
                                    ? "למקום שבו התרומה נדרשת ביותר"
                                    : item?.title}
                            </h3>
                            <p>
                                {isGeneral
                                    ? "נפנה את התרומה לצורך שמקדם את פתיחת המעון בצורה הטובה ביותר באותו רגע."
                                    : item?.description}
                            </p>
                            <strong>
                                {isGeneral
                                    ? `₪${formatCurrency(generalRaised)} כבר נתרמו במסלול הזה`
                                    : `נותרו ₪${formatCurrency(getRemaining(item as DonationItem))}`}
                            </strong>
                            <button
                                type="button"
                                onClick={() =>
                                    isGeneral
                                        ? onDonate({
                                              kind: "general",
                                              id: "general",
                                              title: "למקום שבו התרומה נדרשת ביותר",
                                          })
                                        : donateToItem(item as DonationItem)
                                }
                            >
                                {isGeneral
                                    ? "תרומה כללית למעון"
                                    : index === 0
                                      ? "שותפים בצורך הדחוף"
                                      : "מקדמים את היעד"}
                                <ArrowLeft aria-hidden="true" />
                            </button>
                        </article>
                    );
                })}
            </div>
        </section>
    );
};

export default RecommendedDonationChoices;
