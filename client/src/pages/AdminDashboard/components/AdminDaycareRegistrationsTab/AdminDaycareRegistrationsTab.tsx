import { useEffect, useState } from "react";
import { getAllDaycareRegistrations } from "../../../../services/adminService";
import type { DaycareRegistrationAdmin } from "../../../../types/daycareRegistration";
import styles from "./AdminDaycareRegistrationsTab.module.scss";

const formatDate = (date?: string) => {
    if (!date) {
        return "-";
    }

    return new Date(date).toLocaleDateString("he-IL");
};

const formatRequiredHours = (registration: DaycareRegistrationAdmin) => {
    if (registration.requiredHours !== "אחר" || !registration.requiredHoursOther) {
        return registration.requiredHours;
    }

    return `${registration.requiredHours} - ${registration.requiredHoursOther}`;
};

const AdminDaycareRegistrationsTab = () => {
    const [registrations, setRegistrations] = useState<
        DaycareRegistrationAdmin[]
    >([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRegistrations = async () => {
            try {
                const data = await getAllDaycareRegistrations();

                setRegistrations(data);
            } catch (error) {
                console.error("Failed to fetch daycare registrations:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRegistrations();
    }, []);

    if (loading) {
        return <div className={styles.loading}>טוען...</div>;
    }

    return (
        <section className={styles.card}>
            {registrations.length === 0 ? (
                <div className={styles.empty}>
                    עדיין אין רישומים מוקדמים למעון
                </div>
            ) : (
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th className={styles.tableHeader}>שם הורה</th>
                                <th className={styles.tableHeader}>טלפון</th>
                                <th className={styles.tableHeader}>דוא"ל</th>
                                <th className={styles.tableHeader}>שם הילד/ה</th>
                                <th className={styles.tableHeader}>תאריך לידה</th>
                                <th className={styles.tableHeader}>שעות</th>
                                <th className={styles.tableHeader}>ימי שישי</th>
                                <th className={styles.tableHeader}>אישור 5,500 ₪</th>
                                <th className={styles.tableHeader}>הערות</th>
                                <th className={styles.tableHeader}>תאריך פנייה</th>
                            </tr>
                        </thead>

                        <tbody>
                            {registrations.map((registration) => (
                                <tr
                                    className={styles.tableRow}
                                    key={registration._id}
                                >
                                    <td className={styles.tableCell}>
                                        {registration.parentName}
                                    </td>
                                    <td
                                        className={`${styles.tableCell} ${styles.phone}`}
                                    >
                                        {registration.phone}
                                    </td>
                                    <td
                                        className={`${styles.tableCell} ${styles.email}`}
                                    >
                                        {registration.email || "-"}
                                    </td>
                                    <td className={styles.tableCell}>
                                        {registration.childName}
                                    </td>
                                    <td className={styles.tableCell}>
                                        {formatDate(registration.birthDate)}
                                    </td>
                                    <td className={styles.tableCell}>
                                        {formatRequiredHours(registration)}
                                    </td>
                                    <td className={styles.tableCell}>
                                        {registration.fridayCare}
                                    </td>
                                    <td className={styles.tableCell}>
                                        <span className={styles.tag}>
                                            {registration.costApproval
                                                ? "כן"
                                                : "לא"}
                                        </span>
                                    </td>
                                    <td className={styles.tableCell}>
                                        {registration.notes || "-"}
                                    </td>
                                    <td className={styles.tableCell}>
                                        {formatDate(registration.createdAt)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
};

export default AdminDaycareRegistrationsTab;
