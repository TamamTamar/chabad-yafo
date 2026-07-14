import axios from "axios";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { daycareLeadStatuses } from "../daycareAdminConfig";
import {
    getDaycareRegistrations,
    updateDaycareLead,
    updateDaycarePublicRegistration,
} from "../daycareAdminService";
import {
    createOnboardingFromLead,
    createOnboardingFromRegistration,
} from "../../../../services/daycareOnboardingService";
import {
    onboardingOverallStatusLabels,
    type AdminDaycareOnboardingListItem,
    type CreateOnboardingFromInquiryPayload,
} from "../../../../types/daycareOnboarding";
import type { DaycareInterestStatus } from "../../../../types/daycareRegistration";
import styles from "../DaycareAdmin.module.scss";
import type { DaycareLead, DaycareRegistrationsResponse } from "../types";

type DaycareRegistrationsProps = {
    onChanged: () => void;
};

type RegistrationSourceType = "daycareRegistration" | "daycareLead";

type UnifiedRegistration = {
    key: string;
    sourceType: RegistrationSourceType;
    sourceId: string;
    sourceLabel: string;
    parentName: string;
    phone: string;
    email?: string;
    childName?: string;
    childAge?: string;
    birthDate?: string;
    requiredHours?: string;
    status: DaycareInterestStatus;
    callNotes?: string;
    createdAt?: string;
    onboardingSummary?: AdminDaycareOnboardingListItem | null;
};

type OnboardingDraft = CreateOnboardingFromInquiryPayload & {
    sourceType: RegistrationSourceType;
    sourceId: string;
    sourceLabel: string;
    parentName: string;
    phone: string;
    childAge?: string;
};

const eligibleStatuses: DaycareInterestStatus[] = ["רוצה להירשם"];

const nextStatusByStatus: Partial<Record<DaycareInterestStatus, DaycareInterestStatus>> = {
    מתעניין: "שיחה בוצעה",
    "שיחה בוצעה": "הגיע לראות",
    "הגיע לראות": "רוצה להירשם",
};

const registrationWorkflow = [
    { title: "פנייה חדשה", text: "חוזרים למשפחה ומתאמים שיחת היכרות." },
    { title: "שיחה וביקור", text: "מתעדים הערה ומעדכנים את הסטטוס אחרי כל פעולה." },
    { title: "החלטה להתקדם", text: "מעבירים ל„רוצה להירשם” ופותחים תיק אישי." },
    { title: "תיק הצטרפות", text: "עוקבים אחר הטופס, ההסכם, המקדמה והאישור." },
];

const getSuggestedSchoolYear = () => {
    const now = new Date();
    const year = now.getFullYear();
    const startYear = now.getMonth() >= 6 ? year : year - 1;
    return `${startYear}-${startYear + 1}`;
};

const formatDate = (date?: string) =>
    date ? new Date(date).toLocaleDateString("he-IL") : "—";

const getCreateErrorMessage = (error: unknown) => {
    if (!axios.isAxiosError<{ code?: string; message?: string }>(error)) {
        return "לא הצלחנו לפתוח את תיק ההצטרפות. נסו שוב.";
    }

    if (error.response?.data.code === "REGISTRATION_NOT_READY_FOR_ONBOARDING") {
        return "ניתן לפתוח תיק רק לפנייה בסטטוס „רוצה להירשם”.";
    }

    if (error.response?.status === 404) {
        return "הפנייה לא נמצאה או שהשרת טרם נטען מחדש.";
    }

    return (
        error.response?.data.message ??
        "לא הצלחנו לפתוח את תיק ההצטרפות. נסו שוב."
    );
};

const toUnifiedRegistrations = (
    data: DaycareRegistrationsResponse
): UnifiedRegistration[] => {
    const publicRows: UnifiedRegistration[] = data.publicRegistrations.map(
        (registration) => ({
            key: `daycareRegistration:${registration._id}`,
            sourceType: "daycareRegistration",
            sourceId: registration._id,
            sourceLabel: "טופס ציבורי",
            parentName: registration.parentName,
            phone: registration.phone,
            email: registration.email,
            childName: registration.childName,
            childAge: registration.childAge,
            birthDate: registration.birthDate,
            requiredHours:
                registration.requiredHours === "אחר" &&
                registration.requiredHoursOther
                    ? `אחר — ${registration.requiredHoursOther}`
                    : registration.requiredHours,
            status: registration.status ?? "מתעניין",
            callNotes: registration.callNotes,
            createdAt: registration.createdAt,
            onboardingSummary: registration.onboardingSummary,
        })
    );
    const leadRows: UnifiedRegistration[] = data.leads.map((lead) => ({
        key: `daycareLead:${lead._id}`,
        sourceType: "daycareLead",
        sourceId: lead._id,
        sourceLabel: "פנייה ידנית",
        parentName: lead.parentName,
        phone: lead.phone,
        childName: lead.childName,
        childAge: lead.childAge,
        status: lead.status,
        callNotes: lead.callNotes,
        createdAt: lead.inquiryDate ?? lead.createdAt,
        onboardingSummary: lead.onboardingSummary,
    }));
    const uniqueRows = new Map<string, UnifiedRegistration>();

    for (const row of [...publicRows, ...leadRows]) {
        const deduplicationKey = row.onboardingSummary
            ? `onboarding:${row.onboardingSummary.id}`
            : row.key;

        if (!uniqueRows.has(deduplicationKey)) {
            uniqueRows.set(deduplicationKey, row);
        }
    }

    return [...uniqueRows.values()].sort(
        (left, right) =>
            new Date(right.createdAt ?? 0).getTime() -
            new Date(left.createdAt ?? 0).getTime()
    );
};

const createDraft = (registration: UnifiedRegistration): OnboardingDraft => ({
    sourceType: registration.sourceType,
    sourceId: registration.sourceId,
    sourceLabel: registration.sourceLabel,
    parentName: registration.parentName,
    phone: registration.phone,
    childAge: registration.childAge,
    schoolYear: getSuggestedSchoolYear(),
});

const DaycareRegistrations = ({ onChanged }: DaycareRegistrationsProps) => {
    const navigate = useNavigate();
    const [data, setData] = useState<DaycareRegistrationsResponse>({
        leads: [],
        publicRegistrations: [],
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [updatingKey, setUpdatingKey] = useState<string | null>(null);
    const [savingNoteKey, setSavingNoteKey] = useState<string | null>(null);
    const [expandedNoteKeys, setExpandedNoteKeys] = useState<string[]>([]);
    const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
    const [draft, setDraft] = useState<OnboardingDraft | null>(null);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState("");

    const rows = useMemo(() => toUnifiedRegistrations(data), [data]);
    useEffect(() => {
        void getDaycareRegistrations()
            .then((registrations) => {
                setData(registrations);
                setNoteDrafts(
                    Object.fromEntries(
                        toUnifiedRegistrations(registrations).map((row) => [
                            row.key,
                            row.callNotes ?? "",
                        ])
                    )
                );
                setError("");
            })
            .catch(() => {
                setError("לא הצלחנו לטעון את רשימת הרישום");
            })
            .finally(() => setLoading(false));
    }, []);

    const updateRow = (
        sourceType: RegistrationSourceType,
        sourceId: string,
        updates: Partial<UnifiedRegistration>
    ) => {
        setData((current) => ({
            leads: current.leads.map((lead) =>
                sourceType === "daycareLead" && lead._id === sourceId
                    ? ({ ...lead, ...updates } as DaycareLead)
                    : lead
            ),
            publicRegistrations: current.publicRegistrations.map(
                (registration) =>
                    sourceType === "daycareRegistration" &&
                    registration._id === sourceId
                        ? { ...registration, ...updates }
                        : registration
            ),
        }));
    };

    const handleStatusChange = async (
        row: UnifiedRegistration,
        status: DaycareInterestStatus
    ) => {
        setUpdatingKey(row.key);

        try {
            if (row.sourceType === "daycareRegistration") {
                await updateDaycarePublicRegistration(row.sourceId, { status });
            } else {
                await updateDaycareLead(row.sourceId, { status });
            }

            updateRow(row.sourceType, row.sourceId, { status });
            await onChanged();
        } catch {
            setError("לא הצלחנו לעדכן את סטטוס הפנייה");
        } finally {
            setUpdatingKey(null);
        }
    };

    const openCreateDialog = (registration: UnifiedRegistration) => {
        setCreateError("");
        setDraft(createDraft(registration));
    };

    const handleNoteSave = async (row: UnifiedRegistration) => {
        setSavingNoteKey(row.key);
        setError("");

        try {
            const callNotes = noteDrafts[row.key]?.trim() || undefined;

            if (row.sourceType === "daycareRegistration") {
                await updateDaycarePublicRegistration(row.sourceId, { callNotes });
            } else {
                await updateDaycareLead(row.sourceId, { callNotes });
            }

            updateRow(row.sourceType, row.sourceId, { callNotes });
            setExpandedNoteKeys((keys) => keys.filter((key) => key !== row.key));
            await onChanged();
        } catch {
            setError("לא הצלחנו לשמור את הערת השיחה");
        } finally {
            setSavingNoteKey(null);
        }
    };

    const updateDraft = <K extends keyof OnboardingDraft>(
        field: K,
        value: OnboardingDraft[K]
    ) => {
        setCreateError("");
        setDraft((current) => (current ? { ...current, [field]: value } : current));
    };

    const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!draft) {
            return;
        }

        setCreating(true);
        setCreateError("");

        const { sourceType, sourceId } = draft;
        const payload: CreateOnboardingFromInquiryPayload = {
            schoolYear: draft.schoolYear,
            internalNote: draft.internalNote,
        };

        try {
            const result =
                sourceType === "daycareRegistration" && sourceId
                    ? await createOnboardingFromRegistration(sourceId, payload)
                    : await createOnboardingFromLead(sourceId, payload);

            navigate(`/admin/daycare-onboarding/${result.data.id}`, {
                state: { parentAccessUrl: result.parentAccessUrl },
            });
        } catch (error: unknown) {
            setCreateError(getCreateErrorMessage(error));
        } finally {
            setCreating(false);
        }
    };

    return (
        <section className={styles.section} aria-labelledby="daycare-leads">
            <div className={styles.sectionHeader}>
                <div>
                    <h2 className={styles.sectionTitle} id="daycare-leads">
                        רישום ופניות למעון
                    </h2>
                    <p className={styles.sectionDescription}>
                        פניות מהטופס הציבורי ופניות ידניות מוצגות כאן בזרימה אחת.
                    </p>
                </div>
            </div>

            <div className={styles.notice}>
                אין צורך למלא הכול מראש: בכל פנייה מעדכנים סטטוס, שומרים הערת
                שיחה, ומתקדמים לפעולה הבאה.
            </div>

            <ol className={styles.registrationWorkflow} aria-label="שלבי הטיפול בפנייה">
                {registrationWorkflow.map((step, index) => (
                    <li className={styles.registrationWorkflowStep} key={step.title}>
                        <span className={styles.registrationWorkflowNumber}>{index + 1}</span>
                        <div>
                            <strong>{step.title}</strong>
                            <p>{step.text}</p>
                        </div>
                    </li>
                ))}
            </ol>

            {error ? (
                <p className={styles.formErrorMessage} role="alert">
                    {error}
                </p>
            ) : null}

            {loading ? (
                <div className={styles.loading} aria-live="polite">
                    טוען פניות...
                </div>
            ) : rows.length === 0 ? (
                <div className={styles.emptyState}>עדיין אין פניות ברישום.</div>
            ) : (
                <div className={styles.tableWrapper}>
                    <table className={styles.tableCompact}>
                        <thead>
                            <tr>
                                <th className={styles.tableHeader}>מקור</th>
                                <th className={styles.tableHeader}>שם הורה</th>
                                <th className={styles.tableHeader}>טלפון</th>
                                <th className={styles.tableHeader}>ילד/ה</th>
                                <th className={styles.tableHeader}>סטטוס רישום</th>
                                <th className={styles.tableHeader}>הערת שיחה</th>
                                <th className={styles.tableHeader}>תיק הצטרפות</th>
                                <th className={styles.tableHeader}>תאריך פנייה</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => {
                                const summary = row.onboardingSummary;
                                const canCreate = eligibleStatuses.includes(row.status);
                                const nextStatus = nextStatusByStatus[row.status];

                                return (
                                    <tr className={styles.tableRow} key={row.key}>
                                        <td className={styles.tableCell} data-label="מקור">
                                            {row.sourceLabel}
                                        </td>
                                        <td className={styles.tableCell} data-label="שם הורה">
                                            {row.parentName}
                                        </td>
                                        <td className={styles.tableCell} data-label="טלפון">
                                            {row.phone}
                                        </td>
                                        <td className={styles.tableCell} data-label="ילד/ה">
                                            {row.childName || row.childAge || "טרם הושלם"}
                                        </td>
                                        <td className={styles.tableCell} data-label="סטטוס רישום">
                                            <select
                                                aria-label={`סטטוס רישום עבור ${row.parentName}`}
                                                className={styles.statusSelect}
                                                value={row.status}
                                                disabled={updatingKey === row.key}
                                                onChange={(event) =>
                                                    void handleStatusChange(
                                                        row,
                                                        event.target.value as DaycareInterestStatus
                                                    )
                                                }
                                            >
                                                {daycareLeadStatuses.map((status) => (
                                                    <option key={status} value={status}>
                                                        {status}
                                                    </option>
                                                ))}
                                            </select>
                                            {nextStatus ? (
                                                <button
                                                    className={styles.nextStatusButton}
                                                    type="button"
                                                    disabled={updatingKey === row.key}
                                                    onClick={() =>
                                                        void handleStatusChange(row, nextStatus)
                                                    }
                                                >
                                                    הפעולה הבאה: {nextStatus}
                                                </button>
                                            ) : null}
                                        </td>
                                        <td className={styles.tableCell} data-label="הערת שיחה">
                                            <button
                                                className={styles.callSummaryToggle}
                                                type="button"
                                                onClick={() =>
                                                    setExpandedNoteKeys((keys) =>
                                                        keys.includes(row.key)
                                                            ? keys.filter((key) => key !== row.key)
                                                            : [...keys, row.key]
                                                    )
                                                }
                                            >
                                                {expandedNoteKeys.includes(row.key)
                                                    ? "סגירה"
                                                    : "עריכה"}
                                            </button>
                                            {!expandedNoteKeys.includes(row.key) && row.callNotes ? (
                                                <p className={styles.callSummaryPreview}>
                                                    {row.callNotes}
                                                </p>
                                            ) : null}
                                            {expandedNoteKeys.includes(row.key) ? (
                                                <div className={styles.callSummaryPanel}>
                                                    <label className={styles.compactField}>
                                                        <span>הערה</span>
                                                        <textarea
                                                            className={styles.compactTextarea}
                                                            value={noteDrafts[row.key] ?? ""}
                                                            onChange={(event) =>
                                                                setNoteDrafts((current) => ({
                                                                    ...current,
                                                                    [row.key]: event.target.value,
                                                                }))
                                                            }
                                                        />
                                                    </label>
                                                    <button
                                                        className={styles.secondaryButton}
                                                        disabled={savingNoteKey === row.key}
                                                        type="button"
                                                        onClick={() => void handleNoteSave(row)}
                                                    >
                                                        {savingNoteKey === row.key
                                                            ? "שומר..."
                                                            : "שמירה"}
                                                    </button>
                                                </div>
                                            ) : null}
                                        </td>
                                        <td className={styles.tableCell} data-label="תיק הצטרפות">
                                            {summary ? (
                                                <div className={styles.onboardingSummary}>
                                                    <span>{summary.schoolYear}</span>
                                                    <span>{summary.progress.percentage}%</span>
                                                    <span>
                                                        {onboardingOverallStatusLabels[
                                                            summary.overallStatus
                                                        ]}
                                                    </span>
                                                    <span>
                                                        {summary.missingStepTitle ?? "אין שלב חסר"}
                                                    </span>
                                                    <button
                                                        className={styles.primaryButton}
                                                        type="button"
                                                        onClick={() =>
                                                            navigate(
                                                                `/admin/daycare-onboarding/${summary.id}`
                                                            )
                                                        }
                                                    >
                                                        פתיחת תיק
                                                    </button>
                                                </div>
                                            ) : canCreate ? (
                                                <button
                                                    className={styles.primaryButton}
                                                    type="button"
                                                    onClick={() => openCreateDialog(row)}
                                                >
                                                    פתיחת תיק הצטרפות
                                                </button>
                                            ) : (
                                                <span className={styles.onboardingUnavailable}>
                                                    זמין לאחר החלטה להתקדם
                                                </span>
                                            )}
                                        </td>
                                        <td className={styles.tableCell} data-label="תאריך פנייה">
                                            {formatDate(row.createdAt)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {draft ? (
                <div className={styles.modalBackdrop} role="presentation">
                    <section
                        aria-labelledby="create-onboarding-title"
                        aria-modal="true"
                        className={styles.onboardingModal}
                        role="dialog"
                    >
                        <div className={styles.modalHeader}>
                            <div>
                                <span className={styles.eyebrow}>{draft.sourceLabel}</span>
                                <h3 className={styles.modalTitle} id="create-onboarding-title">
                                    פתיחת תיק הצטרפות
                                </h3>
                            </div>
                            <button
                                aria-label="סגירת חלון פתיחת תיק"
                                className={styles.modalCloseButton}
                                type="button"
                                onClick={() => setDraft(null)}
                            >
                                ×
                            </button>
                        </div>

                        <form className={styles.onboardingForm} onSubmit={handleCreate}>
                            <label className={styles.compactField}>
                                <span>שם ההורה</span>
                                <input
                                    className={styles.compactInput}
                                    readOnly
                                    value={draft.parentName}
                                />
                            </label>
                            <label className={styles.compactField}>
                                <span>טלפון</span>
                                <input
                                    className={styles.compactInput}
                                    readOnly
                                    value={draft.phone}
                                />
                            </label>
                            <label className={styles.compactField}>
                                <span>גיל הילד/ה כפי שנמסר</span>
                                <input
                                    className={styles.compactInput}
                                    readOnly
                                    value={draft.childAge || "לא צוין"}
                                />
                            </label>
                            <label className={styles.compactField}>
                                <span>שנת לימודים</span>
                                <input
                                    className={styles.compactInput}
                                    pattern="[0-9]{4}-[0-9]{4}"
                                    placeholder="2026-2027"
                                    required
                                    value={draft.schoolYear}
                                    onChange={(event) =>
                                        updateDraft("schoolYear", event.target.value)
                                    }
                                />
                            </label>
                            <label className={styles.compactField}>
                                <span>הערה פנימית — אופציונלית</span>
                                <textarea
                                    className={styles.compactTextarea}
                                    maxLength={2000}
                                    value={draft.internalNote ?? ""}
                                    onChange={(event) =>
                                        updateDraft(
                                            "internalNote",
                                            event.target.value || undefined
                                        )
                                    }
                                />
                            </label>
                            <p className={styles.modalHint}>
                                פרטי הילד וההורים יושלמו בהמשך. בשלב זה לא נוצרת רשומת ילד או משפחה חדשה.
                            </p>
                            {createError ? (
                                <p className={styles.formErrorMessage} role="alert">
                                    {createError}
                                </p>
                            ) : null}
                            <div className={styles.modalActions}>
                                <button
                                    className={styles.secondaryButton}
                                    type="button"
                                    onClick={() => setDraft(null)}
                                >
                                    ביטול
                                </button>
                                <button
                                    className={styles.primaryButton}
                                    disabled={creating}
                                    type="submit"
                                >
                                    {creating
                                        ? "יוצר תיק וקישור..."
                                        : "יצירת תיק וקישור להורה"}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            ) : null}
        </section>
    );
};

export default DaycareRegistrations;
