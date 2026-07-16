import { useEffect, useMemo, useState } from "react";
import {
    useBlocker,
    useLocation,
    useNavigate,
    useParams,
} from "react-router-dom";
import Container from "../../../components/Container/Container";
import {
    deleteAdminDaycareOnboarding,
    getAdminDaycareOnboarding,
    regenerateAdminOnboardingLink,
    updateAdminOnboardingAccess,
    updateAdminOnboardingOverallStatus,
    updateAdminOnboardingStep,
} from "../../../services/daycareOnboardingService";
import {
    type AdminDaycareOnboarding,
    type OnboardingOverallStatus,
} from "../../../types/daycareOnboarding";
import DocumentReviewSections from "./components/DocumentReviewSections";
import OnboardingControls from "./components/OnboardingControls";
import OnboardingDialogs from "./components/OnboardingDialogs";
import OnboardingOverview from "./components/OnboardingOverview";
import OperationalStepsSection from "./components/OperationalStepsSection";
import {
    createDraftMap,
    createStepDraft,
    isStepComplete,
    type LocationState,
    type StepDraft,
} from "./daycareOnboardingAdminUtils";
import useOnboardingDocumentReview from "./useOnboardingDocumentReview";
import styles from "./DaycareOnboardingAdmin.module.scss";

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
    const [profileMessage, setProfileMessage] = useState("");
    const [reviewingProfile, setReviewingProfile] = useState(false);
    const {
        agreementData, agreementMessage, setAgreementMessage,
        agreementCorrectionDisposition, setAgreementCorrectionDisposition, reviewingAgreement,
        handleAgreementReview, handleAgreementDownload, healthDeclaration, healthMessage,
        setHealthMessage, healthCorrectionDisposition, setHealthCorrectionDisposition, reviewingHealth,
        handleHealthReview, handleHealthDownload, pickupAuthorization, pickupMessage,
        setPickupMessage, pickupCorrectionDisposition, setPickupCorrectionDisposition, reviewingPickup,
        handlePickupReview, handlePickupDownload, reviewingAllDocuments, handleApproveAllDocuments,
    } = useOnboardingDocumentReview({
        id, onboarding, setOnboarding, setDrafts, setError, setNotice,
    });
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

                <OnboardingOverview
                    onboarding={onboarding}
                    adminProgressPercentage={adminProgressPercentage}
                    adminCompletedSteps={adminCompletedSteps}
                    manageableStepCount={manageableSteps.length}
                    notice={notice}
                    error={error}
                    reviewChecklist={reviewChecklist}
                    allDocumentsSubmitted={allDocumentsSubmitted}
                    allDocumentsApproved={allDocumentsApproved}
                    nextStep={nextStep}
                    scrollToCaseSection={scrollToCaseSection}
                />

                <OnboardingControls
                    onboarding={onboarding}
                    updatingOverallStatus={updatingOverallStatus}
                    handleOverallStatusChange={handleOverallStatusChange}
                    deletingOnboarding={deletingOnboarding}
                    isDirty={isDirty}
                    setDeleteConfirmationOpen={setDeleteConfirmationOpen}
                    profileReviewStep={profileReviewStep}
                    profileMessage={profileMessage}
                    setProfileMessage={setProfileMessage}
                    reviewingProfile={reviewingProfile}
                    handleProfileCorrection={handleProfileCorrection}
                    updatingAccess={updatingAccess}
                    setLinkConfirmation={setLinkConfirmation}
                    freshParentLink={freshParentLink}
                    copyParentLink={copyParentLink}
                />

                <DocumentReviewSections
                    onboarding={onboarding}
                    agreementData={agreementData}
                    agreementMessage={agreementMessage}
                    setAgreementMessage={setAgreementMessage}
                    agreementCorrectionDisposition={agreementCorrectionDisposition}
                    setAgreementCorrectionDisposition={setAgreementCorrectionDisposition}
                    reviewingAgreement={reviewingAgreement}
                    handleAgreementReview={handleAgreementReview}
                    handleAgreementDownload={handleAgreementDownload}
                    healthDeclaration={healthDeclaration}
                    healthMessage={healthMessage}
                    setHealthMessage={setHealthMessage}
                    healthCorrectionDisposition={healthCorrectionDisposition}
                    setHealthCorrectionDisposition={setHealthCorrectionDisposition}
                    reviewingHealth={reviewingHealth}
                    handleHealthReview={handleHealthReview}
                    handleHealthDownload={handleHealthDownload}
                    pickupAuthorization={pickupAuthorization}
                    pickupMessage={pickupMessage}
                    setPickupMessage={setPickupMessage}
                    pickupCorrectionDisposition={pickupCorrectionDisposition}
                    setPickupCorrectionDisposition={setPickupCorrectionDisposition}
                    reviewingPickup={reviewingPickup}
                    handlePickupReview={handlePickupReview}
                    handlePickupDownload={handlePickupDownload}
                    allDocumentsSubmitted={allDocumentsSubmitted}
                    allDocumentsApproved={allDocumentsApproved}
                    reviewingAllDocuments={reviewingAllDocuments}
                    handleApproveAllDocuments={handleApproveAllDocuments}
                />

                <OperationalStepsSection
                    operationalSteps={operationalSteps}
                    drafts={drafts}
                    dirtyStepKeys={dirtyStepKeys}
                    savingStepKey={savingStepKey}
                    allDocumentsApproved={allDocumentsApproved}
                    isDirty={isDirty}
                    nextStep={nextStep}
                    updateDraft={updateDraft}
                    saveStep={saveStep}
                />

            </Container>

            <OnboardingDialogs
                linkConfirmation={linkConfirmation}
                setLinkConfirmation={setLinkConfirmation}
                handleAccessChange={handleAccessChange}
                handleRegenerateLink={handleRegenerateLink}
                freshLinkDialogOpen={freshLinkDialogOpen}
                freshParentLink={freshParentLink}
                setFreshLinkDialogOpen={setFreshLinkDialogOpen}
                copyParentLink={copyParentLink}
                deleteConfirmationOpen={deleteConfirmationOpen}
                deletingOnboarding={deletingOnboarding}
                handleDeleteOnboarding={handleDeleteOnboarding}
                setDeleteConfirmationOpen={setDeleteConfirmationOpen}
                blocker={blocker}
            />
        </main>
    );
};

export default DaycareOnboardingAdmin;
