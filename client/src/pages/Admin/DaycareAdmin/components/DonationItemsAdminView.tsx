import styles from "./DaycareDonationsAdmin.module.scss";
import type { useDaycareDonationsAdmin } from "./useDaycareDonationsAdmin";

type Props = { model: ReturnType<typeof useDaycareDonationsAdmin> };

const DonationItemsAdminView = ({ model }: Props) => {
    if (!model.campaign) return null;

    const {
        campaign, saving, activeView, inactiveRecommendedItems,
        effectiveRecommendationIds, handleItemUpdate, handleRecommendationsUpdate, resetRecommendations,
        formatCurrency, getRecommendationLabel, getInactiveRecommendationLabel,
    } = model;

    return (
        <>
            {activeView === "items" && (
            <section className={styles.panel}>
                <header>
                    <h2>סעיפים ויעדים</h2>
                    <p>
                        הסעיפים מקובצים לפי קטגוריות. פתחו רק את הקבוצה
                        שתרצו לערוך.
                    </p>
                </header>
                <form
                    className={styles.recommendationsEditor}
                    key={campaign.recommendedChoiceIds.join("|") || "automatic"}
                    onSubmit={(event) => void handleRecommendationsUpdate(event)}
                >
                    <div className={styles.recommendationsIntro}>
                        <strong>מה הכי יעזור עכשיו?</strong>
                        <span>
                            בחרו שלושה מסלולים. הסדר כאן הוא הסדר שיופיע באתר.
                        </span>
                    </div>
                    {(campaign.recommendedChoiceIds.length === 3
                        ? campaign.recommendedChoiceIds
                        : getAutomaticRecommendationIds(campaign.items)
                    ).map((choiceId, index) => (
                        <label key={`choice-${index + 1}`}>
                            מקום {index + 1}
                            <select
                                name={`choice${index + 1}`}
                                defaultValue={choiceId}
                            >
                                <option value="general">תרומה כללית למעון</option>
                                {campaign.items.map((item) => {
                                    const inactiveLabel =
                                        getInactiveRecommendationLabel(item);

                                    return (
                                        <option
                                            key={item.id}
                                            value={item.id}
                                            disabled={
                                                Boolean(inactiveLabel) &&
                                                item.id !== choiceId
                                            }
                                        >
                                            {item.title}
                                            {inactiveLabel
                                                ? ` — ${inactiveLabel}`
                                                : ""}
                                        </option>
                                    );
                                })}
                            </select>
                        </label>
                    ))}
                    <div className={styles.recommendationActions}>
                        <button type="submit" disabled={saving}>
                            {saving ? "שומר..." : "שמירת הבחירה"}
                        </button>
                        {campaign.recommendedChoiceIds.length === 3 && (
                            <button
                                type="button"
                                className={styles.recommendationsReset}
                                disabled={saving}
                                onClick={() => void resetRecommendations()}
                            >
                                חזרה לאוטומטי
                            </button>
                        )}
                    </div>
                    {inactiveRecommendedItems.length > 0 && (
                        <div
                            className={styles.recommendationsWarning}
                            role="status"
                        >
                            <strong>
                                {inactiveRecommendedItems
                                    .map((item) => item.title)
                                    .join(" · ")} {inactiveRecommendedItems.length === 1
                                    ? "לא מוצג כרגע באתר"
                                    : "לא מוצגים כרגע באתר"}
                            </strong>
                            <span>
                                הסעיף הושלם או נסגר ולכן הוחלף אוטומטית. באתר
                                מופיעים עכשיו: {effectiveRecommendationIds
                                    .map((choiceId) =>
                                        getRecommendationLabel(
                                            campaign.items,
                                            choiceId
                                        )
                                    )
                                    .join(" · ")}
                            </span>
                        </div>
                    )}
                </form>
                <div className={styles.categoryEditors}>
                    {campaign.categories.map((category, categoryIndex) => (
                        <details
                            className={styles.categoryEditor}
                            key={category.id}
                            open={categoryIndex === 0}
                        >
                            <summary>
                                <div>
                                    <strong>{category.title}</strong>
                                    <span>
                                        {
                                            campaign.items.filter(
                                                (item) =>
                                                    item.categoryId ===
                                                    category.id
                                            ).length
                                        }{" "}
                                        סעיפים
                                    </span>
                                </div>
                                <strong>
                                    יעד ₪{formatCurrency(category.goal)}
                                </strong>
                            </summary>
                            <div className={styles.itemList}>
                                {campaign.items
                                    .filter(
                                        (item) =>
                                            item.categoryId === category.id
                                    )
                                    .map((item) => (
                                        <form
                                            className={styles.itemRow}
                                            key={item.id}
                                            onSubmit={(event) =>
                                                handleItemUpdate(
                                                    event,
                                                    item.id
                                                )
                                            }
                                        >
                                            <div>
                                                <strong>{item.title}</strong>
                                                <span>
                                                    גויסו ₪
                                                    {formatCurrency(
                                                        item.raised
                                                    )}
                                                    {(item.overflow ?? 0) >
                                                        0 &&
                                                        ` · חריגה ₪${formatCurrency(
                                                            item.overflow ?? 0
                                                        )}`}
                                                </span>
                                            </div>
                                            <label>
                                                יעד
                                                <input
                                                    name="goal"
                                                    type="number"
                                                    min="0"
                                                    defaultValue={item.goal}
                                                />
                                            </label>
                                            <label>
                                                מצב
                                                <select
                                                    name="statusOverride"
                                                    defaultValue={
                                                        item.statusOverride ??
                                                        "auto"
                                                    }
                                                >
                                                    <option value="auto">
                                                        אוטומטי
                                                    </option>
                                                    <option value="open">
                                                        פתוח ידנית
                                                    </option>
                                                    <option value="closed">
                                                        סגור ידנית
                                                    </option>
                                                </select>
                                            </label>
                                            <label>
                                                סיבת השינוי
                                                <input
                                                    name="reason"
                                                    type="text"
                                                    required
                                                />
                                            </label>
                                            <button
                                                type="submit"
                                                disabled={saving}
                                            >
                                                שמירה
                                            </button>
                                        </form>
                                    ))}
                            </div>
                        </details>
                    ))}
                </div>
            </section>
            )}

        </>
    );
};

export default DonationItemsAdminView;
