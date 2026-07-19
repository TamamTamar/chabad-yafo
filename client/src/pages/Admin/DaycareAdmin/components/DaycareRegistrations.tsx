import axios from "axios";
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
                    ? `אחר — ${registration.requiredHoursOther}`
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
    const [expandedNoteKeys, setExpandedNoteKeys] = useState<string[]>([]);
    const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
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
        void getAdminDaycareFamilies()
            .then(setFamilies)
            .catch(() => setFamilies([]));
    }, []);

    const updateRow = (
        sourceId: string,
        updates: Partial<UnifiedRegistration>
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

    const handleNoteSave = async (row: UnifiedRegistration) => {
        setSavingNoteKey(row.key);
        setError("");

        try {
            const callNotes = noteDrafts[row.key]?.trim() || undefined;

            await updateDaycarePublicRegistration(row.sourceId, { callNotes });

            updateRow(row.sourceId, { callNotes });
            setExpandedNoteKeys((keys) => keys.filter((key) => key !== row.key));
            await onChanged();
        } catch {
            setError("לא הצלחנו לשמור את הערת השיחה");
        } finally {
            setSavingNoteKey(null);
        }
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
                <div className={styles.tableWrapper}>
                    <table className={styles.tableCompact}>
                        <thead>
                            <tr>
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
                            {filteredRows.map((row) => {
                                const summary = row.onboardingSummary;
                                const canCreate = eligibleStatuses.includes(row.status);
                                const nextStatus = nextStatusByStatus[row.status];

                                return (
                                    <tr className={styles.tableRow} key={row.key}>
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
                                                    <span className={styles.onboardingStatusLine}>
                                                        {onboardingOverallStatusLabels[
                                                            summary.overallStatus
                                                        ]}
                                                    </span>
                                                    <span>{summary.progress.percentage}% הושלם · {summary.schoolYear}</span>
                                                    <strong className={styles.onboardingNextAction}>הפעולה הבאה: {summary.missingStepTitle ?? "התיק הושלם"}</strong>
                                                    <button
                                                        className={styles.primaryButton}
                                                        type="button"
                                                        onClick={() =>
                                                            navigate(
                                                                `/admin/daycare-onboarding/${summary.id}`
                                                            )
                                                        }
                                                    >
                                                        פתיחת התיק והמשך טיפול
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
                                <span>הערה פנימית — אופציונלית</span>
                                <textarea
                                    className={styles.compactTextarea}
                                    maxLength={2000}
                                    {...register("internalNote")}
                                />
                            </label>
                            <label className={styles.compactField}>
                                <span>קישור למשפחה קיימת — אם זה אח/ות</span>
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
