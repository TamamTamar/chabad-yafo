import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    daycareInterestLevels,
    daycareLeadStatuses,
    daycarePriceFits,
} from "../daycareAdminConfig";
import {
    getDaycareRegistrations,
    updateDaycarePublicRegistration,
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

type CallSummaryDraft = Pick<
    DaycareRegistrationAdmin,
    | "interestLevel"
    | "priceFits"
    | "desiredHours"
    | "parentPriority"
    | "callNotes"
>;

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

const getCallSummaryDraft = (
    registration: DaycareRegistrationAdmin
): CallSummaryDraft => ({
    interestLevel: registration.interestLevel,
    priceFits: registration.priceFits,
    desiredHours: registration.desiredHours || "",
    parentPriority: registration.parentPriority || "",
    callNotes: registration.callNotes || "",
});

const DaycareRegistrations = ({ onChanged }: DaycareRegistrationsProps) => {
    const [data, setData] = useState<DaycareRegistrationsResponse>({
        leads: [],
        publicRegistrations: [],
    });
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [savingSummaryId, setSavingSummaryId] = useState<string | null>(null);
    const [summaryDrafts, setSummaryDrafts] = useState<
        Record<string, CallSummaryDraft>
    >({});
    const [savedSummaryId, setSavedSummaryId] = useState<string | null>(null);

    const loadRegistrations = async () => {
        const registrations = await getDaycareRegistrations();
        setData(registrations);
        setSummaryDrafts(
            Object.fromEntries(
                registrations.publicRegistrations.map((registration) => [
                    registration._id,
                    getCallSummaryDraft(registration),
                ])
            )
        );
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

    const updateSummaryDraft = (
        registrationId: string,
        field: keyof CallSummaryDraft,
        value: string
    ) => {
        setSavedSummaryId(null);
        setSummaryDrafts((currentDrafts) => ({
            ...currentDrafts,
            [registrationId]: {
                ...currentDrafts[registrationId],
                [field]: value || undefined,
            },
        }));
    };

    const handleSummarySave = async (registrationId: string) => {
        setSavingSummaryId(registrationId);
        setSavedSummaryId(null);

        try {
            const updatedRegistration = await updateDaycarePublicRegistration(
                registrationId,
                summaryDrafts[registrationId]
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
            setSummaryDrafts((currentDrafts) => ({
                ...currentDrafts,
                [registrationId]: getCallSummaryDraft(updatedRegistration),
            }));
            setSavedSummaryId(registrationId);
            onChanged();
        } catch (error) {
            console.error("Failed to update daycare call summary:", error);
        } finally {
            setSavingSummaryId(null);
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
                                    <td
                                        className={styles.tableCell}
                                        data-label="שם הורה"
                                    >
                                        {registration.parentName}
                                    </td>
                                    <td
                                        className={styles.tableCell}
                                        data-label="טלפון"
                                    >
                                        {registration.phone}
                                    </td>
                                    <td
                                        className={styles.tableCell}
                                        data-label="גיל הילד/ה"
                                    >
                                        {registration.childAge ||
                                            registration.childName ||
                                            formatDate(registration.birthDate)}
                                    </td>
                                    <td
                                        className={styles.tableCell}
                                        data-label="שעות מועדפות"
                                    >
                                        {formatRequiredHours(registration)}
                                    </td>
                                    <td
                                        className={styles.tableCell}
                                        data-label="סטטוס"
                                    >
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
                                    <td
                                        className={styles.tableCell}
                                        data-label="סיכום שיחה"
                                    >
                                        <div className={styles.callSummaryGrid}>
                                            <label className={styles.compactField}>
                                                <span>רמת עניין</span>
                                                <select
                                                    className={styles.compactInput}
                                                    value={
                                                        summaryDrafts[
                                                            registration._id
                                                        ]?.interestLevel || ""
                                                    }
                                                    onChange={(event) =>
                                                        updateSummaryDraft(
                                                            registration._id,
                                                            "interestLevel",
                                                            event.target.value
                                                        )
                                                    }
                                                >
                                                    <option value="">לא סומן</option>
                                                    {daycareInterestLevels.map(
                                                        (level) => (
                                                            <option
                                                                key={level}
                                                                value={level}
                                                            >
                                                                {level}
                                                            </option>
                                                        )
                                                    )}
                                                </select>
                                            </label>

                                            <label className={styles.compactField}>
                                                <span>המחיר מתאים?</span>
                                                <select
                                                    className={styles.compactInput}
                                                    value={
                                                        summaryDrafts[
                                                            registration._id
                                                        ]?.priceFits || ""
                                                    }
                                                    onChange={(event) =>
                                                        updateSummaryDraft(
                                                            registration._id,
                                                            "priceFits",
                                                            event.target.value
                                                        )
                                                    }
                                                >
                                                    <option value="">לא סומן</option>
                                                    {daycarePriceFits.map((fit) => (
                                                        <option
                                                            key={fit}
                                                            value={fit}
                                                        >
                                                            {fit}
                                                        </option>
                                                    ))}
                                                </select>
                                            </label>

                                            <label className={styles.compactField}>
                                                <span>שעות רצויות</span>
                                                <input
                                                    className={styles.compactInput}
                                                    value={
                                                        summaryDrafts[
                                                            registration._id
                                                        ]?.desiredHours || ""
                                                    }
                                                    onChange={(event) =>
                                                        updateSummaryDraft(
                                                            registration._id,
                                                            "desiredHours",
                                                            event.target.value
                                                        )
                                                    }
                                                    placeholder="לדוגמה: עד 16:00"
                                                />
                                            </label>

                                            <label className={styles.compactField}>
                                                <span>מה הכי חשוב להם</span>
                                                <input
                                                    className={styles.compactInput}
                                                    value={
                                                        summaryDrafts[
                                                            registration._id
                                                        ]?.parentPriority || ""
                                                    }
                                                    onChange={(event) =>
                                                        updateSummaryDraft(
                                                            registration._id,
                                                            "parentPriority",
                                                            event.target.value
                                                        )
                                                    }
                                                    placeholder="יחס אישי, מחיר, שעות..."
                                                />
                                            </label>
                                        </div>

                                        <label className={styles.compactField}>
                                            <span>הערות אחרי שיחה</span>
                                            <textarea
                                                className={styles.compactTextarea}
                                                value={
                                                    summaryDrafts[
                                                        registration._id
                                                    ]?.callNotes || ""
                                                }
                                                onChange={(event) =>
                                                    updateSummaryDraft(
                                                        registration._id,
                                                        "callNotes",
                                                        event.target.value
                                                    )
                                                }
                                                placeholder={
                                                    registration.notes ||
                                                    "מה אמרו בשיחה, מתי לחזור, התלבטויות..."
                                                }
                                            />
                                        </label>

                                        <div className={styles.inlineSaveRow}>
                                            <button
                                                className={styles.secondaryButton}
                                                type="button"
                                                disabled={
                                                    savingSummaryId ===
                                                    registration._id
                                                }
                                                onClick={() =>
                                                    handleSummarySave(
                                                        registration._id
                                                    )
                                                }
                                            >
                                                {savingSummaryId ===
                                                registration._id
                                                    ? "שומר..."
                                                    : "שמירת סיכום שיחה"}
                                            </button>

                                            {savedSummaryId ===
                                                registration._id && (
                                                <span
                                                    className={
                                                        styles.inlineSuccess
                                                    }
                                                >
                                                    נשמר
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td
                                        className={styles.tableCell}
                                        data-label="תאריך פנייה"
                                    >
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
