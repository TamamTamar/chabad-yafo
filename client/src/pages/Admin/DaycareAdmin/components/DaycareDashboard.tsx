import { UsersRound, Clock3, CircleCheck, CalendarDays } from "lucide-react";
import referenceStyles from "./DaycareDashboard.module.scss";
import styles from "../DaycareAdmin.module.scss";
import type { DaycareOverview } from "../types";

type DaycareDashboardProps = {
    overview: DaycareOverview | null;
    compact?: boolean;
    secondary?: boolean;
    reference?: boolean;
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

const DaycareDashboard = ({ overview, compact, secondary, reference }: DaycareDashboardProps) => {
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

    if (reference) {
        const unavailable = "המידע אינו זמין";
        if (compact) return <div className={referenceStyles.summary} aria-label="סיכום פתיחת המעון">
            <span>יעד פתיחה: <strong>{overview?.openingTargetChildren == null ? unavailable : `${overview.openingTargetChildren} ילדים`}</strong></span>
            <span>נרשמים: <strong>{overview?.actualRegistrations ?? unavailable}</strong></span>
            {overview && <span className={referenceStyles.status}>{overview.generalStatus}</span>}
        </div>;
        const metrics = [
            { label: "מתעניינים", value: overview?.interestedCount, icon: UsersRound, tone: "info" },
            { label: "משימות פתוחות", value: overview?.openTasks, icon: Clock3, tone: "warning" },
            { label: "משימות שהושלמו", value: overview?.completedTasks, icon: CircleCheck, tone: "success" },
            { label: "תאריך יעד לפתיחה", value: overview?.targetOpeningDate || undefined, icon: CalendarDays, tone: "warning" },
        ];
        return <section className={referenceStyles.dashboard} aria-labelledby="daycare-dashboard">
            <h2 id="daycare-dashboard">תמונת מצב לקראת פתיחה</h2>
            <dl className={referenceStyles.metrics}>{metrics.map(metric => <div key={metric.label} data-tone={metric.tone}><dt><span className={referenceStyles.metricIcon} aria-hidden="true"><metric.icon size={22} strokeWidth={1.6} /></span>{metric.label}</dt><dd className={metric.value == null ? referenceStyles.unavailable : undefined}>{metric.value ?? unavailable}</dd></div>)}</dl>
        </section>;
    }

    if (compact) return <div className={styles.openingSummary} aria-label="סיכום פתיחת המעון">
        <span>יעד פתיחה: {overview ? `${overview.openingTargetChildren} ילדים` : "-"}</span>
        <span>נרשמים: {overview?.actualRegistrations ?? "-"}</span>
        {overview && <span className={`${styles.statusBadge} ${getStatusClassName(overview.generalStatus)}`}>{overview.generalStatus}</span>}
    </div>;

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
                {(secondary ? cards.slice(2) : cards).map((card) => (
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
