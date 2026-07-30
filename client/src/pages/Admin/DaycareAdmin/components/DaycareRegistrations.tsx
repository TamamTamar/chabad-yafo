import axios from "axios";
import {
    ChevronDown,
    NotebookPen,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, type SubmitHandler } from "react-hook-form";
import { daycareRegistrationStatuses } from "../daycareAdminConfig";
import {
    getDaycareRegistrations,
    updateDaycarePublicRegistration,
} from "../daycareAdminService";
import {
    createOnboardingFromRegistration,
    getAdminDaycareFamilies,
} from "../../../../services/daycareOnboardingService";
import {
    onboardingOverallStatusLabels,
    type AdminDaycareFamilyOption,
    type AdminDaycareOnboardingListItem,
    type CreateOnboardingFromInquiryPayload,
} from "../../../../types/daycareOnboarding";
import type { DaycareInterestStatus } from "../../../../types/daycareRegistration";
import styles from "../DaycareAdmin.module.scss";
import type { DaycareRegistrationsResponse } from "../types";

type DaycareRegistrationsProps = {
    onChanged: () => void;
};

const normalizedPhone = (value: string) => value.replace(/\D/g, "");
const familyMatchesPhone = (family: AdminDaycareFamilyOption, phone: string) =>
    family.guardians.some(
        (guardian) => normalizedPhone(guardian.phone) === normalizedPhone(phone)
    );
const familyOptionLabel = (family: AdminDaycareFamilyOption) => {
    const children = family.childNames.length > 0
        ? family.childNames.join(", ")
        : "ללא ילדים רשומים";
    const guardians = family.guardians.map((guardian) => guardian.fullName).join(", ");
    return `${children} · ${guardians}`;
};

type UnifiedRegistration = {
    key: string;
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
    sourceId: string;
    sourceLabel: string;
    parentName: string;
    phone: string;
    childAge?: string;
};

type RegistrationWorkflowDraft = {
    note: string;
    nextAction: string;
    followUpDate: string;
};

const eligibleStatuses: DaycareInterestStatus[] = ["רוצה להירשם"];
const workflowBlockPattern =
    /\[\[DAYCARE_WORKFLOW\]\]\nפעולה הבאה: (.*)\nמועד חזרה: (.*)\n\[\[\/DAYCARE_WORKFLOW\]\]\n?/;

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
    date ? new Date(date).toLocaleDateString("he-IL") : "-";

const getDefaultNextAction = (status: DaycareInterestStatus) => {
    const nextStatus = nextStatusByStatus[status];

    return nextStatus ? `להתקדם ל„${nextStatus}”` : "";
};

const parseWorkflowDraft = (
    callNotes: string | undefined,
    status: DaycareInterestStatus
): RegistrationWorkflowDraft => {
    const value = callNotes ?? "";
    const match = value.match(workflowBlockPattern);

    if (!match) {
        return {
            note: value,
            nextAction: getDefaultNextAction(status),
            followUpDate: "",
        };
    }

    return {
        note: value.replace(workflowBlockPattern, "").trim(),
        nextAction: match[1]?.trim() || getDefaultNextAction(status),
        followUpDate: match[2]?.trim() ?? "",
    };
};

const serializeWorkflowDraft = (draft: RegistrationWorkflowDraft) => {
    const nextAction = draft.nextAction.trim();
    const followUpDate = draft.followUpDate.trim();
    const note = draft.note.trim();

    if (!nextAction && !followUpDate) {
        return note || undefined;
    }

    const workflowBlock = [
        "[[DAYCARE_WORKFLOW]]",
        `פעולה הבאה: ${nextAction}`,
        `מועד חזרה: ${followUpDate}`,
        "[[/DAYCARE_WORKFLOW]]",
    ].join("\n");

    return note ? `${workflowBlock}\n${note}` : workflowBlock;
};

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
    const rows: UnifiedRegistration[] = data.registrations.map(
        (registration) => ({
            key: `daycareRegistration:${registration._id}`,
            sourceId: registration._id,
            sourceLabel: "טופס הרשמה",
            parentName: registration.parentName,
            phone: registration.phone,
            email: registration.email,
            childName: registration.childName,
            childAge: registration.childAge,
            birthDate: registration.birthDate,
            requiredHours:
                registration.requiredHours === "אחר" &&
                    registration.requiredHoursOther
                    ? `אחר - ${registration.requiredHoursOther}`
                    : registration.requiredHours,
            status: registration.status ?? "מתעניין",
            callNotes: registration.callNotes,
            createdAt: registration.createdAt,
            onboardingSummary: registration.onboardingSummary,
        })
    );
    const uniqueRows = new Map<string, UnifiedRegistration>();

    for (const row of rows) {
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
        registrations: [],
    });
    const [families, setFamilies] = useState<AdminDaycareFamilyOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [updatingKey, setUpdatingKey] = useState<string | null>(null);
    const [savingNoteKey, setSavingNoteKey] = useState<string | null>(null);
    const [expandedTreatmentKeys, setExpandedTreatmentKeys] = useState<string[]>([]);
    const [expandedDetailKeys, setExpandedDetailKeys] = useState<string[]>([]);
    const [workflowDrafts, setWorkflowDrafts] = useState<
        Record<string, RegistrationWorkflowDraft>
    >({});
    const [draft, setDraft] = useState<OnboardingDraft | null>(null);
    const [createError, setCreateError] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<DaycareInterestStatus | "all">("all");
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors: createFormErrors, isSubmitting: creating },
    } = useForm<CreateOnboardingFromInquiryPayload>({
        defaultValues: { schoolYear: getSuggestedSchoolYear(), internalNote: "", existingFamilyId: "" },
        mode: "onBlur",
    });

    const rows = useMemo(() => toUnifiedRegistrations(data), [data]);
    const filteredRows = useMemo(() => {
        const query = searchQuery.trim().toLocaleLowerCase("he");
        return rows.filter((row) => {
            const matchesStatus = statusFilter === "all" || row.status === statusFilter;
            const matchesSearch = !query || [row.parentName, row.phone, row.childName, row.childAge]
                .filter(Boolean)
                .some((value) => value!.toLocaleLowerCase("he").includes(query));
            return matchesStatus && matchesSearch;
        });
    }, [rows, searchQuery, statusFilter]);
    const activeCasesCount = rows.filter((row) => Boolean(row.onboardingSummary)).length;
    useEffect(() => {
        void getDaycareRegistrations()
            .then((registrations) => {
                setData(registrations);
                setWorkflowDrafts(
                    Object.fromEntries(
                        toUnifiedRegistrations(registrations).map((row) => [
                            row.key,
                            parseWorkflowDraft(row.callNotes, row.status),
                        ])
                    )
                );
                setError("");
            })
            .catch(() => {
                setError("לא הצלחנו לטעון את רשימת הרישום");
            })
            .finally(() => setLoading(false));
        void getAdminDaycareFamilies()
            .then(setFamilies)
            .catch(() => setFamilies([]));
    }, []);

    const updateRow = (
        sourceId: string,
        updates: Partial<Pick<UnifiedRegistration, "status" | "callNotes">>
    ) => {
        setData((current) => ({
            registrations: current.registrations.map(
                (registration) =>
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
            await updateDaycarePublicRegistration(row.sourceId, { status });

            updateRow(row.sourceId, { status });
            setWorkflowDrafts((current) => {
                const currentDraft =
                    current[row.key] ??
                    parseWorkflowDraft(row.callNotes, row.status);

                if (
                    currentDraft.nextAction !==
                    getDefaultNextAction(row.status)
                ) {
                    return current;
                }

                return {
                    ...current,
                    [row.key]: {
                        ...currentDraft,
                        nextAction: getDefaultNextAction(status),
                    },
                };
            });
            await onChanged();
        } catch {
            setError("לא הצלחנו לעדכן את סטטוס הפנייה");
        } finally {
            setUpdatingKey(null);
        }
    };

    const openCreateDialog = (registration: UnifiedRegistration) => {
        setCreateError("");
        const nextDraft = createDraft(registration);
        reset({ schoolYear: nextDraft.schoolYear, internalNote: nextDraft.internalNote ?? "", existingFamilyId: "" });
        setDraft(nextDraft);
    };

    const updateWorkflowDraft = (
        key: string,
        updates: Partial<RegistrationWorkflowDraft>
    ) => {
        setWorkflowDrafts((current) => ({
            ...current,
            [key]: {
                ...(current[key] ?? {
                    note: "",
                    nextAction: "",
                    followUpDate: "",
                }),
                ...updates,
            },
        }));
    };

    const cancelTreatmentEdit = (row: UnifiedRegistration) => {
        setWorkflowDrafts((current) => ({
            ...current,
            [row.key]: parseWorkflowDraft(row.callNotes, row.status),
        }));
        setExpandedTreatmentKeys((keys) =>
            keys.filter((key) => key !== row.key)
        );
    };

    const handleTreatmentSave = async (row: UnifiedRegistration) => {
        setSavingNoteKey(row.key);
        setError("");

        try {
            const currentDraft =
                workflowDrafts[row.key] ??
                parseWorkflowDraft(row.callNotes, row.status);
            const callNotes = serializeWorkflowDraft(currentDraft);

            await updateDaycarePublicRegistration(row.sourceId, { callNotes });

            updateRow(row.sourceId, { callNotes });
            setExpandedTreatmentKeys((keys) =>
                keys.filter((key) => key !== row.key)
            );
            await onChanged();
        } catch {
            setError("לא הצלחנו לשמור את ההערה");
        } finally {
            setSavingNoteKey(null);
        }
    };

    const renderTreatmentPanel = (
        row: UnifiedRegistration,
        panelClassName = styles.registrationTreatmentPanel
    ) => {
        const workflowDraft =
            workflowDrafts[row.key] ??
            parseWorkflowDraft(row.callNotes, row.status);

        return (
            <div className={panelClassName}>
                <label
                    className={`${styles.registrationTreatmentField} ${styles.registrationTreatmentNoteField}`}
                >
                    <span className={styles.registrationTreatmentLabel}>
                        הערה
                    </span>
                    <textarea
                        className={styles.registrationTreatmentTextarea}
                        maxLength={700}
                        placeholder="כתיבת הערה..."
                        value={workflowDraft.note}
                        onChange={(event) =>
                            updateWorkflowDraft(row.key, {
                                note: event.target.value,
                            })
                        }
                    />
                </label>
                <div className={styles.registrationTreatmentActions}>
                    <button
                        className={styles.secondaryButton}
                        type="button"
                        onClick={() => cancelTreatmentEdit(row)}
                    >
                        ביטול
                    </button>
                    <button
                        className={styles.primaryButton}
                        disabled={savingNoteKey === row.key}
                        type="button"
                        onClick={() => void handleTreatmentSave(row)}
                    >
                        {savingNoteKey === row.key
                            ? "שומר..."
                            : "שמירת הערה"}
                    </button>
                </div>
            </div>
        );
    };

    const handleCreate: SubmitHandler<CreateOnboardingFromInquiryPayload> = async (form) => {
        if (!draft) {
            return;
        }

        setCreateError("");

        const { sourceId } = draft;
        const payload: CreateOnboardingFromInquiryPayload = {
            schoolYear: form.schoolYear,
            internalNote: form.internalNote?.trim() || undefined,
            existingFamilyId: form.existingFamilyId || undefined,
        };

        try {
            const result = await createOnboardingFromRegistration(sourceId, payload);

            navigate(`/admin/daycare-onboarding/${result.data.id}`, {
                state: { parentAccessUrl: result.parentAccessUrl },
            });
        } catch (error: unknown) {
            setCreateError(getCreateErrorMessage(error));
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
                        כל הפניות מגיעות מטופס ההרשמה ומטופלות כאן במקום אחד.
                    </p>
                </div>
            </div>

            <div className={styles.registrationSummaryBar}>
                <div><strong>{rows.length}</strong><span>פניות בסך הכול</span></div>
                <div><strong>{activeCasesCount}</strong><span>תיקי הצטרפות פתוחים</span></div>
                <div><strong>{rows.filter((row) => row.status === "נרשם").length}</strong><span>ילדים רשומים</span></div>
            </div>

            <div className={styles.registrationToolbar}>
                <label className={styles.compactField}>
                    <span>חיפוש משפחה</span>
                    <input
                        className={styles.compactInput}
                        placeholder="שם הורה, ילד או טלפון"
                        type="search"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                    />
                </label>
                <label className={styles.compactField}>
                    <span>סינון לפי סטטוס</span>
                    <select className={styles.statusSelect} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as DaycareInterestStatus | "all")}>
                        <option value="all">כל הסטטוסים</option>
                        {daycareRegistrationStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                </label>
                <span className={styles.registrationResultCount}>{filteredRows.length} תוצאות</span>
            </div>

            <details className={styles.workflowHelp}>
                <summary>איך מטפלים בפנייה?</summary>
                <ol className={styles.registrationWorkflow} aria-label="שלבי הטיפול בפנייה">
                    {registrationWorkflow.map((step, index) => (
                        <li className={styles.registrationWorkflowStep} key={step.title}>
                            <span className={styles.registrationWorkflowNumber}>{index + 1}</span>
                            <div><strong>{step.title}</strong><p>{step.text}</p></div>
                        </li>
                    ))}
                </ol>
            </details>

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
            ) : filteredRows.length === 0 ? (
                <div className={styles.emptyState}>לא נמצאו פניות שמתאימות לחיפוש.</div>
            ) : (
                <>
                <div className={styles.registrationDesktopTable}>
                    <table className={styles.tableCompact}>
                        <thead>
                            <tr>
                                <th className={styles.tableHeader}>שם הורה</th>
                                <th className={styles.tableHeader}>טלפון</th>
                                <th className={styles.tableHeader}>ילד/ה</th>
                                <th className={styles.tableHeader}>סטטוס</th>
                                <th className={styles.tableHeader}>הערה</th>
                                <th className={styles.tableHeader}>תיק הצטרפות</th>
                                <th className={styles.tableHeader}>תאריך פנייה</th>
                            </tr>
                        </thead>
                        {filteredRows.map((row) => {
                            const summary = row.onboardingSummary;
                            const canCreate = eligibleStatuses.includes(row.status);
                            const nextStatus = nextStatusByStatus[row.status];
                            const workflowDraft =
                                workflowDrafts[row.key] ??
                                parseWorkflowDraft(row.callNotes, row.status);
                            const isTreatmentExpanded =
                                expandedTreatmentKeys.includes(row.key);

                            return (
                                <tbody className={styles.registrationDesktopRowGroup} key={row.key}>
                                    <tr className={styles.tableRow}>
                                        <td className={styles.tableCell}>
                                            {row.parentName}
                                        </td>
                                        <td className={styles.tableCell}>
                                            <span className={styles.registrationDesktopPhone}>
                                                {row.phone}
                                            </span>
                                        </td>
                                        <td className={styles.tableCell}>
                                            <div className={styles.registrationDesktopChild}>
                                                <span className={styles.registrationDesktopChildName}>
                                                    {row.childName || "שם טרם נמסר"}
                                                </span>
                                                <span className={styles.registrationDesktopChildAge}>
                                                    {row.childAge || "גיל טרם נמסר"}
                                                </span>
                                            </div>
                                        </td>
                                        <td className={styles.tableCell}>
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
                                                {daycareRegistrationStatuses.map((status) => (
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
                                                    הבא: {nextStatus}
                                                </button>
                                            ) : null}
                                        </td>
                                        <td className={styles.tableCell}>
                                            <button
                                                className={styles.callSummaryToggle}
                                                type="button"
                                                aria-expanded={isTreatmentExpanded}
                                                onClick={() =>
                                                    setExpandedTreatmentKeys((keys) =>
                                                        keys.includes(row.key)
                                                            ? keys.filter((key) => key !== row.key)
                                                            : [...keys, row.key]
                                                    )
                                                }
                                            >
                                                {isTreatmentExpanded ? "סגירה" : "הערה"}
                                            </button>
                                            {!isTreatmentExpanded && workflowDraft.note ? (
                                                <p className={styles.callSummaryPreview}>
                                                    {workflowDraft.note}
                                                </p>
                                            ) : null}
                                        </td>
                                        <td className={styles.tableCell}>
                                            {summary ? (
                                                <div className={styles.onboardingSummary}>
                                                    <span className={styles.onboardingStatusLine}>
                                                        {onboardingOverallStatusLabels[summary.overallStatus]}
                                                    </span>
                                                    <span className={styles.registrationOnboardingMeta}>
                                                        {summary.progress.percentage}% הושלם · {summary.schoolYear}
                                                    </span>
                                                    <button
                                                        className={styles.primaryButton}
                                                        type="button"
                                                        onClick={() =>
                                                            navigate(`/admin/daycare-onboarding/${summary.id}`)
                                                        }
                                                    >
                                                        פתיחת התיק
                                                    </button>
                                                </div>
                                            ) : canCreate ? (
                                                <button
                                                    className={styles.primaryButton}
                                                    type="button"
                                                    onClick={() => openCreateDialog(row)}
                                                >
                                                    פתיחת תיק
                                                </button>
                                            ) : (
                                                <span className={styles.onboardingUnavailable}>
                                                    זמין לאחר החלטה להתקדם
                                                </span>
                                            )}
                                        </td>
                                        <td className={styles.tableCell}>
                                            {formatDate(row.createdAt)}
                                        </td>
                                    </tr>
                                    {isTreatmentExpanded ? (
                                        <tr className={styles.registrationDesktopTreatmentRow}>
                                            <td className={styles.registrationDesktopTreatmentCell} colSpan={7}>
                                                {renderTreatmentPanel(
                                                    row,
                                                    `${styles.registrationTreatmentPanel} ${styles.registrationDesktopTreatmentPanel}`
                                                )}
                                            </td>
                                        </tr>
                                    ) : null}
                                </tbody>
                            );
                        })}
                    </table>
                </div>
                <div className={styles.registrationMobileQueue}>
                    {filteredRows.map((row) => {
                        const summary = row.onboardingSummary;
                        const canCreate = eligibleStatuses.includes(row.status);
                        const workflowDraft =
                            workflowDrafts[row.key] ??
                            parseWorkflowDraft(row.callNotes, row.status);
                        const isTreatmentExpanded =
                            expandedTreatmentKeys.includes(row.key);
                        const isDetailsExpanded =
                            expandedDetailKeys.includes(row.key);

                        return (
                            <article className={styles.registrationCard} key={row.key}>
                                <div className={styles.registrationCardHeader}>
                                    <div className={styles.registrationIdentity}>
                                        <h3 className={styles.registrationParentName}>
                                            {row.parentName}
                                        </h3>
                                        <div className={styles.registrationChildSummary}>
                                            <span className={styles.registrationChildName}>
                                                {row.childName || "שם הילד/ה טרם נמסר"}
                                            </span>
                                            <span className={styles.registrationChildAge}>
                                                {row.childAge || "גיל טרם נמסר"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className={styles.registrationMobileMeta}>
                                        <span className={styles.registrationMobileStatus}>
                                            {row.status}
                                        </span>
                                    </div>
                                </div>

                                <div
                                    className={styles.registrationQuickActions}
                                    aria-label={`פעולות מהירות עבור ${row.parentName}`}
                                >
                                    <button
                                        className={styles.registrationQuickButton}
                                        type="button"
                                        aria-expanded={isTreatmentExpanded}
                                        onClick={() =>
                                            setExpandedTreatmentKeys((keys) =>
                                                keys.includes(row.key)
                                                    ? keys.filter(
                                                        (key) => key !== row.key
                                                    )
                                                    : [...keys, row.key]
                                            )
                                        }
                                    >
                                        <NotebookPen
                                            aria-hidden="true"
                                            className={styles.registrationQuickIcon}
                                            size={18}
                                        />
                                        הוספת הערה
                                    </button>
                                </div>

                                {isTreatmentExpanded
                                    ? renderTreatmentPanel(row)
                                    : null}

                                <button
                                    className={styles.registrationDetailsToggle}
                                    type="button"
                                    aria-expanded={isDetailsExpanded}
                                    onClick={() =>
                                        setExpandedDetailKeys((keys) =>
                                            keys.includes(row.key)
                                                ? keys.filter(
                                                    (key) => key !== row.key
                                                )
                                                : [...keys, row.key]
                                        )
                                    }
                                >
                                    {isDetailsExpanded
                                        ? "הסתרת פרטים"
                                        : "הצגת פרטים"}
                                    <ChevronDown
                                        aria-hidden="true"
                                        className={
                                            isDetailsExpanded
                                                ? styles.registrationDetailsIconOpen
                                                : styles.registrationDetailsIcon
                                        }
                                        size={18}
                                    />
                                </button>

                                {isDetailsExpanded ? (
                                    <div className={styles.registrationDetails}>
                                        <dl className={styles.registrationDetailsGrid}>
                                            <div className={styles.registrationDetailItem}>
                                                <dt
                                                    className={
                                                        styles.registrationDetailLabel
                                                    }
                                                >
                                                    טלפון
                                                </dt>
                                                <dd
                                                    className={
                                                        styles.registrationDetailValue
                                                    }
                                                >
                                                    {row.phone}
                                                </dd>
                                            </div>
                                            <div className={styles.registrationDetailItem}>
                                                <dt
                                                    className={
                                                        styles.registrationDetailLabel
                                                    }
                                                >
                                                    שעות מבוקשות
                                                </dt>
                                                <dd
                                                    className={
                                                        styles.registrationDetailValue
                                                    }
                                                >
                                                    {row.requiredHours || "לא צוין"}
                                                </dd>
                                            </div>
                                            <div className={styles.registrationDetailItem}>
                                                <dt
                                                    className={
                                                        styles.registrationDetailLabel
                                                    }
                                                >
                                                    תאריך פנייה
                                                </dt>
                                                <dd
                                                    className={
                                                        styles.registrationDetailValue
                                                    }
                                                >
                                                    {formatDate(row.createdAt)}
                                                </dd>
                                            </div>
                                            <div className={styles.registrationDetailItem}>
                                                <dt
                                                    className={
                                                        styles.registrationDetailLabel
                                                    }
                                                >
                                                    דוא״ל
                                                </dt>
                                                <dd
                                                    className={
                                                        styles.registrationDetailValue
                                                    }
                                                >
                                                    {row.email || "לא צוין"}
                                                </dd>
                                            </div>
                                        </dl>

                                        {workflowDraft.note ? (
                                            <div className={styles.registrationSavedNote}>
                                                <span
                                                    className={
                                                        styles.registrationSavedNoteLabel
                                                    }
                                                >
                                                    הערה אחרונה
                                                </span>
                                                <p
                                                    className={
                                                        styles.registrationSavedNoteText
                                                    }
                                                >
                                                    {workflowDraft.note}
                                                </p>
                                            </div>
                                        ) : null}

                                        <div className={styles.registrationOnboarding}>
                                            {summary ? (
                                                <div className={styles.onboardingSummary}>
                                                    <span
                                                        className={
                                                            styles.onboardingStatusLine
                                                        }
                                                    >
                                                        {
                                                            onboardingOverallStatusLabels[
                                                            summary.overallStatus
                                                            ]
                                                        }
                                                    </span>
                                                    <span
                                                        className={
                                                            styles.registrationOnboardingMeta
                                                        }
                                                    >
                                                        {summary.progress.percentage}%
                                                        הושלם · {summary.schoolYear}
                                                    </span>
                                                    <strong
                                                        className={
                                                            styles.onboardingNextAction
                                                        }
                                                    >
                                                        הפעולה הבאה:{" "}
                                                        {summary.missingStepTitle ??
                                                            "התיק הושלם"}
                                                    </strong>
                                                    <button
                                                        className={styles.primaryButton}
                                                        type="button"
                                                        onClick={() =>
                                                            navigate(
                                                                `/admin/daycare-onboarding/${summary.id}`
                                                            )
                                                        }
                                                    >
                                                        פתיחת התיק
                                                    </button>
                                                </div>
                                            ) : canCreate ? (
                                                <button
                                                    className={styles.primaryButton}
                                                    type="button"
                                                    onClick={() =>
                                                        openCreateDialog(row)
                                                    }
                                                >
                                                    פתיחת תיק הצטרפות
                                                </button>
                                            ) : (
                                                <span
                                                    className={
                                                        styles.onboardingUnavailable
                                                    }
                                                >
                                                    תיק הצטרפות יהיה זמין לאחר
                                                    החלטה להתקדם
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ) : null}
                            </article>
                        );
                    })}
                </div>
                </>
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

                        <form className={styles.onboardingForm} noValidate onSubmit={handleSubmit(handleCreate)}>
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
                                    {...register("schoolYear", {
                                        required: "יש להזין שנת לימודים",
                                        pattern: { value: /^[0-9]{4}-[0-9]{4}$/, message: "יש להזין שנה בפורמט 2026-2027" },
                                    })}
                                />
                                {createFormErrors.schoolYear ? <span className={styles.formErrorMessage}>{createFormErrors.schoolYear.message}</span> : null}
                            </label>
                            <label className={styles.compactField}>
                                <span>הערה פנימית - אופציונלית</span>
                                <textarea
                                    className={styles.compactTextarea}
                                    maxLength={2000}
                                    {...register("internalNote")}
                                />
                            </label>
                            <label className={styles.compactField}>
                                <span>קישור למשפחה קיימת - אם זה אח/ות</span>
                                <select className={styles.compactInput} {...register("existingFamilyId")}>
                                    <option value="">ילד/ה ראשון/ה במשפחה</option>
                                    {[...families]
                                        .sort((left, right) => Number(familyMatchesPhone(right, draft.phone)) - Number(familyMatchesPhone(left, draft.phone)))
                                        .map((family) => (
                                            <option value={family.id} key={family.id}>
                                                {familyMatchesPhone(family, draft.phone) ? "התאמה לפי טלפון · " : ""}{familyOptionLabel(family)}
                                            </option>
                                        ))}
                                </select>
                            </label>
                            <p className={styles.modalHint}>
                                פרטי הילד וההורים יושלמו בהמשך. אם נבחרה משפחה קיימת,
                                הילד/ה החדש/ה יקושר/תקושר אליה כאח/ות לאחר שמירת הפרטים.
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
