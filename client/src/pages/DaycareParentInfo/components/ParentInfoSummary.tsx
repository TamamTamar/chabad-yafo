import { summaryItems } from "../parentInfoConfig";
import styles from "../DaycareParentInfo.module.scss";

const ParentInfoSummary = () => (
    <section className={styles.summarySection} aria-labelledby="summary-title">
        <div className={styles.summaryHeader}>
            <p className={styles.summaryEyebrow}>במבט אחד</p>
            <h2 className={styles.summaryTitle} id="summary-title">
                הפרטים המרכזיים
            </h2>
        </div>
        <div className={styles.summaryGrid}>
            {summaryItems.map((item) => (
                <article className={styles.summaryItem} key={item.label}>
                    <span className={styles.summaryIcon} aria-hidden="true">
                        <item.icon size={21} strokeWidth={1.9} />
                    </span>
                    <div className={styles.summaryCopy}>
                        <h3 className={styles.summaryItemTitle}>{item.label}</h3>
                        <p className={styles.summaryValue}>{item.value}</p>
                        {item.isPlaceholder && (
                            <span className={styles.pendingLabel}>בעדכון</span>
                        )}
                    </div>
                </article>
            ))}
        </div>
    </section>
);

export default ParentInfoSummary;
