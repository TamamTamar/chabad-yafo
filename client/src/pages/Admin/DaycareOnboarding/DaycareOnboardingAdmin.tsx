import { useCallback, useEffect, useMemo, useState } from "react";
import {
    useBlocker,
    useLocation,
    useNavigate,
    useParams,
} from "react-router-dom";
import ConfirmDialog from "../../../components/ConfirmDialog/ConfirmDialog";
import Container from "../../../components/Container/Container";
import {
    downloadAdminAgreementFile,
    getAdminAgreementByOnboarding,
    reviewAdminAgreement,
} from "../../../services/daycareAgreementService";
import type { AdminAgreementByOnboarding } from "../../../types/daycareAgreement";
import {
    getAdminDaycareOnboarding,
    getAdminDaycareOnboardingAudit,
    regenerateAdminOnboardingLink,
    updateAdminOnboardingAccess,
    updateAdminOnboardingOverallStatus,
    updateAdminOnboardingStep,
} from "../../../services/daycareOnboardingService";
import {
    onboardingOverallStatusLabels,
    onboardingAuditActionLabels,
    onboardingResponsibleParties,
    onboardingResponsiblePartyLabels,
    onboardingStepSourceLabels,
    onboardingStepStatusLabels,
    type AdminDaycareOnboarding,
    type AdminOnboardingAuditEntry,
    type AdminOnboardingStep,
    type OnboardingOverallStatus,
    type OnboardingResponsibleParty,
    type OnboardingStepSource,
    type OnboardingStepStatus,
} from "../../../types/daycareOnboarding";
import styles from "./DaycareOnboardingAdmin.module.scss";

type StepDraft = {
    status: OnboardingStepStatus;
    source: OnboardingStepSource;
    responsibleParty: OnboardingResponsibleParty;
    isVisibleToParent: boolean;
    completedAt: string;
    internalNote: string;
    parentMessage: string;
};

type LocationState = {
    parentAccessUrl?: string;
};

const stepStatuses = Object.keys(
    onboardingStepStatusLabels
) as OnboardingStepStatus[];
const stepSources = Object.keys(
    onboardingStepSourceLabels
) as OnboardingStepSource[];
const overallStatuses = Object.keys(
    onboardingOverallStatusLabels
) as OnboardingOverallStatus[];

const formatDate = (value?: string) =>
    value
        ? new Date(value).toLocaleDateString("he-IL", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
          })
        : "—";

const formatDateTime = (value: string) =>
    new Date(value).toLocaleString("he-IL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

const formatAuditValue = (value: unknown) => {
    if (value === undefined) {
        return "";
    }

    if (value === null) {
        return "ריק";
    }

    if (typeof value === "string" || typeof value === "number") {
        return String(value);
    }

    if (typeof value === "boolean") {
        return value ? "כן" : "לא";
    }

    return JSON.stringify(value);
};

const toDateInputValue = (value?: string) =>
    value ? new Date(value).toISOString().slice(0, 10) : "";

const createStepDraft = (step: AdminOnboardingStep): StepDraft => ({
    status: step.status,
    source: step.source ?? "admin",
    responsibleParty: step.responsibleParty,
    isVisibleToParent: step.isVisibleToParent,
    completedAt: toDateInputValue(step.completedAt),
    internalNote: step.internalNote ?? "",
    parentMessage: step.parentMessage ?? "",
});

const createDraftMap = (steps: AdminOnboardingStep[]) =>
    Object.fromEntries(
        steps.map((step) => [step.key, createStepDraft(step)])
    ) as Record<string, StepDraft>;

const auditActorLabels: Record<AdminOnboardingAuditEntry["actorType"], string> = {
    admin: "אדמין",
    automatic: "מערכת אוטומטית",
    parent: "הורה",
};

const guardianRoleLabels: Record<string, string> = {
    mother: "אם",
    father: "אב",
    guardian: "אפוטרופוס/ית",
    grandfather: "סבא",
    grandmother: "סבתא",
    other: "אחר",
};

const stepGuidance: Record<string, string> = {
    onboardingOpened:
        "השלב נוצר אוטומטית. אין צורך למלא כאן דבר.",
    childAndGuardianDetails:
        "ההורה ממלא את פרטי הילד והמשפחה בקישור האישי. כשהפרטים מתקבלים, בדקי אותם ואשרי את השלב או כתבי להורה מה לתקן.",
    agreementSigned:
        "ההורה חותם בקישור האישי. אם הועלה PDF, בדקי אותו באזור ההסכם שמעל ואשרי או החזירי לתיקון.",
    registrationFeeReceived:
        "לאחר שווידאת שהמקדמה התקבלה, לחצי על „סימון כהושלם”. אין צורך לשנות מקור או אחראי.",
    healthDeclarationSubmitted:
        "בדקי שהצהרת הבריאות התקבלה ומלאה. אם חסר מידע, כתבי הודעה להורה באפשרויות המתקדמות.",
    pickupAuthorizationSubmitted:
        "בדקי שהתקבלו פרטי מורשי האיסוף והגבלות האיסוף, ואז סמני את השלב כהושלם.",
    parentPermissionsSubmitted:
        "בדקי שכל ההרשאות הנדרשות נמסרו, ואז סמני את השלב כהושלם.",
    groupAssigned:
        "בחרי את הקבוצה המתאימה במערכת העבודה של המעון, ולאחר השיבוץ סמני כאן כהושלם.",
    adjustmentDayScheduled:
        "תאמי עם המשפחה מועד ליום ההסתגלות. אפשר לשמור את התאריך וההודעה להורה באפשרויות המתקדמות.",
    registrationApproved:
        "לאחר שכל השלבים הקודמים הושלמו, בצעי בדיקה אחרונה וסמני את ההרשמה כמאושרת.",
};

const isStepComplete = (status: OnboardingStepStatus) =>
    status === "completed" || status === "notRequired";

const DaycareOnboardingAdmin = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const locationState = location.state as LocationState | null;
    const [onboarding, setOnboarding] =
        useState<AdminDaycareOnboarding | null>(null);
    const [drafts, setDrafts] = useState<Record<string, StepDraft>>({});
    const [auditEntries, setAuditEntries] = useState<
        AdminOnboardingAuditEntry[]
    >([]);
    const [auditError, setAuditError] = useState("");
    const [dirtyStepKeys, setDirtyStepKeys] = useState<Set<string>>(
        () => new Set()
    );
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [savingStepKey, setSavingStepKey] = useState<string | null>(null);
    const [updatingAccess, setUpdatingAccess] = useState(false);
    const [updatingOverallStatus, setUpdatingOverallStatus] = useState(false);
    const [freshParentLink, setFreshParentLink] = useState(
        locationState?.parentAccessUrl ?? ""
    );
    const [agreementData, setAgreementData] =
        useState<AdminAgreementByOnboarding | null>(null);
    const [agreementMessage, setAgreementMessage] = useState("");
    const [reviewingAgreement, setReviewingAgreement] = useState(false);
    const [linkConfirmation, setLinkConfirmation] = useState<
        "disableAccess" | "regenerateLink" | null
    >(null);

    const isDirty = dirtyStepKeys.size > 0;
    const blocker = useBlocker(isDirty);

    const refreshAudit = useCallback(async (onboardingId: string) => {
        try {
            const entries = await getAdminDaycareOnboardingAudit(onboardingId);
            setAuditEntries(entries);
            setAuditError("");
        } catch {
            setAuditError("לא הצלחנו לטעון את היסטוריית הפעולות");
        }
    }, []);

    useEffect(() => {
        if (!id) {
            return;
        }

        let isCurrent = true;

        void getAdminDaycareOnboarding(id)
            .then((data) => {
                if (!isCurrent) {
                    return;
                }

                setOnboarding(data);
                setDrafts(createDraftMap(data.steps));
                setDirtyStepKeys(new Set());
                void refreshAudit(id);
                void getAdminAgreementByOnboarding(id)
                    .then(setAgreementData)
                    .catch(() => setAgreementData(null));
            })
            .catch(() => {
                if (isCurrent) {
                    setError("לא הצלחנו לטעון את תיק ההצטרפות");
                }
            })
            .finally(() => {
                if (isCurrent) {
                    setLoading(false);
                }
            });

        return () => {
            isCurrent = false;
        };
    }, [id, refreshAudit]);

    const handleAgreementReview = async (
        status: "completed" | "requiresCorrection"
    ) => {
        if (!id || !agreementData?.agreement) return;
        setReviewingAgreement(true);
        setError("");
        try {
            await reviewAdminAgreement(
                agreementData.agreement.id,
                status,
                agreementMessage
            );
            const [updatedOnboarding, updatedAgreement] = await Promise.all([
                getAdminDaycareOnboarding(id),
                getAdminAgreementByOnboarding(id),
            ]);
            setOnboarding(updatedOnboarding);
            setDrafts(createDraftMap(updatedOnboarding.steps));
            setAgreementData(updatedAgreement);
            setNotice(
                status === "completed"
                    ? "ההסכם אושר והשלב הושלם."
                    : "ההסכם הוחזר לתיקון וההודעה מוצגת להורה."
            );
            void refreshAudit(id);
        } catch {
            setError("לא הצלחנו לעדכן את בדיקת ההסכם");
        } finally {
            setReviewingAgreement(false);
        }
    };

    const handleAgreementDownload = async (kind: "signature" | "signedPdf") => {
        if (!agreementData?.agreement) return;
        setError("");
        try {
            const blob = await downloadAdminAgreementFile(
                agreementData.agreement.id,
                kind
            );
            const objectUrl = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = objectUrl;
            anchor.download = kind === "signature" ? "חתימה.png" : "הסכם-חתום.pdf";
            anchor.click();
            URL.revokeObjectURL(objectUrl);
        } catch {
            setError("לא הצלחנו להוריד את קובץ ההסכם");
        }
    };

    useEffect(() => {
        const warnBeforeUnload = (event: BeforeUnloadEvent) => {
            if (!isDirty) {
                return;
            }

            event.preventDefault();
        };

        window.addEventListener("beforeunload", warnBeforeUnload);
        return () => window.removeEventListener("beforeunload", warnBeforeUnload);
    }, [isDirty]);

    useEffect(() => {
        if (!notice) {
            return;
        }

        const timer = window.setTimeout(() => setNotice(""), 4200);
        return () => window.clearTimeout(timer);
    }, [notice]);

    useEffect(() => {
        if (!locationState?.parentAccessUrl) {
            return;
        }

        navigate(location.pathname, { replace: true, state: null });
    }, [location.pathname, locationState?.parentAccessUrl, navigate]);

    const orderedSteps = useMemo(
        () =>
            onboarding
                ? [...onboarding.steps].sort((first, second) => first.order - second.order)
                : [],
        [onboarding]
    );
    const stepTitleByKey = useMemo(
        () => new Map(orderedSteps.map((step) => [step.key, step.title])),
        [orderedSteps]
    );
    const nextStep = useMemo(() => {
        const incompleteSteps = orderedSteps.filter(
            (step) => !isStepComplete(step.status)
        );

        return (
            incompleteSteps.find(
                (step) =>
                    step.status === "pendingReview" ||
                    step.status === "requiresCorrection" ||
                    step.responsibleParty === "admin" ||
                    step.responsibleParty === "both"
            ) ?? incompleteSteps[0]
        );
    }, [orderedSteps]);

    const updateDraft = <Field extends keyof StepDraft>(
        stepKey: string,
        field: Field,
        value: StepDraft[Field]
    ) => {
        setDrafts((current) => ({
            ...current,
            [stepKey]: {
                ...current[stepKey],
                [field]: value,
            },
        }));
        setDirtyStepKeys((current) => new Set(current).add(stepKey));
    };

    const saveStep = async (
        stepKey: string,
        overrides: Partial<StepDraft> = {}
    ) => {
        if (!id || !drafts[stepKey]) {
            return;
        }

        const nextDraft = { ...drafts[stepKey], ...overrides };
        setSavingStepKey(stepKey);
        setError("");

        try {
            const updated = await updateAdminOnboardingStep(id, stepKey, {
                ...nextDraft,
                completedAt: nextDraft.completedAt
                    ? new Date(`${nextDraft.completedAt}T12:00:00`).toISOString()
                    : null,
            });
            const updatedStep = updated.steps.find((step) => step.key === stepKey);

            setOnboarding(updated);
            if (updatedStep) {
                setDrafts((current) => ({
                    ...current,
                    [stepKey]: createStepDraft(updatedStep),
                }));
            }
            setDirtyStepKeys((current) => {
                const next = new Set(current);
                next.delete(stepKey);
                return next;
            });
            setNotice("השינויים בשלב נשמרו");
            void refreshAudit(id);
        } catch {
            setError("שמירת השלב נכשלה. נסו שוב.");
        } finally {
            setSavingStepKey(null);
        }
    };

    const handleOverallStatusChange = async (value: string) => {
        if (!id) {
            return;
        }

        setUpdatingOverallStatus(true);
        setError("");
        try {
            const updated = await updateAdminOnboardingOverallStatus(
                id,
                value === "automatic" ? null : (value as OnboardingOverallStatus)
            );
            setOnboarding(updated);
            setNotice(
                value === "automatic"
                    ? "הסטטוס הכללי חזר לחישוב אוטומטי"
                    : "הסטטוס הכללי עודכן ידנית"
            );
            void refreshAudit(id);
        } catch {
            setError("עדכון הסטטוס הכללי נכשל");
        } finally {
            setUpdatingOverallStatus(false);
        }
    };

    const handleAccessChange = async () => {
        if (!id || !onboarding?.access.enabled) {
            return;
        }

        setLinkConfirmation(null);
        setUpdatingAccess(true);
        setError("");
        try {
            const updated = await updateAdminOnboardingAccess(id, false);
            setOnboarding(updated);
            setFreshParentLink("");
            setNotice("הקישור בוטל");
            void refreshAudit(id);
        } catch {
            setError("עדכון הגישה לקישור נכשל");
        } finally {
            setUpdatingAccess(false);
        }
    };

    const handleRegenerateLink = async () => {
        if (!id) {
            return;
        }

        setLinkConfirmation(null);
        setUpdatingAccess(true);
        setError("");
        try {
            const result = await regenerateAdminOnboardingLink(id);
            setOnboarding(result.data);
            setFreshParentLink(result.parentAccessUrl ?? "");
            setNotice("נוצר קישור אישי חדש והקישור הקודם בוטל");
            void refreshAudit(id);
        } catch {
            setError("יצירת קישור חדש נכשלה");
        } finally {
            setUpdatingAccess(false);
        }
    };

    const copyParentLink = async () => {
        if (!freshParentLink) {
            return;
        }

        try {
            await navigator.clipboard.writeText(freshParentLink);
            setNotice("הקישור הועתק");
        } catch {
            setError("לא הצלחנו להעתיק. אפשר לסמן את הקישור ולהעתיק ידנית.");
        }
    };

    if (!id) {
        return (
            <main className={styles.page} dir="rtl">
                <Container>
                    <div className={styles.stateMessage} role="alert">
                        מזהה תיק ההרשמה חסר
                    </div>
                </Container>
            </main>
        );
    }

    if (loading) {
        return (
            <main className={styles.page} dir="rtl">
                <Container>
                    <div className={styles.stateMessage} aria-live="polite">
                        טוען תיק הצטרפות...
                    </div>
                </Container>
            </main>
        );
    }

    if (!onboarding) {
        return (
            <main className={styles.page} dir="rtl">
                <Container>
                    <div className={styles.stateMessage} role="alert">
                        {error || "תיק ההצטרפות לא נמצא"}
                    </div>
                    <button
                        className={styles.secondaryButton}
                        type="button"
                        onClick={() => navigate("/admin/daycare?tab=registrations")}
                    >
                        חזרה לרשימת ההרשמות
                    </button>
                </Container>
            </main>
        );
    }

    return (
        <main className={styles.page} dir="rtl">
            <Container>
                <button
                    className={styles.backButton}
                    type="button"
                    onClick={() => navigate("/admin/daycare?tab=registrations")}
                >
                    ← חזרה להרשמות
                </button>

                <section className={styles.headerCard}>
                    <div className={styles.headerCopy}>
                        <span className={styles.eyebrow}>תיק הצטרפות למעון</span>
                        <h1 className={styles.title}>
                            {onboarding.child.firstName || onboarding.child.lastName
                                ? `${onboarding.child.firstName ?? ""} ${onboarding.child.lastName ?? ""}`.trim()
                                : "פרטי הילד טרם הושלמו"}
                        </h1>
                        <p className={styles.subtitle}>
                            שנת לימודים {onboarding.schoolYear}
                            {onboarding.profileStatus === "incomplete"
                                ? " · פרופיל התחלתי"
                                : ""}
                            {onboarding.guardians[0]
                                ? ` · ${onboarding.guardians[0].fullName} · ${onboarding.guardians[0].phone}`
                                : ""}
                        </p>
                    </div>
                    <div className={styles.progressSummary}>
                        <strong className={styles.progressNumber}>
                            {onboarding.progress.percentage}%
                        </strong>
                        <span className={styles.progressText}>
                            {onboarding.progress.completedSteps} מתוך {onboarding.progress.totalSteps} שלבים
                        </span>
                    </div>
                </section>

                <div className={styles.feedback} aria-live="polite" aria-atomic="true">
                    {notice && <span className={styles.notice}>{notice}</span>}
                    {error && <span className={styles.error} role="alert">{error}</span>}
                </div>

                <section className={styles.nextActionCard} aria-labelledby="next-action-title">
                    <div className={styles.nextActionMarker} aria-hidden="true">✓</div>
                    <div className={styles.nextActionCopy}>
                        <span className={styles.eyebrow}>מה צריך לעשות עכשיו?</span>
                        <h2 className={styles.nextActionTitle} id="next-action-title">
                            {nextStep ? nextStep.title : "כל שלבי ההרשמה הושלמו"}
                        </h2>
                        <p className={styles.nextActionText}>
                            {nextStep
                                ? stepGuidance[nextStep.key] ?? nextStep.description
                                : "לא נדרשת כרגע פעולה נוספת. אפשר לעבור על הפרטים ולוודא שהמשפחה קיבלה אישור."}
                        </p>
                        {nextStep ? (
                            <div className={styles.nextActionMeta}>
                                <span>{onboardingStepStatusLabels[nextStep.status]}</span>
                                <span>{onboardingResponsiblePartyLabels[nextStep.responsibleParty]}</span>
                            </div>
                        ) : null}
                    </div>
                </section>

                <section className={styles.controlGrid}>
                    <details className={styles.controlCard}>
                        <summary className={styles.controlSummary}>
                            הגדרות מתקדמות של התיק
                        </summary>
                        <h2 className={styles.controlTitle}>סטטוס כללי</h2>
                        <label className={styles.fieldLabel} htmlFor="overall-status">
                            מצב המסלול
                        </label>
                        <select
                            className={styles.select}
                            id="overall-status"
                            value={onboarding.overallStatusOverride ?? "automatic"}
                            disabled={updatingOverallStatus}
                            onChange={(event) =>
                                void handleOverallStatusChange(event.target.value)
                            }
                        >
                            <option value="automatic">
                                אוטומטי — {onboardingOverallStatusLabels[onboarding.calculatedOverallStatus]}
                            </option>
                            {overallStatuses.map((status) => (
                                <option key={status} value={status}>
                                    ידני — {onboardingOverallStatusLabels[status]}
                                </option>
                            ))}
                        </select>
                        <p className={styles.helperText}>
                            הסטטוס שמוצג כעת: {onboardingOverallStatusLabels[onboarding.overallStatus]}
                        </p>
                    </details>

                    <div className={styles.controlCard}>
                        <h2 className={styles.controlTitle}>פרטי המשפחה</h2>
                        {onboarding.child.firstName ? (
                            <dl className={styles.identityDetails}>
                                <div className={styles.identityDetailItem}>
                                    <dt className={styles.identityDetailLabel}>שם הילד/ה</dt>
                                    <dd className={styles.identityDetailValue}>
                                        {`${onboarding.child.firstName} ${onboarding.child.lastName ?? ""}`.trim()}
                                    </dd>
                                </div>
                                <div className={styles.identityDetailItem}>
                                    <dt className={styles.identityDetailLabel}>תאריך לידה</dt>
                                    <dd className={styles.identityDetailValue}>
                                        {formatDate(onboarding.child.birthDate)}
                                    </dd>
                                </div>
                                {onboarding.address ? (
                                    <div className={styles.identityDetailItem}>
                                        <dt className={styles.identityDetailLabel}>כתובת</dt>
                                        <dd className={styles.identityDetailValue}>
                                            {`${onboarding.address.street} ${onboarding.address.houseNumber}${onboarding.address.apartment ? `, דירה ${onboarding.address.apartment}` : ""}, ${onboarding.address.city}`}
                                        </dd>
                                    </div>
                                ) : null}
                            </dl>
                        ) : null}
                        {onboarding.guardians.length > 0 ? (
                            <ul className={styles.guardianList}>
                                {onboarding.guardians.map((guardian) => (
                                    <li
                                        className={styles.guardianItem}
                                        key={`${guardian.role}-${guardian.fullName}-${guardian.phone}`}
                                    >
                                        <strong>{guardian.fullName}</strong>
                                        <span>
                                            {guardianRoleLabels[guardian.role] ??
                                                guardian.role}
                                            {guardian.role === "other" && guardian.roleDetails
                                                ? ` — ${guardian.roleDetails}`
                                                : ""}
                                        </span>
                                        <span dir="ltr">{guardian.phone}</span>
                                        {guardian.email ? (
                                            <span dir="ltr">{guardian.email}</span>
                                        ) : null}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className={styles.helperText}>
                                לא נשמרו אנשי קשר למשפחה.
                            </p>
                        )}
                        {onboarding.internalNote ? (
                            <p className={styles.helperText}>
                                הערה פנימית: {onboarding.internalNote}
                            </p>
                        ) : null}
                    </div>

                    <div className={`${styles.controlCard} ${styles.linkControlCard}`}>
                        <h2 className={styles.controlTitle}>קישור אישי להורה</h2>
                        <p className={styles.helperText}>
                            מטעמי אבטחה לא ניתן לשחזר קישור קיים. קישור גולמי מוצג רק מיד לאחר יצירה או איפוס.
                        </p>
                        <div className={styles.linkActions}>
                            {onboarding.access.enabled ? (
                                <button
                                    className={styles.dangerButton}
                                    type="button"
                                    disabled={updatingAccess}
                                    onClick={() => setLinkConfirmation("disableAccess")}
                                >
                                    ביטול הקישור
                                </button>
                            ) : null}
                            <button
                                className={styles.primaryButton}
                                type="button"
                                disabled={updatingAccess}
                                onClick={() => setLinkConfirmation("regenerateLink")}
                            >
                                יצירת קישור חדש
                            </button>
                        </div>
                        <p className={styles.accessMeta}>
                            גישה: {onboarding.access.enabled ? "פעילה" : "מבוטלת"}
                            {onboarding.access.expiresAt
                                ? ` · בתוקף עד ${formatDate(onboarding.access.expiresAt)}`
                                : ""}
                            {` · כניסה אחרונה: ${formatDate(onboarding.access.lastAccessAt)}`}
                        </p>
                        {!onboarding.access.enabled ? (
                            <p className={styles.helperText}>
                                קישור שבוטל אינו מופעל מחדש. יש ליצור קישור חדש,
                                שיחליף את ה־token הקודם ויהיה תקף ל־90 ימים.
                            </p>
                        ) : null}
                        {freshParentLink && (
                            <div className={styles.freshLinkBox}>
                                <label className={styles.fieldLabel} htmlFor="fresh-parent-link">
                                    הקישור החדש — יש לשמור ולשלוח להורה
                                </label>
                                <input
                                    className={styles.linkInput}
                                    id="fresh-parent-link"
                                    type="text"
                                    value={freshParentLink}
                                    readOnly
                                    dir="ltr"
                                />
                                <button
                                    className={styles.copyButton}
                                    type="button"
                                    onClick={() => void copyParentLink()}
                                >
                                    העתקת הקישור
                                </button>
                            </div>
                        )}
                    </div>
                </section>

                <section className={styles.agreementReviewCard}>
                    <div>
                        <span className={styles.eyebrow}>הסכם התקשרות</span>
                        <h2 className={styles.controlTitle}>אישור וחתימה מקוונת</h2>
                    </div>
                    {!agreementData?.publishedVersion ? (
                        <p className={styles.helperText}>
                            טרם פורסמה גרסת הסכם לשנת {onboarding.schoolYear}.
                            ניתן ליצור ולפרסם אותה בטאב ״הסכמים״ במסך ניהול המעון.
                        </p>
                    ) : agreementData.agreement ? (
                        <>
                            <p className={styles.helperText}>
                                גרסה {agreementData.publishedVersion.version} · אופן חתימה: {agreementData.agreement.signingMethod === "online" ? "מקוון" : "PDF חתום"} · סטטוס: {onboardingStepStatusLabels[agreementData.agreement.status]}
                            </p>
                            {agreementData.agreement.signedBy ? (
                                <p className={styles.helperText}>
                                    החותם/ת: {agreementData.agreement.signedBy} ({guardianRoleLabels[agreementData.agreement.signerRole ?? ""] ?? agreementData.agreement.signerRole})
                                </p>
                            ) : null}
                            {agreementData.agreement.documentId ? (
                                <p className={styles.helperText}>מזהה מסמך: {agreementData.agreement.documentId}</p>
                            ) : null}
                            <div className={styles.linkActions}>
                                {agreementData.agreement.hasSignature ? (
                                    <button className={styles.secondaryButton} type="button" onClick={() => void handleAgreementDownload("signature")}>הורדת החתימה</button>
                                ) : null}
                                {agreementData.agreement.hasSignedPdf ? (
                                    <button className={styles.secondaryButton} type="button" onClick={() => void handleAgreementDownload("signedPdf")}>הורדת PDF חתום</button>
                                ) : null}
                            </div>
                            {agreementData.agreement.signingMethod === "online" &&
                            agreementData.agreement.status === "completed" ? (
                                <p className={styles.helperText}>החתימה המקוונת נבדקה ואושרה. שינוי עתידי של נוסח ההסכם לא ישנה את הגרסה, ה־hash או ה־PDF שנשמרו בעת החתימה.</p>
                            ) : agreementData.agreement.signingMethod === "online" ? (
                                <div className={styles.linkActions}>
                                    <button
                                        className={styles.primaryButton}
                                        type="button"
                                        disabled={reviewingAgreement}
                                        onClick={() => void handleAgreementReview("completed")}
                                    >
                                        {reviewingAgreement
                                            ? "מאשר..."
                                            : "בדקתי — אישור ההסכם"}
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <label className={styles.fieldLabel} htmlFor="agreement-parent-message">הודעה להורה במקרה שנדרש תיקון</label>
                                    <textarea className={styles.textarea} id="agreement-parent-message" value={agreementMessage} onChange={(event) => setAgreementMessage(event.target.value)} />
                                    <div className={styles.linkActions}>
                                        <button className={styles.primaryButton} type="button" disabled={reviewingAgreement} onClick={() => void handleAgreementReview("completed")}>אישור ההסכם</button>
                                        <button className={styles.dangerButton} type="button" disabled={reviewingAgreement || !agreementMessage.trim()} onClick={() => void handleAgreementReview("requiresCorrection")}>דרישת תיקון</button>
                                    </div>
                                </>
                            )}
                        </>
                    ) : (
                        <p className={styles.helperText}>ההסכם פורסם, אך ההורה עדיין לא שלח חתימה או PDF חתום.</p>
                    )}
                </section>

                <section className={styles.stepsSection}>
                    <div className={styles.sectionHeading}>
                        <div>
                            <span className={styles.eyebrow}>שלבי המסלול</span>
                            <h2 className={styles.sectionTitle}>עדכון ידני של שלבים</h2>
                        </div>
                        <span className={styles.dirtySummary}>
                            {isDirty ? `${dirtyStepKeys.size} שלבים עם שינויים שלא נשמרו` : "כל השינויים שמורים"}
                        </span>
                    </div>

                    <div className={styles.stepsList}>
                        {orderedSteps.map((step) => {
                            const draft = drafts[step.key] ?? createStepDraft(step);
                            const isStepDirty = dirtyStepKeys.has(step.key);
                            const isSaving = savingStepKey === step.key;

                            return (
                                <article className={styles.stepCard} key={step.key}>
                                    <div className={styles.stepHeader}>
                                        <span className={styles.stepNumber}>{step.order}</span>
                                        <div className={styles.stepHeadingCopy}>
                                            <h3 className={styles.stepTitle}>{step.title}</h3>
                                            {step.description && (
                                                <p className={styles.stepDescription}>{step.description}</p>
                                            )}
                                        </div>
                                        <span className={styles.statusBadge}>
                                            {onboardingStepStatusLabels[draft.status]}
                                        </span>
                                    </div>

                                    <div className={styles.stepMeta}>
                                        <span>{onboardingResponsiblePartyLabels[draft.responsibleParty]}</span>
                                        <span>עודכן: {formatDate(step.updatedAt)}</span>
                                        <span>על ידי: {step.updatedBy || "מערכת"}</span>
                                    </div>

                                    <p className={styles.stepGuidance}>
                                        {stepGuidance[step.key] ?? step.description}
                                    </p>

                                    <div className={styles.stepActions}>
                                        {!isStepComplete(draft.status) ? (
                                            <button
                                                className={styles.primaryButton}
                                                type="button"
                                                disabled={isSaving}
                                                onClick={() =>
                                                    void saveStep(step.key, {
                                                        status: "completed",
                                                        source: draft.source || "admin",
                                                        completedAt:
                                                            draft.completedAt ||
                                                            new Date().toISOString().slice(0, 10),
                                                    })
                                                }
                                            >
                                                {isSaving ? "שומר..." : "סימון כהושלם"}
                                            </button>
                                        ) : (
                                            <button
                                                className={styles.secondaryButton}
                                                type="button"
                                                disabled={isSaving}
                                                onClick={() =>
                                                    void saveStep(step.key, {
                                                        status: "notStarted",
                                                        completedAt: "",
                                                    })
                                                }
                                            >
                                                פתיחה מחדש
                                            </button>
                                        )}
                                    </div>

                                    <details className={styles.advancedStepEditor}>
                                        <summary className={styles.advancedStepSummary}>
                                            אפשרויות מתקדמות, הערות ותיקונים
                                        </summary>
                                        <div className={styles.editorGrid}>
                                        <label className={styles.fieldLabel}>
                                            סטטוס
                                            <select
                                                className={styles.select}
                                                value={draft.status}
                                                onChange={(event) =>
                                                    updateDraft(
                                                        step.key,
                                                        "status",
                                                        event.target.value as OnboardingStepStatus
                                                    )
                                                }
                                            >
                                                {stepStatuses.map((status) => (
                                                    <option key={status} value={status}>
                                                        {onboardingStepStatusLabels[status]}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>

                                        <label className={styles.fieldLabel}>
                                            מקור עדכון
                                            <select
                                                className={styles.select}
                                                value={draft.source}
                                                onChange={(event) =>
                                                    updateDraft(
                                                        step.key,
                                                        "source",
                                                        event.target.value as OnboardingStepSource
                                                    )
                                                }
                                            >
                                                {stepSources.map((source) => (
                                                    <option key={source} value={source}>
                                                        {onboardingStepSourceLabels[source]}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>

                                        <label className={styles.fieldLabel}>
                                            אחראי על השלב
                                            <select
                                                className={styles.select}
                                                value={draft.responsibleParty}
                                                onChange={(event) =>
                                                    updateDraft(
                                                        step.key,
                                                        "responsibleParty",
                                                        event.target.value as OnboardingResponsibleParty
                                                    )
                                                }
                                            >
                                                {onboardingResponsibleParties.map(
                                                    (responsibleParty) => (
                                                        <option
                                                            key={responsibleParty}
                                                            value={responsibleParty}
                                                        >
                                                            {
                                                                onboardingResponsiblePartyLabels[
                                                                    responsibleParty
                                                                ]
                                                            }
                                                        </option>
                                                    )
                                                )}
                                            </select>
                                        </label>

                                        <label className={styles.fieldLabel}>
                                            תאריך השלמה
                                            <input
                                                className={styles.input}
                                                type="date"
                                                value={draft.completedAt}
                                                onChange={(event) =>
                                                    updateDraft(
                                                        step.key,
                                                        "completedAt",
                                                        event.target.value
                                                    )
                                                }
                                            />
                                        </label>

                                        <label className={styles.visibilityLabel}>
                                            <input
                                                className={styles.checkbox}
                                                type="checkbox"
                                                checked={draft.isVisibleToParent}
                                                onChange={(event) =>
                                                    updateDraft(
                                                        step.key,
                                                        "isVisibleToParent",
                                                        event.target.checked
                                                    )
                                                }
                                            />
                                            השלב גלוי להורה
                                        </label>

                                        <label className={styles.wideFieldLabel}>
                                            הערה פנימית לצוות
                                            <textarea
                                                className={styles.textarea}
                                                value={draft.internalNote}
                                                maxLength={2000}
                                                onChange={(event) =>
                                                    updateDraft(
                                                        step.key,
                                                        "internalNote",
                                                        event.target.value
                                                    )
                                                }
                                            />
                                        </label>

                                        <label className={styles.wideFieldLabel}>
                                            הודעה שמוצגת להורה
                                            <textarea
                                                className={styles.textarea}
                                                value={draft.parentMessage}
                                                maxLength={1000}
                                                onChange={(event) =>
                                                    updateDraft(
                                                        step.key,
                                                        "parentMessage",
                                                        event.target.value
                                                    )
                                                }
                                            />
                                        </label>
                                        </div>

                                        <div className={styles.stepActions}>
                                        <button
                                            className={styles.primaryButton}
                                            type="button"
                                            disabled={!isStepDirty || isSaving}
                                            onClick={() => void saveStep(step.key)}
                                        >
                                            {isSaving ? "שומר..." : "שמירת השלב"}
                                        </button>
                                        <button
                                            className={styles.quickButton}
                                            type="button"
                                            disabled={isSaving}
                                            onClick={() =>
                                                void saveStep(step.key, {
                                                    status: "notRequired",
                                                    source: "admin",
                                                    completedAt: "",
                                                })
                                            }
                                        >
                                            לא נדרש
                                        </button>
                                        </div>
                                    </details>
                                </article>
                            );
                        })}
                    </div>
                </section>

                <section className={styles.auditSection} aria-labelledby="audit-title">
                    <div className={styles.sectionHeading}>
                        <div>
                            <span className={styles.eyebrow}>Audit Trail</span>
                            <h2 className={styles.sectionTitle} id="audit-title">
                                היסטוריית פעולות
                            </h2>
                        </div>
                        <button
                            className={styles.secondaryButton}
                            type="button"
                            onClick={() => void refreshAudit(id)}
                        >
                            רענון
                        </button>
                    </div>

                    {auditError ? (
                        <p className={styles.auditError} role="alert">
                            {auditError}
                        </p>
                    ) : auditEntries.length === 0 ? (
                        <p className={styles.emptyAudit}>טרם תועדו פעולות בתיק.</p>
                    ) : (
                        <ol className={styles.auditList}>
                            {auditEntries.map((entry) => {
                                const previousValue = formatAuditValue(
                                    entry.previousValue
                                );
                                const newValue = formatAuditValue(entry.newValue);

                                return (
                                    <li className={styles.auditItem} key={entry.id}>
                                        <div className={styles.auditHeading}>
                                            <strong className={styles.auditAction}>
                                                {onboardingAuditActionLabels[
                                                    entry.action
                                                ] ?? entry.action}
                                            </strong>
                                            <time
                                                className={styles.auditTime}
                                                dateTime={entry.createdAt}
                                            >
                                                {formatDateTime(entry.createdAt)}
                                            </time>
                                        </div>
                                        <div className={styles.auditMeta}>
                                            <span>
                                                גורם: {entry.actorLabel || auditActorLabels[entry.actorType]}
                                            </span>
                                            {entry.stepKey ? (
                                                <span>
                                                    שלב: {stepTitleByKey.get(entry.stepKey) ?? entry.stepKey}
                                                </span>
                                            ) : null}
                                        </div>
                                        {previousValue || newValue ? (
                                            <div className={styles.auditChange}>
                                                {previousValue ? (
                                                    <span>לפני: {previousValue}</span>
                                                ) : null}
                                                {newValue ? (
                                                    <span>אחרי: {newValue}</span>
                                                ) : null}
                                            </div>
                                        ) : null}
                                    </li>
                                );
                            })}
                        </ol>
                    )}
                </section>
            </Container>

            <ConfirmDialog
                open={linkConfirmation !== null}
                title={linkConfirmation === "disableAccess" ? "ביטול הקישור האישי" : "יצירת קישור חדש"}
                message={linkConfirmation === "disableAccess"
                    ? "לבטל את גישת ההורה לקישור האישי?"
                    : "הקישור הקודם יפסיק לעבוד מיד. ליצור קישור חדש?"}
                confirmLabel={linkConfirmation === "disableAccess" ? "ביטול הקישור" : "יצירת קישור חדש"}
                tone={linkConfirmation === "disableAccess" ? "danger" : "default"}
                onConfirm={() => {
                    if (linkConfirmation === "disableAccess") {
                        void handleAccessChange();
                    } else if (linkConfirmation === "regenerateLink") {
                        void handleRegenerateLink();
                    }
                }}
                onClose={() => setLinkConfirmation(null)}
            />

            {blocker.state === "blocked" && (
                <div className={styles.dialogOverlay} role="presentation">
                    <section
                        className={styles.leaveDialog}
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="leave-dialog-title"
                    >
                        <h2 className={styles.dialogTitle} id="leave-dialog-title">
                            יש שינויים שלא נשמרו
                        </h2>
                        <p className={styles.dialogText}>
                            יציאה מהעמוד תמחק את השינויים שטרם נשמרו.
                        </p>
                        <div className={styles.dialogActions}>
                            <button
                                className={styles.dangerButton}
                                type="button"
                                onClick={() => blocker.proceed()}
                            >
                                יציאה ללא שמירה
                            </button>
                            <button
                                className={styles.primaryButton}
                                type="button"
                                onClick={() => blocker.reset()}
                            >
                                המשך עריכה
                            </button>
                        </div>
                    </section>
                </div>
            )}
        </main>
    );
};

export default DaycareOnboardingAdmin;
