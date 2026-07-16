import { useEffect, useMemo, useState } from "react";
import {
    useBlocker,
    useLocation,
    useNavigate,
    useParams,
} from "react-router-dom";
import ConfirmDialog from "../../../components/ConfirmDialog/ConfirmDialog";
import BaseDialog from "../../../components/BaseDialog/BaseDialog";
import dialogStyles from "../../../components/BaseDialog/BaseDialog.module.scss";
import Container from "../../../components/Container/Container";
import {
    downloadAdminAgreementFile,
    getAdminAgreementByOnboarding,
    reviewAdminAgreement,
} from "../../../services/daycareAgreementService";
import type { AdminAgreementByOnboarding, DaycareCorrectionDisposition } from "../../../types/daycareAgreement";
import { downloadAdminDaycareHealthDeclaration, getAdminDaycareHealthDeclaration, reviewAdminDaycareHealthDeclaration } from "../../../services/daycareHealthDeclarationService";
import type { DaycareHealthDeclarationSubmission } from "../../../types/daycareHealthDeclaration";
import { downloadAdminDaycarePickupAuthorization, getAdminDaycarePickupAuthorization, reviewAdminDaycarePickupAuthorization } from "../../../services/daycarePickupAuthorizationService";
import type { DaycarePickupAuthorizationSubmission } from "../../../types/daycarePickupAuthorization";
import {
    deleteAdminDaycareOnboarding,
    getAdminDaycareOnboarding,
    regenerateAdminOnboardingLink,
    updateAdminOnboardingAccess,
    updateAdminOnboardingOverallStatus,
    updateAdminOnboardingStep,
} from "../../../services/daycareOnboardingService";
import {
    onboardingOverallStatusLabels,
    onboardingResponsibleParties,
    onboardingResponsiblePartyLabels,
    onboardingStepSourceLabels,
    onboardingStepStatusLabels,
    type AdminDaycareOnboarding,
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
        "כל הפרטים והמסמכים אושרו. לאחר שווידאת שהתשלום ואמצעי התשלום הוסדרו, אשרי את התשלום.",
    healthDeclarationSubmitted:
        "בדקי שהצהרת הבריאות התקבלה ומלאה. אם חסר מידע, כתבי הודעה להורה באפשרויות המתקדמות.",
    pickupAuthorizationSubmitted:
        "בדקי את פרטי מורשי האיסוף ואת הטופס החתום. אם חסר מידע, החזירי את המסמך לתיקון.",
    registrationApproved:
        "התשלום אושר. בחרי את הקבוצה המתאימה ואשרי את השיבוץ. הפעולה תעדכן אוטומטית את הילד/ה לסטטוס „נרשם”.",
};

const completeActionLabel = (step: AdminOnboardingStep) => {
    if (step.key === "childAndGuardianDetails" && step.status === "pendingReview") {
        return "אישור פרטי הילד והמשפחה";
    }
    if (step.key === "registrationFeeReceived") {
        return "אישור שהתשלום הוסדר";
    }
    if (step.key === "registrationApproved") {
        return "אישור השיבוץ והשלמת הרישום";
    }
    return "סימון כהושלם";
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
    const [freshLinkDialogOpen, setFreshLinkDialogOpen] = useState(
        Boolean(locationState?.parentAccessUrl)
    );
    const [agreementData, setAgreementData] =
        useState<AdminAgreementByOnboarding | null>(null);
    const [agreementMessage, setAgreementMessage] = useState("");
    const [agreementCorrectionDisposition, setAgreementCorrectionDisposition] = useState<DaycareCorrectionDisposition | "">("");
    const [reviewingAgreement, setReviewingAgreement] = useState(false);
    const [profileMessage, setProfileMessage] = useState("");
    const [reviewingProfile, setReviewingProfile] = useState(false);
    const [healthDeclaration, setHealthDeclaration] = useState<DaycareHealthDeclarationSubmission | null>(null);
    const [healthMessage, setHealthMessage] = useState("");
    const [healthCorrectionDisposition, setHealthCorrectionDisposition] = useState<DaycareCorrectionDisposition | "">("");
    const [reviewingHealth, setReviewingHealth] = useState(false);
    const [pickupAuthorization, setPickupAuthorization] = useState<DaycarePickupAuthorizationSubmission | null>(null);
    const [pickupMessage, setPickupMessage] = useState("");
    const [pickupCorrectionDisposition, setPickupCorrectionDisposition] = useState<DaycareCorrectionDisposition | "">("");
    const [reviewingPickup, setReviewingPickup] = useState(false);
    const [reviewingAllDocuments, setReviewingAllDocuments] = useState(false);
    const [linkConfirmation, setLinkConfirmation] = useState<
        "disableAccess" | "regenerateLink" | null
    >(null);
    const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
    const [deletingOnboarding, setDeletingOnboarding] = useState(false);

    const isDirty = dirtyStepKeys.size > 0;
    const blocker = useBlocker(isDirty);

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
                void getAdminAgreementByOnboarding(id)
                    .then(setAgreementData)
                    .catch(() => setAgreementData(null));
                void getAdminDaycareHealthDeclaration(id)
                    .then(setHealthDeclaration)
                    .catch(() => setHealthDeclaration(null));
                void getAdminDaycarePickupAuthorization(id)
                    .then(setPickupAuthorization)
                    .catch(() => setPickupAuthorization(null));
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
    }, [id]);

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
                agreementMessage,
                status === "requiresCorrection"
                    ? agreementData.agreement.signingMethod === "uploadedPdf"
                        ? agreementCorrectionDisposition || undefined
                        : "preserveVersion"
                    : undefined
            );
            const [updatedOnboarding, updatedAgreement] = await Promise.all([
                getAdminDaycareOnboarding(id),
                getAdminAgreementByOnboarding(id),
            ]);
            setOnboarding(updatedOnboarding);
            setDrafts(createDraftMap(updatedOnboarding.steps));
            setAgreementData(updatedAgreement);
            setAgreementMessage("");
            setAgreementCorrectionDisposition("");
            setNotice(
                status === "completed"
                    ? "ההסכם אושר והשלב הושלם."
                    : "ההסכם הוחזר לתיקון וההודעה מוצגת להורה."
            );
        } catch {
            setError("לא הצלחנו לעדכן את בדיקת ההסכם");
        } finally {
            setReviewingAgreement(false);
        }
    };

    const handleProfileCorrection = async () => {
        if (!id || !profileMessage.trim()) return;
        setReviewingProfile(true);
        setError("");
        try {
            const updated = await updateAdminOnboardingStep(
                id,
                "childAndGuardianDetails",
                {
                    status: "requiresCorrection",
                    parentMessage: profileMessage.trim(),
                }
            );
            setOnboarding(updated);
            setDrafts(createDraftMap(updated.steps));
            setProfileMessage("");
            setNotice("פרטי הילד והמשפחה נפתחו לתיקון אצל ההורה.");
        } catch {
            setError("לא הצלחנו לפתוח את פרטי הילד והמשפחה לתיקון");
        } finally {
            setReviewingProfile(false);
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

    const handleHealthReview = async (status: "completed" | "requiresCorrection") => {
        if (!id || !healthDeclaration) return;
        setReviewingHealth(true); setError("");
        try {
            await reviewAdminDaycareHealthDeclaration(
                healthDeclaration.id,
                status,
                healthMessage,
                status === "requiresCorrection"
                    ? healthDeclaration.signingMethod === "uploadedFile"
                        ? healthCorrectionDisposition || undefined
                        : "preserveVersion"
                    : undefined
            );
            const [updatedOnboarding, updatedHealth] = await Promise.all([
                getAdminDaycareOnboarding(id),
                getAdminDaycareHealthDeclaration(id),
            ]);
            setOnboarding(updatedOnboarding);
            setDrafts(createDraftMap(updatedOnboarding.steps));
            setHealthDeclaration(updatedHealth);
            setHealthMessage("");
            setHealthCorrectionDisposition("");
            setNotice(status === "completed" ? "הצהרת הבריאות אושרה." : "הצהרת הבריאות הוחזרה לתיקון.");
        } catch {
            setError("לא הצלחנו לעדכן את בדיקת הצהרת הבריאות");
        } finally { setReviewingHealth(false); }
    };

    const handleHealthDownload = async () => {
        if (!healthDeclaration) return;
        setError("");
        try {
            const blob = await downloadAdminDaycareHealthDeclaration(healthDeclaration.id);
            const objectUrl = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = objectUrl;
            anchor.download = "הצהרת-בריאות-חתומה.pdf";
            anchor.click();
            URL.revokeObjectURL(objectUrl);
        } catch { setError("לא הצלחנו להוריד את הצהרת הבריאות"); }
    };

    const handlePickupReview = async (status: "completed" | "requiresCorrection") => {
        if (!id || !pickupAuthorization) return;
        setReviewingPickup(true); setError("");
        try {
            await reviewAdminDaycarePickupAuthorization(
                pickupAuthorization.id,
                status,
                pickupMessage,
                status === "requiresCorrection"
                    ? pickupAuthorization.signingMethod === "uploadedFile"
                        ? pickupCorrectionDisposition || undefined
                        : "preserveVersion"
                    : undefined
            );
            const [updatedOnboarding, updatedPickup] = await Promise.all([getAdminDaycareOnboarding(id), getAdminDaycarePickupAuthorization(id)]);
            setOnboarding(updatedOnboarding); setDrafts(createDraftMap(updatedOnboarding.steps)); setPickupAuthorization(updatedPickup); setPickupMessage(""); setPickupCorrectionDisposition("");
            setNotice(status === "completed" ? "מורשי האיסוף אושרו." : "מורשי האיסוף הוחזרו לתיקון.");
        } catch { setError("לא הצלחנו לעדכן את בדיקת מורשי האיסוף"); }
        finally { setReviewingPickup(false); }
    };

    const handlePickupDownload = async () => {
        if (!pickupAuthorization) return; setError("");
        try { const blob = await downloadAdminDaycarePickupAuthorization(pickupAuthorization.id); const objectUrl = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = objectUrl; anchor.download = "מורשי-איסוף-חתום.pdf"; anchor.click(); URL.revokeObjectURL(objectUrl); }
        catch { setError("לא הצלחנו להוריד את מורשי האיסוף"); }
    };

    const handleApproveAllDocuments = async () => {
        if (!id || !agreementData?.agreement || !healthDeclaration || !pickupAuthorization) return;
        setReviewingAllDocuments(true);
        setError("");
        setNotice("");
        try {
            const profileStep = onboarding?.steps.find(
                (step) => step.key === "childAndGuardianDetails"
            );
            if (profileStep?.status !== "completed" && profileStep?.status !== "notRequired") {
                await updateAdminOnboardingStep(id, "childAndGuardianDetails", {
                    status: "completed",
                });
            }
            if (agreementData.agreement.status !== "completed") {
                await reviewAdminAgreement(agreementData.agreement.id, "completed");
            }
            if (healthDeclaration.status !== "completed") {
                await reviewAdminDaycareHealthDeclaration(
                    healthDeclaration.id,
                    "completed",
                    ""
                );
            }
            if (pickupAuthorization.status !== "completed") {
                await reviewAdminDaycarePickupAuthorization(
                    pickupAuthorization.id,
                    "completed",
                    ""
                );
            }

            const [updatedOnboarding, updatedAgreement, updatedHealth, updatedPickup] = await Promise.all([
                getAdminDaycareOnboarding(id),
                getAdminAgreementByOnboarding(id),
                getAdminDaycareHealthDeclaration(id),
                getAdminDaycarePickupAuthorization(id),
            ]);
            setOnboarding(updatedOnboarding);
            setDrafts(createDraftMap(updatedOnboarding.steps));
            setAgreementData(updatedAgreement);
            setHealthDeclaration(updatedHealth);
            setPickupAuthorization(updatedPickup);
            setNotice("כל הפרטים והמסמכים אושרו. התיק ממתין כעת להסדרת תשלום.");
        } catch {
            setError("לא הצלחנו לאשר את כל הפרטים והמסמכים");
        } finally {
            setReviewingAllDocuments(false);
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

    useEffect(() => {
        if (!onboarding || !["#profile-details", "#agreement-review", "#health-declaration", "#pickup-authorization", "#documents-approval", "#payment-and-placement"].includes(location.hash)) return;
        window.requestAnimationFrame(() => {
            document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    }, [location.hash, onboarding]);

    const orderedSteps = useMemo(
        () =>
            onboarding
                ? [...onboarding.steps].sort((first, second) => first.order - second.order)
                : [],
        [onboarding]
    );
    const manageableSteps = useMemo(
        () => orderedSteps.filter((step) => step.responsibleParty !== "automatic"),
        [orderedSteps]
    );
    const operationalSteps = useMemo(
        () => manageableSteps.filter((step) =>
            ["registrationFeeReceived", "registrationApproved"].includes(step.key)
        ),
        [manageableSteps]
    );
    const adminCompletedSteps = manageableSteps.filter((step) =>
        isStepComplete(step.status)
    ).length;
    const adminProgressPercentage = manageableSteps.length === 0
        ? 100
        : Math.round((adminCompletedSteps / manageableSteps.length) * 100);
    const profileReviewStep = orderedSteps.find(
        (step) => step.key === "childAndGuardianDetails"
    );
    const reviewStatuses = [
        profileReviewStep?.status,
        agreementData?.agreement?.status,
        healthDeclaration?.status,
        pickupAuthorization?.status,
    ];
    const allDocumentsSubmitted = reviewStatuses.every(
        (status) => status === "pendingReview" || status === "completed" || status === "notRequired"
    );
    const allDocumentsApproved = reviewStatuses.every(
        (status) => status === "completed" || status === "notRequired"
    );
    const reviewChecklist = [
        { key: "childAndGuardianDetails", title: "פרטי הילד והמשפחה", status: profileReviewStep?.status ?? "notStarted", target: "profile-details" },
        { key: "agreementSigned", title: "הסכם התקשרות", status: agreementData?.agreement?.status ?? orderedSteps.find((step) => step.key === "agreementSigned")?.status ?? "notStarted", target: "agreement-review" },
        { key: "healthDeclarationSubmitted", title: "הצהרת בריאות", status: healthDeclaration?.status ?? orderedSteps.find((step) => step.key === "healthDeclarationSubmitted")?.status ?? "notStarted", target: "health-declaration" },
        { key: "pickupAuthorizationSubmitted", title: "מורשי איסוף", status: pickupAuthorization?.status ?? orderedSteps.find((step) => step.key === "pickupAuthorizationSubmitted")?.status ?? "notStarted", target: "pickup-authorization" },
    ] as const;
    const nextStep = useMemo(() => {
        const incompleteSteps = manageableSteps.filter(
            (step) => !isStepComplete(step.status)
        );

        return (
            incompleteSteps.find(
                (step) =>
                    step.status === "pendingReview" ||
                    step.status === "requiresCorrection"
            ) ?? incompleteSteps[0]
        );
    }, [manageableSteps]);

    const scrollToCaseSection = (target: string) => {
        navigate(`${location.pathname}#${target}`, { replace: true });
        document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

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
            setFreshLinkDialogOpen(Boolean(result.parentAccessUrl));
            setNotice("נוצר קישור אישי חדש והקישור הקודם בוטל");
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

    const handleDeleteOnboarding = async () => {
        if (!id) return;
        setDeletingOnboarding(true);
        setError("");
        try {
            await deleteAdminDaycareOnboarding(id);
            setDeleteConfirmationOpen(false);
            navigate("/admin/daycare?tab=registrations", { replace: true });
        } catch {
            setError("מחיקת התיק נכשלה. לא בוצע שינוי בנתונים.");
            setDeleteConfirmationOpen(false);
        } finally {
            setDeletingOnboarding(false);
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
                            {adminProgressPercentage}%
                        </strong>
                        <span className={styles.progressText}>
                            {adminCompletedSteps} מתוך {manageableSteps.length} שלבים
                        </span>
                    </div>
                </section>

                <div className={styles.feedback} aria-live="polite" aria-atomic="true">
                    {notice && <span className={styles.notice}>{notice}</span>}
                    {error && <span className={styles.error} role="alert">{error}</span>}
                </div>

                <section className={styles.reviewOverview} aria-labelledby="review-overview-title">
                    <div className={styles.reviewOverviewHeading}>
                        <div>
                            <span className={styles.eyebrow}>בדיקת התיק</span>
                            <h2 className={styles.sectionTitle} id="review-overview-title">מה התקבל ומה חסר?</h2>
                        </div>
                        <span className={styles.reviewOverviewHint}>לחצי על חלק כדי לעבור אליו</span>
                    </div>
                    <div className={styles.reviewOverviewGrid}>
                        {reviewChecklist.map((item) => (
                            <button
                                className={`${styles.reviewOverviewItem} ${item.status === "completed" || item.status === "notRequired" ? styles.reviewOverviewItemComplete : item.status === "requiresCorrection" ? styles.reviewOverviewItemCorrection : item.status === "pendingReview" ? styles.reviewOverviewItemReview : ""}`}
                                key={item.key}
                                type="button"
                                onClick={() => scrollToCaseSection(item.target)}
                            >
                                <span>{item.title}</span>
                                <strong>{onboardingStepStatusLabels[item.status]}</strong>
                            </button>
                        ))}
                    </div>
                </section>

                <section className={styles.nextActionCard} aria-labelledby="next-action-title">
                    <div className={styles.nextActionMarker} aria-hidden="true">✓</div>
                    <div className={styles.nextActionCopy}>
                        <span className={styles.eyebrow}>מה צריך לעשות עכשיו?</span>
                        <h2 className={styles.nextActionTitle} id="next-action-title">
                            {allDocumentsSubmitted && !allDocumentsApproved
                                ? "אישור כל הפרטים והמסמכים"
                                : nextStep
                                  ? nextStep.title
                                  : "כל שלבי ההרשמה הושלמו"}
                        </h2>
                        <p className={styles.nextActionText}>
                            {allDocumentsSubmitted && !allDocumentsApproved
                                ? "כל הטפסים הוגשו. עברי עליהם ואשרי את כולם יחד באזור הבדיקה המרוכזת."
                                : nextStep
                                ? nextStep.responsibleParty === "parent" && nextStep.status === "notStarted"
                                    ? `ממתינים להורה: ${nextStep.description ?? nextStep.title}`
                                    : stepGuidance[nextStep.key] ?? nextStep.description
                                : "לא נדרשת כרגע פעולה נוספת. אפשר לעבור על הפרטים ולוודא שהמשפחה קיבלה אישור."}
                        </p>
                        {nextStep ? (
                            <div className={styles.nextActionMeta}>
                                <span>{onboardingStepStatusLabels[nextStep.status]}</span>
                                <span>{onboardingResponsiblePartyLabels[nextStep.responsibleParty]}</span>
                            </div>
                        ) : null}
                        {(allDocumentsSubmitted && !allDocumentsApproved) || nextStep ? (
                            <button
                                className={styles.primaryButton}
                                type="button"
                                onClick={() => scrollToCaseSection(
                                    allDocumentsSubmitted && !allDocumentsApproved
                                        ? "documents-approval"
                                        : nextStep?.key === "childAndGuardianDetails"
                                          ? "profile-details"
                                          : nextStep?.key === "agreementSigned"
                                            ? "agreement-review"
                                            : nextStep?.key === "healthDeclarationSubmitted"
                                              ? "health-declaration"
                                              : nextStep?.key === "pickupAuthorizationSubmitted"
                                                ? "pickup-authorization"
                                                : "payment-and-placement"
                                )}
                            >
                                מעבר לפעולה
                            </button>
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
                        {onboarding.origin?.type === "daycareRegistration" ? (
                            <div className={styles.deleteCaseArea}>
                                <h3>מחיקת תיק בדיקה</h3>
                                <p>
                                    הפעולה תמחק את התיק, המסמכים והשלבים שלו. טופס הרישום,
                                    המשפחה והילד יישארו שמורים, ותוכלי לפתוח מהם תיק חדש בלי
                                    ליצור כפילות.
                                </p>
                                <button
                                    className={styles.dangerButton}
                                    type="button"
                                    disabled={deletingOnboarding || isDirty}
                                    onClick={() => setDeleteConfirmationOpen(true)}
                                >
                                    מחיקת תיק הבדיקה
                                </button>
                                {isDirty ? (
                                    <p className={styles.helperText}>
                                        יש לשמור או לבטל את השינויים הפתוחים לפני המחיקה.
                                    </p>
                                ) : null}
                            </div>
                        ) : null}
                    </details>

                    <div className={`${styles.controlCard} ${styles.caseSectionAnchor}`} id="profile-details">
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
                        {profileReviewStep?.status === "pendingReview" ||
                        profileReviewStep?.status === "completed" ? (
                            <details className={styles.correctionPanel}>
                                <summary className={styles.correctionSummary}>יש טעות בפרטי המשפחה?</summary>
                                <label className={styles.fieldLabel} htmlFor="profile-parent-message">
                                    מה ההורה צריך לתקן בפרטים?
                                </label>
                                <textarea
                                    className={styles.textarea}
                                    id="profile-parent-message"
                                    value={profileMessage}
                                    onChange={(event) => setProfileMessage(event.target.value)}
                                />
                                <button
                                    className={styles.dangerButton}
                                    type="button"
                                    disabled={reviewingProfile || !profileMessage.trim()}
                                    onClick={() => void handleProfileCorrection()}
                                >
                                    {reviewingProfile
                                        ? "פותח לתיקון..."
                                        : profileReviewStep.status === "completed"
                                          ? "פתיחה מחדש לתיקון"
                                          : "דרישת תיקון"}
                                </button>
                            </details>
                        ) : profileReviewStep?.status === "requiresCorrection" ? (
                            <p className={styles.helperText}>הפרטים פתוחים כעת לתיקון אצל ההורה.</p>
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

                <section className={`${styles.agreementReviewCard} ${styles.caseSectionAnchor}`} id="agreement-review">
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
                                גרסת הסכם {agreementData.publishedVersion.version} · הגשה {agreementData.agreement.revision} · אופן חתימה: {agreementData.agreement.signingMethod === "online" ? "מקוון" : "PDF חתום"} · סטטוס: {onboardingStepStatusLabels[agreementData.agreement.status]}
                            </p>
                            {agreementData.agreement.signedBy ? (
                                <p className={styles.helperText}>
                                    החותם/ת: {agreementData.agreement.signedBy} ({guardianRoleLabels[agreementData.agreement.signerRole ?? ""] ?? agreementData.agreement.signerRole})
                                </p>
                            ) : null}
                            {agreementData.agreement.signedAt ? (
                                <p className={styles.helperText}>{agreementData.agreement.signingMethod === "online" ? "נחתם באתר" : "הקובץ הועלה"} ב־{formatDateTime(agreementData.agreement.signedAt)}</p>
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
                            {agreementData.agreement.status === "requiresCorrection" ? (
                                <p className={styles.helperText}>{agreementData.agreement.correctionDisposition === "discardFileAfterReplacement" ? "ההסכם פתוח להעלאה מחדש. הקובץ השגוי יימחק רק לאחר שהגרסה החלופית תישמר בהצלחה." : "ההסכם פתוח כעת לחתימה או להעלאה מחדש. הגרסה הקודמת תישמר בתיק כגרסה לא־פעילה."}</p>
                            ) : (
                                <details className={styles.correctionPanel}>
                                    <summary className={styles.correctionSummary}>ההסכם אינו תקין או שצריך לעדכן אותו?</summary>
                                    {agreementData.agreement.status === "completed" ? (
                                        <p className={styles.helperText}>ההסכם נבדק ואושר. פתיחה לתיקון תשמור את הגרסה הזו ותבקש מההורה חתימה חדשה.</p>
                                    ) : (
                                        <p className={styles.helperText}>ההסכם הוגש ויאושר יחד עם שאר הפרטים והמסמכים.</p>
                                    )}
                                    <label className={styles.fieldLabel} htmlFor="agreement-parent-message">מה ההורה צריך לתקן בהסכם?</label>
                                    <textarea className={styles.textarea} id="agreement-parent-message" value={agreementMessage} onChange={(event) => setAgreementMessage(event.target.value)} />
                                    {agreementData.agreement.signingMethod === "uploadedPdf" ? (
                                        <label className={styles.fieldLabel} htmlFor="agreement-correction-disposition">
                                            מה לעשות עם הקובץ הקודם לאחר שתוגש גרסה חדשה?
                                            <select className={styles.select} id="agreement-correction-disposition" value={agreementCorrectionDisposition} onChange={(event) => setAgreementCorrectionDisposition(event.target.value as DaycareCorrectionDisposition | "")}>
                                                <option value="">יש לבחור</option>
                                                <option value="discardFileAfterReplacement">הקובץ לא תקין — למחוק לאחר ההחלפה</option>
                                                <option value="preserveVersion">עדכון פרטים — לשמור כגרסה קודמת</option>
                                            </select>
                                        </label>
                                    ) : (
                                        <p className={styles.helperText}>ההסכם נחתם באתר ולכן הגרסה הקודמת תישמר כגרסה לא־פעילה.</p>
                                    )}
                                    <div className={styles.linkActions}>
                                        <button className={styles.dangerButton} type="button" disabled={reviewingAgreement || !agreementMessage.trim() || (agreementData.agreement.signingMethod === "uploadedPdf" && !agreementCorrectionDisposition)} onClick={() => void handleAgreementReview("requiresCorrection")}>
                                            {reviewingAgreement ? "פותח לתיקון..." : agreementData.agreement.status === "completed" ? "פתיחה מחדש לתיקון" : "דרישת תיקון"}
                                        </button>
                                    </div>
                                </details>
                            )}
                        </>
                    ) : <p className={styles.helperText}>{agreementData?.publishedVersion ? "ההסכם פורסם, אך ההורה עדיין לא שלח חתימה או PDF חתום." : `עדיין לא פורסם הסכם לשנת ${onboarding.schoolYear}.`}</p>}
                </section>

                <section className={`${styles.agreementReviewCard} ${styles.healthDeclarationCard} ${styles.caseSectionAnchor}`} id="health-declaration">
                    <div>
                        <span className={styles.eyebrow}>הצהרת בריאות</span>
                        <h2 className={styles.controlTitle}>בדיקת מידע רפואי וחתימה</h2>
                    </div>
                    {healthDeclaration ? (
                        <>
                            <p className={styles.helperText}>גרסה {healthDeclaration.revision} · {healthDeclaration.signingMethod === "uploadedFile" ? "טופס חתום ידנית" : "נחתם באתר"} · סטטוס: {onboardingStepStatusLabels[healthDeclaration.status]} · הוגש ב־{formatDateTime(healthDeclaration.submittedAt)}</p>
                            {healthDeclaration.payload ? <div className={styles.detailsGrid}>
                                <p><strong>מצב בריאותי:</strong> {healthDeclaration.payload.healthCondition}</p>
                                <p><strong>רגישויות לתרופות:</strong> {healthDeclaration.payload.medicationSensitivities}</p>
                                <p><strong>קופת חולים:</strong> {healthDeclaration.payload.healthFund}</p>
                                <p><strong>אלרגיות:</strong> {healthDeclaration.payload.hasAllergies ? healthDeclaration.payload.allergyDetails : "אין אלרגיה או רגישות ידועה"}</p>
                                {healthDeclaration.payload.hasAllergies ? <p><strong>הנחיות במקרה חשיפה:</strong> {healthDeclaration.payload.exposureInstructions}</p> : null}
                                <p><strong>החותם/ת:</strong> {healthDeclaration.payload.signedBy} ({guardianRoleLabels[healthDeclaration.payload.signerRole]})</p>
                            </div> : <p className={styles.helperText}>המידע מולא בטופס הידני. יש לפתוח את הקובץ החתום ולבדוק את הפרטים.</p>}
                            <div className={styles.linkActions}><button className={styles.secondaryButton} type="button" onClick={() => void handleHealthDownload()}>הורדת הצהרה חתומה</button></div>
                            {healthDeclaration.status !== "requiresCorrection" ? <details className={styles.correctionPanel}>
                                <summary className={styles.correctionSummary}>ההצהרה אינה תקינה או שצריך לעדכן אותה?</summary>
                                <label className={styles.fieldLabel} htmlFor="health-parent-message">מה ההורה צריך לתקן בהצהרת הבריאות?</label>
                                <textarea className={styles.textarea} id="health-parent-message" value={healthMessage} onChange={(event) => setHealthMessage(event.target.value)} />
                                {healthDeclaration.signingMethod === "uploadedFile" ? <label className={styles.fieldLabel} htmlFor="health-correction-disposition">
                                    מה לעשות עם הקובץ הקודם לאחר שתוגש גרסה חדשה?
                                    <select className={styles.select} id="health-correction-disposition" value={healthCorrectionDisposition} onChange={(event) => setHealthCorrectionDisposition(event.target.value as DaycareCorrectionDisposition | "")}>
                                        <option value="">יש לבחור</option>
                                        <option value="discardFileAfterReplacement">הקובץ לא תקין — למחוק לאחר ההחלפה</option>
                                        <option value="preserveVersion">עדכון פרטים — לשמור כגרסה קודמת</option>
                                    </select>
                                </label> : <p className={styles.helperText}>ההצהרה נחתמה באתר ולכן הגרסה הקודמת תישמר כגרסה לא־פעילה.</p>}
                                <div className={styles.linkActions}>
                                    <button className={styles.dangerButton} type="button" disabled={reviewingHealth || !healthMessage.trim() || (healthDeclaration.signingMethod === "uploadedFile" && !healthCorrectionDisposition)} onClick={() => void handleHealthReview("requiresCorrection")}>
                                        {reviewingHealth ? "פותח לתיקון..." : healthDeclaration.status === "completed" ? "פתיחה מחדש לתיקון" : "דרישת תיקון"}
                                    </button>
                                </div>
                            </details> : <p className={styles.helperText}>{healthDeclaration.correctionDisposition === "discardFileAfterReplacement" ? "ההצהרה פתוחה לתיקון. הקובץ השגוי יימחק רק לאחר שהגרסה החלופית תישמר בהצלחה." : "ההצהרה פתוחה לתיקון אצל ההורה. הגרסה הקודמת תישמר בתיק כגרסה לא־פעילה."}</p>}
                        </>
                    ) : <p className={styles.helperText}>ההורה עדיין לא הגיש הצהרת בריאות.</p>}
                </section>

                <section className={`${styles.agreementReviewCard} ${styles.healthDeclarationCard} ${styles.caseSectionAnchor}`} id="pickup-authorization">
                    <div><span className={styles.eyebrow}>מורשי איסוף</span><h2 className={styles.controlTitle}>בדיקת מורשים וחתימה</h2></div>
                    {pickupAuthorization ? <>
                        <p className={styles.helperText}>גרסה {pickupAuthorization.revision} · {pickupAuthorization.signingMethod === "uploadedFile" ? "טופס חתום ידנית" : "נחתם באתר"} · סטטוס: {onboardingStepStatusLabels[pickupAuthorization.status]} · הוגש ב־{formatDateTime(pickupAuthorization.submittedAt)}</p>
                        {pickupAuthorization.payload ? <>
                            <h3 className={styles.auditTitle}>הורים ואפוטרופוסים</h3>
                            <div className={styles.detailsGrid}>{pickupAuthorization.payload.guardians.map((guardian) => <p key={`${guardian.fullName}-${guardian.phone}`}><strong>{guardian.fullName}</strong><br />{guardian.roleDetails || guardianRoleLabels[guardian.role] || guardian.role} · {guardian.phone}</p>)}</div>
                            <h3 className={styles.auditTitle}>מורשים נוספים</h3>
                            {pickupAuthorization.payload.collectors.length > 0 ? <div className={styles.detailsGrid}>{pickupAuthorization.payload.collectors.map((collector) => <p key={`${collector.fullName}-${collector.israeliId}`}><strong>{collector.fullName}</strong><br />קרבה: {collector.relationship} · טלפון: {collector.phone}<br />ת״ז: {collector.israeliId}</p>)}</div> : <p className={styles.helperText}>לא נוספו מורשי איסוף נוספים.</p>}
                            <p className={styles.helperText}>החותם/ת: {pickupAuthorization.payload.signedBy} ({guardianRoleLabels[pickupAuthorization.payload.signerRole]})</p>
                        </> : <p className={styles.helperText}>הפרטים מולאו בטופס הידני. יש לפתוח את הקובץ החתום ולבדוק אותם.</p>}
                        <div className={styles.linkActions}><button className={styles.secondaryButton} type="button" onClick={() => void handlePickupDownload()}>הורדת טופס חתום</button></div>
                        {pickupAuthorization.status !== "requiresCorrection" ? <details className={styles.correctionPanel}>
                            <summary className={styles.correctionSummary}>הטופס אינו תקין או שצריך לעדכן אותו?</summary>
                            <label className={styles.fieldLabel} htmlFor="pickup-parent-message">מה ההורה צריך לתקן במורשי האיסוף?</label>
                            <textarea className={styles.textarea} id="pickup-parent-message" value={pickupMessage} onChange={(event) => setPickupMessage(event.target.value)} />
                            {pickupAuthorization.signingMethod === "uploadedFile" ? <label className={styles.fieldLabel} htmlFor="pickup-correction-disposition">
                                מה לעשות עם הקובץ הקודם לאחר שתוגש גרסה חדשה?
                                <select className={styles.select} id="pickup-correction-disposition" value={pickupCorrectionDisposition} onChange={(event) => setPickupCorrectionDisposition(event.target.value as DaycareCorrectionDisposition | "")}>
                                    <option value="">יש לבחור</option>
                                    <option value="discardFileAfterReplacement">הקובץ לא תקין — למחוק לאחר ההחלפה</option>
                                    <option value="preserveVersion">עדכון פרטים — לשמור כגרסה קודמת</option>
                                </select>
                            </label> : <p className={styles.helperText}>הטופס נחתם באתר ולכן הגרסה הקודמת תישמר כגרסה לא־פעילה.</p>}
                            <div className={styles.linkActions}><button className={styles.dangerButton} type="button" disabled={reviewingPickup || !pickupMessage.trim() || (pickupAuthorization.signingMethod === "uploadedFile" && !pickupCorrectionDisposition)} onClick={() => void handlePickupReview("requiresCorrection")}>{reviewingPickup ? "פותח לתיקון..." : pickupAuthorization.status === "completed" ? "פתיחה מחדש לתיקון" : "דרישת תיקון"}</button></div>
                        </details> : <p className={styles.helperText}>{pickupAuthorization.correctionDisposition === "discardFileAfterReplacement" ? "הטופס פתוח לתיקון. הקובץ השגוי יימחק רק לאחר שהגרסה החלופית תישמר בהצלחה." : "הטופס פתוח לתיקון אצל ההורה. הגרסה הקודמת תישמר בתיק כגרסה לא־פעילה."}</p>}
                    </> : <p className={styles.helperText}>ההורה עדיין לא הגיש מורשי איסוף.</p>}
                </section>

                {allDocumentsSubmitted ? (
                    <section className={`${styles.nextActionCard} ${styles.caseSectionAnchor}`} id="documents-approval" aria-labelledby="documents-approval-title">
                        <div className={styles.nextActionMarker} aria-hidden="true">✓</div>
                        <div className={styles.nextActionCopy}>
                            <span className={styles.eyebrow}>בדיקה מרוכזת</span>
                            <h2 className={styles.nextActionTitle} id="documents-approval-title">
                                {allDocumentsApproved
                                    ? "כל הפרטים והמסמכים אושרו"
                                    : "אישור כל הפרטים והמסמכים"}
                            </h2>
                            <p className={styles.nextActionText}>
                                {allDocumentsApproved
                                    ? "השלב הבא הוא הסדרת התשלום."
                                    : "לאחר שעברת על פרטי הילד, ההסכם, הצהרת הבריאות ומורשי האיסוף — אשרי את כולם בפעולה אחת."}
                            </p>
                            {!allDocumentsApproved ? (
                                <button
                                    className={styles.primaryButton}
                                    type="button"
                                    disabled={reviewingAllDocuments}
                                    onClick={() => void handleApproveAllDocuments()}
                                >
                                    {reviewingAllDocuments
                                        ? "מאשר את כל המסמכים..."
                                        : "אישור כל הפרטים והמסמכים"}
                                </button>
                            ) : null}
                        </div>
                    </section>
                ) : null}

                <section className={`${styles.stepsSection} ${styles.caseSectionAnchor}`} id="payment-and-placement">
                    <div className={styles.sectionHeading}>
                        <div>
                            <span className={styles.eyebrow}>לאחר אישור המסמכים</span>
                            <h2 className={styles.sectionTitle}>תשלום ושיבוץ</h2>
                        </div>
                        <span className={styles.dirtySummary}>
                            {isDirty ? `${dirtyStepKeys.size} שלבים עם שינויים שלא נשמרו` : "כל השינויים שמורים"}
                        </span>
                    </div>

                    <div className={styles.stepsList}>
                        {operationalSteps.map((step) => {
                            const draft = drafts[step.key] ?? createStepDraft(step);
                            const isStepDirty = dirtyStepKeys.has(step.key);
                            const isSaving = savingStepKey === step.key;
                            const agreementStatusManaged = step.key === "agreementSigned";
                            const healthStatusManaged = step.key === "healthDeclarationSubmitted";
                            const pickupStatusManaged = step.key === "pickupAuthorizationSubmitted";
                            const profileStatusManaged = step.key === "childAndGuardianDetails";
                            const recordStatusManaged = agreementStatusManaged || healthStatusManaged || pickupStatusManaged;
                            const bundleStatusManaged = profileStatusManaged || recordStatusManaged;
                            const profileAwaitingReview =
                                step.key === "childAndGuardianDetails" &&
                                draft.status === "pendingReview";
                            const adminCanUpdateStatus =
                                step.responsibleParty === "admin" ||
                                step.responsibleParty === "both" ||
                                profileAwaitingReview;
                            const parentStatusManaged =
                                step.responsibleParty === "parent" &&
                                !profileAwaitingReview;
                            const statusManaged = bundleStatusManaged || parentStatusManaged;
                            const paymentStep = operationalSteps.find((candidate) => candidate.key === "registrationFeeReceived");
                            const operationalBlockedReason = step.key === "registrationFeeReceived" && !allDocumentsApproved
                                ? "זמין לאחר אישור כל הפרטים והמסמכים"
                                : step.key === "registrationApproved" && !isStepComplete(paymentStep?.status ?? "notStarted")
                                  ? "זמין לאחר אישור הסדר התשלום"
                                  : "";

                            return (
                                <article className={styles.stepCard} key={step.key}>
                                    <div className={styles.stepHeader}>
                                        <span className={styles.stepNumber}>{step.order}</span>
                                        <div className={styles.stepHeadingCopy}>
                                            <h3 className={styles.stepTitle}>{step.title}</h3>
                                            <p className={styles.stepDescription}>
                                                {onboardingResponsiblePartyLabels[draft.responsibleParty]}
                                            </p>
                                        </div>
                                        <span className={styles.statusBadge}>
                                            {onboardingStepStatusLabels[draft.status]}
                                        </span>
                                    </div>

                                    <div className={styles.stepMeta}>
                                        <span>עודכן: {formatDate(step.updatedAt)}</span>
                                        <span>על ידי: {step.updatedBy || "מערכת"}</span>
                                    </div>

                                    {nextStep?.key === step.key ? (
                                        <p className={styles.stepGuidance}>
                                            {step.responsibleParty === "parent" && draft.status === "notStarted"
                                                ? `ממתינים להורה: ${step.description ?? step.title}`
                                                : stepGuidance[step.key] ?? step.description}
                                        </p>
                                    ) : null}

                                    {bundleStatusManaged ? (
                                        <p className={styles.managedStepNote}>
                                            {draft.status === "notStarted"
                                                ? "ממתין להגשה של ההורה."
                                                : draft.status === "completed"
                                                  ? "השלב אושר במסגרת האישור המרוכז."
                                                  : "השלב יאושר יחד עם כל הפרטים והמסמכים."}
                                        </p>
                                    ) : adminCanUpdateStatus ? <div className={styles.stepActions}>
                                        {!isStepComplete(draft.status) ? (
                                            <button
                                                className={styles.primaryButton}
                                                type="button"
                                                disabled={isSaving || Boolean(operationalBlockedReason)}
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
                                                {isSaving
                                                    ? "שומר..."
                                                    : operationalBlockedReason
                                                      ? operationalBlockedReason
                                                    : completeActionLabel({
                                                          ...step,
                                                          status: draft.status,
                                                      })}
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
                                    </div> : (
                                        <p className={styles.managedStepNote}>
                                            {draft.status === "pendingReview"
                                                ? "השלב ממתין לבדיקה של צוות המעון."
                                                : "השלב באחריות ההורה ואין צורך לעדכן אותו ידנית."}
                                        </p>
                                    )}

                                    <details className={styles.advancedStepEditor}>
                                        <summary className={styles.advancedStepSummary}>
                                            אפשרויות מתקדמות, הערות ותיקונים
                                        </summary>
                                        <div className={styles.editorGrid}>
                                        <label className={styles.fieldLabel}>
                                            סטטוס
                                            <select
                                                className={styles.select}
                                                disabled={statusManaged}
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
                                                disabled={statusManaged}
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
                                            disabled={isSaving || statusManaged}
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

            <BaseDialog
                open={freshLinkDialogOpen && Boolean(freshParentLink)}
                title="התיק נפתח — הקישור להורה מוכן"
                maxWidth={640}
                onClose={() => setFreshLinkDialogOpen(false)}
            >
                <p className={dialogStyles.text}>
                    העתיקי עכשיו את הקישור ושמרי או שלחי אותו להורה. מטעמי אבטחה,
                    לאחר רענון העמוד לא ניתן יהיה להציג שוב את אותו קישור.
                </p>
                <label className={styles.freshLinkDialogField} htmlFor="fresh-parent-link-dialog">
                    הקישור האישי
                    <input
                        id="fresh-parent-link-dialog"
                        type="text"
                        value={freshParentLink}
                        readOnly
                        dir="ltr"
                        onFocus={(event) => event.currentTarget.select()}
                    />
                </label>
                <div className={dialogStyles.actions}>
                    <button
                        className={dialogStyles.cta}
                        type="button"
                        onClick={() => void copyParentLink()}
                    >
                        העתקת הקישור
                    </button>
                    <button
                        className={dialogStyles.ghost}
                        type="button"
                        onClick={() => setFreshLinkDialogOpen(false)}
                    >
                        שמרתי, סגירה
                    </button>
                </div>
            </BaseDialog>

            <ConfirmDialog
                key={deleteConfirmationOpen ? "delete-open" : "delete-closed"}
                open={deleteConfirmationOpen}
                title="מחיקת תיק הבדיקה"
                message={
                    <>
                        <strong>הפעולה אינה ניתנת לביטול.</strong>
                        <br />
                        התיק, ההסכם, הצהרת הבריאות, מורשי האיסוף והיסטוריית התיק יימחקו.
                        טופס הרישום ופרטי המשפחה והילד יישארו, כדי שתוכלי לפתוח תיק חדש.
                    </>
                }
                confirmLabel="מחיקת התיק"
                tone="danger"
                busy={deletingOnboarding}
                confirmationPhrase="מחיקת תיק"
                confirmationLabel="כדי לאשר, הקלידי בדיוק: מחיקת תיק"
                onConfirm={() => void handleDeleteOnboarding()}
                onClose={() => setDeleteConfirmationOpen(false)}
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
