import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { daycareLeadStatuses } from "../daycareAdminConfig";
import {
    getDaycareRegistrations,
    updateDaycarePublicRegistrationStatus,
} from "../daycareAdminService";
import styles from "../DaycareAdmin.module.scss";
import type { DaycareRegistrationsResponse } from "../types";
import type {
    DaycareInterestStatus,
    DaycareRegistrationAdmin,
} from "../../../../types/daycareRegistration";

type DaycareRegistrationsProps = {
    onChanged: () => void;
};

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

const DaycareRegistrations = ({ onChanged }: DaycareRegistrationsProps) => {
    const [data, setData] = useState<DaycareRegistrationsResponse>({
        leads: [],
        publicRegistrations: [],
    });
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const loadRegistrations = async () => {
        const registrations = await getDaycareRegistrations();
        setData(registrations);
        setLoading(false);
    };

    useEffect(() => {
        loadRegistrations().catch((error) => {
            console.error("Failed to load daycare registrations:", error);
            setLoading(false);
        });
    }, []);

    const handleStatusChange = async (
        registrationId: string,
        status: DaycareInterestStatus
    ) => {
        setUpdatingId(registrationId);

        try {
            const updatedRegistration =
                await updateDaycarePublicRegistrationStatus(
                    registrationId,
                    status
                );

            setData((currentData) => ({
                ...currentData,
                publicRegistrations: currentData.publicRegistrations.map(
                    (registration) =>
                        registration._id === registrationId
                            ? updatedRegistration
                            : registration
                ),
            }));
            onChanged();
        } catch (error) {
            console.error("Failed to update daycare registration status:", error);
        } finally {
            setUpdatingId(null);
        }
    };

    return (
        <section className={styles.section} aria-labelledby="daycare-leads">
            <div className={styles.sectionHeader}>
                <div>
                    <h2 className={styles.sectionTitle} id="daycare-leads">
                        פניות מהטופס הציבורי
                    </h2>
                    <p className={styles.sectionDescription}>
                        כל מי שממלא את הקישור של המעון מופיע כאן לקריאה ולחזרה.
                    </p>
                </div>

                <Link
                    className={styles.secondaryLink}
                    to="/admin/dashboard?tab=daycareRegistrations"
                >
                    לדשבורד מעון צפון יפו
                </Link>
            </div>

            <div className={styles.notice}>
                נמצאו {data.publicRegistrations.length} פניות מהקישור ששלחת.
                כרגע כל הפניות הן מתעניינים, ולא נרשמים בפועל.
            </div>

            {loading ? (
                <div className={styles.loading}>טוען פניות...</div>
            ) : data.publicRegistrations.length === 0 ? (
                <div className={styles.emptyState}>
                    עדיין אין פניות מהטופס הציבורי.
                </div>
            ) : (
                <div className={styles.tableWrapper}>
                    <table className={styles.tableCompact}>
                        <thead>
                            <tr>
                                <th className={styles.tableHeader}>שם הורה</th>
                                <th className={styles.tableHeader}>טלפון</th>
                                <th className={styles.tableHeader}>גיל הילד/ה</th>
                                <th className={styles.tableHeader}>שעות מועדפות</th>
                                <th className={styles.tableHeader}>סטטוס</th>
                                <th className={styles.tableHeader}>הערות</th>
                                <th className={styles.tableHeader}>תאריך פנייה</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.publicRegistrations.map((registration) => (
                                <tr
                                    className={styles.tableRow}
                                    key={registration._id}
                                >
                                    <td className={styles.tableCell}>
                                        {registration.parentName}
                                    </td>
                                    <td className={styles.tableCell}>
                                        {registration.phone}
                                    </td>
                                    <td className={styles.tableCell}>
                                        {registration.childAge ||
                                            registration.childName ||
                                            formatDate(registration.birthDate)}
                                    </td>
                                    <td className={styles.tableCell}>
                                        {formatRequiredHours(registration)}
                                    </td>
                                    <td className={styles.tableCell}>
                                        <select
                                            className={styles.statusSelect}
                                            value={registration.status || "מתעניין"}
                                            disabled={updatingId === registration._id}
                                            onChange={(event) =>
                                                handleStatusChange(
                                                    registration._id,
                                                    event.target
                                                        .value as DaycareInterestStatus
                                                )
                                            }
                                        >
                                            {daycareLeadStatuses.map((status) => (
                                                <option key={status} value={status}>
                                                    {status}
                                                </option>
                                            ))}
                                        </select>
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

export default DaycareRegistrations;
