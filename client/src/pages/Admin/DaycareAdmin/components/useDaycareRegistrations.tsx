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

export const useDaycareRegistrations = ({ onChanged }: DaycareRegistrationsProps) => {
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

    return {
        rows, filteredRows, activeCasesCount, loading, error, updatingKey,
        savingNoteKey, expandedTreatmentKeys, expandedDetailKeys, workflowDrafts,
        draft, createError, searchQuery, statusFilter, families, register,
        handleSubmit, createFormErrors, creating, setDraft, setSearchQuery,
        setStatusFilter, setExpandedTreatmentKeys, setExpandedDetailKeys,
        handleStatusChange, openCreateDialog, handleCreate, renderTreatmentPanel,
        navigate, daycareRegistrationStatuses, onboardingOverallStatusLabels,
        eligibleStatuses, nextStatusByStatus, registrationWorkflow,
        parseWorkflowDraft, familyMatchesPhone, familyOptionLabel, formatDate,
    };
};
