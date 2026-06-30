import styles from "../DaycareAdmin.module.scss";
import type { DaycareOverview } from "../types";

type DaycareExpansionProps = {
    overview: DaycareOverview | null;
};

const DaycareExpansion = ({ overview }: DaycareExpansionProps) => {
    const expansion = overview?.expansion;

    if (!expansion) {
        return null;
    }

    return (
        <section className={styles.section} aria-labelledby="daycare-expansion">
            <div className={styles.sectionHeader}>
                <div>
                    <h2 className={styles.sectionTitle} id="daycare-expansion">
                        התרחבות מעל 6 ילדים
                    </h2>
                    <p className={styles.sectionDescription}>
                        מעקב אחר רישוי, כוח אדם, ביטוחים, מסמכים, חוזי הורים
                        ותשלומים לקראת הרחבת המעון.
                    </p>
                </div>

                <span
                    className={`${styles.statusBadge} ${
                        expansion.alertActive
                            ? styles.statusAttention
                            : styles.statusProgress
                    }`}
                >
                    {expansion.status}
                </span>
            </div>

            {expansion.alertActive && (
                <div className={styles.alertBox}>
                    מספר הילדים במעקב הגיע ל־{expansion.trackedChildren}. יש
                    להשלים בדיקת מוכנות להתרחבות לפני מעבר תפעולי מעל 6 ילדים.
                </div>
            )}

            <div className={styles.expansionGrid}>
                <article className={styles.metricCard}>
                    <span className={styles.metricLabel}>סף התראה</span>
                    <strong className={styles.metricValue}>
                        {expansion.thresholdChildren}+ ילדים
                    </strong>
                </article>
                <article className={styles.metricCard}>
                    <span className={styles.metricLabel}>ילדים במעקב</span>
                    <strong className={styles.metricValue}>
                        {expansion.trackedChildren}
                    </strong>
                </article>
                <article className={styles.metricCard}>
                    <span className={styles.metricLabel}>מוכנות</span>
                    <strong className={styles.metricValue}>
                        {expansion.readyItems}/{expansion.totalItems}
                    </strong>
                </article>
            </div>

            <div className={styles.readinessGrid}>
                {expansion.items.map((item) => (
                    <div className={styles.readinessItem} key={item.key}>
                        <span className={styles.readinessLabel}>
                            {item.label}
                        </span>
                        <span
                            className={`${styles.statusBadge} ${
                                item.ready
                                    ? styles.statusReady
                                    : styles.statusAttention
                            }`}
                        >
                            {item.ready ? "מוכן" : "לטיפול"}
                        </span>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default DaycareExpansion;
