import styles from "../DaycareAdmin.module.scss";
import type { DaycareOverview } from "../types";

type DaycareDashboardProps = {
    overview: DaycareOverview | null;
};

const getStatusClassName = (status: DaycareOverview["generalStatus"]) => {
    if (status === "מוכן לפתיחה") {
        return styles.statusReady;
    }

    if (status === "דורש טיפול") {
        return styles.statusAttention;
    }

    return styles.statusProgress;
};

const DaycareDashboard = ({ overview }: DaycareDashboardProps) => {
    const cards = [
        {
            label: "יעד פתיחה",
            value: overview ? `${overview.openingTargetChildren} ילדים` : "-",
        },
        {
            label: "נרשמים בפועל",
            value: overview?.actualRegistrations ?? "-",
        },
        {
            label: "מתעניינים",
            value: overview?.interestedCount ?? "-",
        },
        {
            label: "משימות פתוחות",
            value: overview?.openTasks ?? "-",
        },
        {
            label: "משימות שהושלמו",
            value: overview?.completedTasks ?? "-",
        },
        {
            label: "תאריך יעד לפתיחה",
            value: overview?.targetOpeningDate ?? "ספטמבר הקרוב",
        },
    ];

    return (
        <section className={styles.section} aria-labelledby="daycare-dashboard">
            <div className={styles.sectionHeader}>
                <div>
                    <h2 className={styles.sectionTitle} id="daycare-dashboard">
                        דשבורד פתיחה
                    </h2>
                    <p className={styles.sectionDescription}>
                        תמונת מצב מהירה לקראת פתיחת המעון.
                    </p>
                </div>

                {overview && (
                    <span
                        className={`${styles.statusBadge} ${getStatusClassName(
                            overview.generalStatus
                        )}`}
                    >
                        {overview.generalStatus}
                    </span>
                )}
            </div>

            <div className={styles.metricsGrid}>
                {cards.map((card) => (
                    <article className={styles.metricCard} key={card.label}>
                        <span className={styles.metricLabel}>{card.label}</span>
                        <strong className={styles.metricValue}>{card.value}</strong>
                    </article>
                ))}
            </div>
        </section>
    );
};

export default DaycareDashboard;
