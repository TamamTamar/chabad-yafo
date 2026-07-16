import axios from "axios";
import { Link2Off, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import DaycareLogo from "../../components/DaycareLogo/DaycareLogo";
import {
    getPublicDaycareOnboarding,
    submitPublicDaycareOnboarding,
    submitPublicDaycareProfile,
} from "../../services/daycareOnboardingService";
import type { PublicDaycareOnboarding } from "../../types/daycareOnboarding";
import styles from "./DaycareOnboarding.module.scss";
import OnboardingProgress from "./components/OnboardingProgress";
import OnboardingStepCard from "./components/OnboardingStepCard";
import IdentityProfileForm from "./components/IdentityProfileForm";
import AgreementSection from "./components/AgreementSection";
import HealthDeclarationSection from "./components/HealthDeclarationSection";
import PickupAuthorizationSection from "./components/PickupAuthorizationSection";

type PageState =
    | { status: "loading" }
    | { status: "ready"; onboarding: PublicDaycareOnboarding }
    | { status: "invalid" }
    | { status: "rateLimited" }
    | { status: "error" };

type CollapsibleSavedStepProps = {
    children: ReactNode;
    isSaved: boolean;
    title: string;
};

const CollapsibleSavedStep = ({ children, isSaved, title }: CollapsibleSavedStepProps) => {
    if (!isSaved) return children;

    return (
        <details className={styles.savedStepDetails}>
            <summary className={styles.savedStepSummary}>
                <span className={styles.savedStepTitle}>{title}</span>
                <span className={styles.savedStepHint}>נשמר · לחצו לפתיחה ועריכה</span>
            </summary>
            <div className={styles.savedStepContent}>{children}</div>
        </details>
    );
};

const setPrivateMetaTag = (name: string, content: string) => {
    const existingMeta = document.querySelector<HTMLMetaElement>(
        `meta[name="${name}"]`
    );
    const previousContent = existingMeta?.getAttribute("content");
    const meta = existingMeta ?? document.createElement("meta");

    meta.setAttribute("name", name);
    meta.setAttribute("content", content);

    if (!existingMeta) {
        document.head.appendChild(meta);
    }

    return () => {
        if (!existingMeta) {
            meta.remove();
            return;
        }

        if (previousContent === null || previousContent === undefined) {
            existingMeta.removeAttribute("content");
            return;
        }

        existingMeta.setAttribute("content", previousContent);
    };
};

const usePrivatePageMetadata = () => {
    useEffect(() => {
        const previousTitle = document.title;
        document.title = "מסלול ההצטרפות למעון | חב״ד יפו";

        const restoreRobots = setPrivateMetaTag("robots", "noindex, nofollow");
        const restoreReferrer = setPrivateMetaTag("referrer", "no-referrer");

        return () => {
            document.title = previousTitle;
            restoreReferrer();
            restoreRobots();
        };
    }, []);
};

const getErrorState = (error: unknown): PageState => {
    if (!axios.isAxiosError(error)) {
        return { status: "error" };
    }

    const responseStatus = error.response?.status;

    if (
        responseStatus === 401 ||
        responseStatus === 403 ||
        responseStatus === 404 ||
        responseStatus === 410
    ) {
        return { status: "invalid" };
    }

    if (responseStatus === 429) {
        return { status: "rateLimited" };
    }

    return { status: "error" };
};

const DaycareOnboarding = () => {
    const { token } = useParams<{ token: string }>();
    const [retryCount, setRetryCount] = useState(0);
    const [pageState, setPageState] = useState<PageState>(() =>
        token?.trim() ? { status: "loading" } : { status: "invalid" }
    );
    const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
    const [profileError, setProfileError] = useState("");
    const [profileNotice, setProfileNotice] = useState("");
    const [isSubmittingBundle, setIsSubmittingBundle] = useState(false);
    const [bundleError, setBundleError] = useState("");

    usePrivatePageMetadata();

    useEffect(() => {
        const normalizedToken = token?.trim();

        if (!normalizedToken) {
            return;
        }

        const abortController = new AbortController();

        void getPublicDaycareOnboarding(
            normalizedToken,
            abortController.signal
        )
            .then((onboarding) => {
                setPageState({ status: "ready", onboarding });
            })
            .catch((error: unknown) => {
                if (!abortController.signal.aborted) {
                    setPageState(getErrorState(error));
                }
            });

        return () => {
            abortController.abort();
        };
    }, [retryCount, token]);

    const handleRetry = () => {
        setPageState({ status: "loading" });
        setRetryCount((currentCount) => currentCount + 1);
    };

    const handleProfileSubmit = async (
        profile: Parameters<typeof submitPublicDaycareProfile>[1]
    ) => {
        const normalizedToken = token?.trim();
        if (!normalizedToken) return;

        setIsSubmittingProfile(true);
        setProfileError("");
        setProfileNotice("");
        try {
            const updatedOnboarding = await submitPublicDaycareProfile(
                normalizedToken,
                profile
            );
            setPageState({ status: "ready", onboarding: updatedOnboarding });
            setProfileNotice("הפרטים נשמרו בהצלחה.");
        } catch (error: unknown) {
            const message = axios.isAxiosError<{ message?: string }>(error)
                ? error.response?.data?.message
                : undefined;
            setProfileError(
                message || "לא הצלחנו לשמור את הפרטים. בדקו את החיבור ונסו שוב."
            );
        } finally {
            setIsSubmittingProfile(false);
        }
    };

    const refreshOnboarding = async () => {
        const normalizedToken = token?.trim();
        if (!normalizedToken) return;
        try {
            const updated = await getPublicDaycareOnboarding(normalizedToken);
            setPageState({ status: "ready", onboarding: updated });
        } catch {
            // The current data remains visible when a background refresh fails.
        }
    };

    const handleFinalSubmit = async () => {
        const normalizedToken = token?.trim();
        if (!normalizedToken) return;

        setIsSubmittingBundle(true);
        setBundleError("");
        try {
            const updated = await submitPublicDaycareOnboarding(normalizedToken);
            setPageState({ status: "ready", onboarding: updated });
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (error: unknown) {
            const message = axios.isAxiosError<{ message?: string }>(error)
                ? error.response?.data?.message
                : undefined;
            setBundleError(
                message || "לא הצלחנו לשלוח את התיק לצוות המעון. נסו שוב."
            );
        } finally {
            setIsSubmittingBundle(false);
        }
    };

    if (pageState.status === "loading") {
        return (
            <main className={styles.page} dir="rtl">
                <section
                    className={styles.stateCard}
                    aria-live="polite"
                    aria-busy="true"
                >
                    <DaycareLogo />
                    <span className={styles.loadingSpinner} aria-hidden="true" />
                    <h1 className={styles.stateTitle}>טוענים את מסלול ההצטרפות</h1>
                    <p className={styles.stateText}>עוד רגע וכל הפרטים יוצגו כאן.</p>
                </section>
            </main>
        );
    }

    if (pageState.status !== "ready") {
        const isInvalidLink = pageState.status === "invalid";
        const isRateLimited = pageState.status === "rateLimited";

        return (
            <main className={styles.page} dir="rtl">
                <section className={styles.stateCard} role="alert">
                    <DaycareLogo />
                    <span className={styles.stateIcon} aria-hidden="true">
                        <Link2Off size={32} />
                    </span>
                    <h1 className={styles.stateTitle}>
                        {isInvalidLink
                            ? "הקישור האישי אינו זמין"
                            : isRateLimited
                              ? "בוצעו יותר מדי ניסיונות"
                              : "לא הצלחנו לטעון את המסלול"}
                    </h1>
                    <p className={styles.stateText}>
                        {isInvalidLink
                            ? "ייתכן שהקישור פג, בוטל או הוחלף. פנו לצוות המעון לקבלת קישור אישי חדש."
                            : isRateLimited
                              ? "מטעמי אבטחה הגישה הושהתה לזמן קצר. המתינו כמה דקות ונסו שוב."
                              : "בדקו את החיבור לאינטרנט ונסו שוב. אם הבעיה נמשכת, פנו לצוות המעון."}
                    </p>
                    {!isInvalidLink ? (
                        <button
                            className={styles.retryButton}
                            type="button"
                            onClick={handleRetry}
                        >
                            <RefreshCw size={18} aria-hidden="true" />
                            לנסות שוב
                        </button>
                    ) : null}
                </section>
            </main>
        );
    }

    const { onboarding } = pageState;
    const orderedSteps = [...onboarding.steps].sort(
        (firstStep, secondStep) => firstStep.order - secondStep.order
    );
    const nextStepTitle = onboarding.missingStepTitle;
    const profileStep = orderedSteps.find(
        (step) => step.key === "childAndGuardianDetails"
    );
    const canOpenAgreement =
        profileStep?.status === "pendingReview" ||
        profileStep?.status === "completed" ||
        profileStep?.status === "notRequired";
    const agreementStep = orderedSteps.find(
        (step) => step.key === "agreementSigned"
    );
    const canOpenHealthDeclaration =
        agreementStep?.status === "pendingReview" ||
        agreementStep?.status === "completed" ||
        agreementStep?.status === "notRequired";
    const healthStep = orderedSteps.find(
        (step) => step.key === "healthDeclarationSubmitted"
    );
    const pickupStep = orderedSteps.find(
        (step) => step.key === "pickupAuthorizationSubmitted"
    );
    const paymentStep = orderedSteps.find(
        (step) => step.key === "registrationFeeReceived"
    );
    const placementStep = orderedSteps.find(
        (step) => step.key === "registrationApproved"
    );
    const allDocumentsApproved = [
        profileStep,
        agreementStep,
        healthStep,
        pickupStep,
    ].every(
        (step) => step?.status === "completed" || step?.status === "notRequired"
    );
    const parentDocumentSteps = [
        profileStep,
        agreementStep,
        healthStep,
        pickupStep,
    ].filter((step): step is NonNullable<typeof step> => Boolean(step));
    const parentStageWasSubmitted = (step: (typeof parentDocumentSteps)[number]) =>
        step.status === "pendingReview" ||
        step.status === "completed" ||
        step.status === "notRequired";
    const fullProcessSteps = [
        ...parentDocumentSteps.map((step) => ({ step, isParentTask: true })),
        ...[paymentStep, placementStep]
            .filter((step): step is NonNullable<typeof step> => Boolean(step))
            .map((step) => ({ step, isParentTask: false })),
    ];
    const completedProcessSteps = fullProcessSteps.filter(({ step, isParentTask }) =>
        isParentTask
            ? parentStageWasSubmitted(step)
            : step.status === "completed" || step.status === "notRequired"
    ).length;
    const fullProcessProgress = {
        completedSteps: completedProcessSteps,
        totalSteps: fullProcessSteps.length,
        percentage:
            fullProcessSteps.length === 0
                ? 100
                : Math.round((completedProcessSteps / fullProcessSteps.length) * 100),
    };
    const currentParentStepIndex = parentDocumentSteps.findIndex(
        (step) => !parentStageWasSubmitted(step)
    );
    const revealedParentSteps =
        currentParentStepIndex >= 0
            ? parentDocumentSteps.slice(0, currentParentStepIndex + 1)
            : parentDocumentSteps;
    const revealedStepKeys = new Set(
        revealedParentSteps.map((step) => step.key)
    );

    if (allDocumentsApproved && paymentStep) {
        revealedStepKeys.add(paymentStep.key);
    }

    if (
        (paymentStep?.status === "completed" ||
            paymentStep?.status === "notRequired") &&
        placementStep
    ) {
        revealedStepKeys.add(placementStep.key);
    }

    const revealedSteps = orderedSteps.filter((step) =>
        revealedStepKeys.has(step.key)
    );
    const completedParentSteps = revealedSteps.filter((step) =>
        parentDocumentSteps.some((parentStep) => parentStep.key === step.key) &&
        parentStageWasSubmitted(step)
    );
    const activeRevealedSteps = revealedSteps.filter(
        (step) => !completedParentSteps.some((completedStep) => completedStep.key === step.key)
    );
    const parentWorkComplete = onboarding.progress.percentage === 100;
    const parentBundleSubmitted = onboarding.parentSubmission.isSubmitted;
    const waitingAdminStage = allDocumentsApproved && paymentStep?.status !== "completed" && paymentStep?.status !== "notRequired"
        ? {
              title: "ממתין להסדרת תשלום",
              text: "צוות המעון אישר את כל הפרטים והטפסים. נשארו עוד 2 משימות לצוות: הסדרת התשלום ושיבוץ בקבוצה.",
          }
        : allDocumentsApproved && placementStep?.status !== "completed" && placementStep?.status !== "notRequired"
          ? {
                title: "ממתין לשיבוץ בקבוצה",
                text: "התשלום אושר. נשארה עוד משימה אחת לצוות המעון: שיבוץ הילד/ה בקבוצה והשלמת הרישום.",
            }
          : null;
    const canOpenPickupAuthorization =
        healthStep?.status === "pendingReview" ||
        healthStep?.status === "completed" ||
        healthStep?.status === "notRequired";

    return (
        <main className={styles.page} dir="rtl">
            <div className={styles.pageShell}>
                <header className={styles.hero}>
                    <DaycareLogo />
                    <p className={styles.eyebrow}>
                        {onboarding.profileStatus === "complete"
                            ? `התיק האישי של ${onboarding.childName}`
                            : "תיק ההצטרפות שלכם"}{" "}
                        · שנת לימודים {onboarding.schoolYear}
                    </p>
                    <h1 className={styles.heroTitle}>
                        ברוכים הבאים למסלול ההצטרפות למעון חב״ד יפו
                    </h1>
                    <p className={styles.heroText}>
                        כאן תוכלו להשלים את הפרטים והמסמכים שנדרשים מכם ולעקוב
                        אחרי הטיפול של צוות המעון.
                    </p>
                </header>

                <OnboardingProgress
                    overallStatus={onboarding.overallStatus}
                    progress={fullProcessProgress}
                />

                {waitingAdminStage || (!parentBundleSubmitted && nextStepTitle) ? (
                    <aside className={styles.nextStepCard} aria-label="השלב הבא">
                        <span className={styles.nextStepLabel}>מה עכשיו?</span>
                        <strong className={styles.nextStepTitle}>
                            {waitingAdminStage?.title ?? nextStepTitle}
                        </strong>
                        <span className={styles.nextStepText}>
                            {waitingAdminStage?.text ??
                                "השלב הקודם נשמר. אפשר להמשיך עכשיו לשלב הבא."}
                        </span>
                    </aside>
                ) : parentBundleSubmitted ? (
                    <aside className={styles.finalSuccessCard} role="status">
                        <span className={styles.finalSuccessIcon} aria-hidden="true">✓</span>
                        <div>
                            <strong className={styles.finalSuccessTitle}>התהליך נשלח לצוות המעון</strong>
                            <p className={styles.finalSuccessText}>
                                סיימתם את שלב מילוי הפרטים והמסמכים. אפשר לצאת מהעמוד;
                                צוות המעון יעבור על התיק ויצור קשר אם יידרש תיקון.
                            </p>
                        </div>
                    </aside>
                ) : parentWorkComplete ? null : (
                    <aside
                        className={styles.completedCard}
                        aria-label={
                            onboarding.progress.percentage === 100
                                ? "ההרשמה הושלמה"
                                : "ממתין לבדיקת צוות המעון"
                        }
                    >
                        <strong className={styles.completedTitle}>
                            {onboarding.progress.percentage === 100
                                ? onboarding.overallStatus === "completed"
                                    ? "הרישום הושלם ואושר"
                                    : "כל מה שנדרש מכם הושלם"
                                : "אין כרגע פעולה שנדרשת מכם"}
                        </strong>
                        <span className={styles.completedText}>
                            {onboarding.progress.percentage === 100
                                ? onboarding.overallStatus === "completed"
                                    ? "הילד/ה רשום/ה ומשובץ/ת לקבוצה."
                                    : "המסמכים ממתינים לטיפול צוות המעון. אין צורך לעשות דבר נוסף כרגע."
                                : "המסמכים שנשלחו ממתינים לבדיקת צוות המעון. תוכלו להמשיך כאשר ייפתח שלב נוסף או אם יידרש תיקון."}
                        </span>
                    </aside>
                )}

                <div className={styles.profileNoticeRegion} aria-live="polite">
                    {profileNotice ? (
                        <p className={styles.profileSuccess}>{profileNotice}</p>
                    ) : null}
                </div>

                {!parentBundleSubmitted && onboarding.canEditProfile ? (
                    <CollapsibleSavedStep
                        isSaved={Boolean(profileStep && parentStageWasSubmitted(profileStep))}
                        title="פרטי הילד וההורים"
                    >
                        <IdentityProfileForm
                            key={onboarding.profile ? "existing-profile" : "new-profile"}
                            initialProfile={onboarding.profile}
                            prefill={onboarding.profilePrefill}
                            isSubmitting={isSubmittingProfile}
                            errorMessage={profileError}
                            onSubmit={handleProfileSubmit}
                        />
                    </CollapsibleSavedStep>
                ) : null}

                {!parentBundleSubmitted && token && canOpenAgreement ? (
                    <CollapsibleSavedStep
                        isSaved={Boolean(agreementStep && parentStageWasSubmitted(agreementStep))}
                        title="הסכם התקשרות"
                    >
                        <AgreementSection token={token} onSubmitted={() => void refreshOnboarding()} />
                    </CollapsibleSavedStep>
                ) : null}

                {!parentBundleSubmitted && token && (canOpenHealthDeclaration || canOpenPickupAuthorization) ? (
                    <section className={styles.formsGroup} aria-labelledby="health-permissions-title">
                        <div className={styles.formsGroupHeader}>
                            <h2 className={styles.formsGroupTitle} id="health-permissions-title">
                                בריאות והרשאות
                            </h2>
                            <p className={styles.formsGroupText}>
                                השלימו את הצהרת הבריאות ולאחריה את פרטי מורשי האיסוף.
                            </p>
                        </div>
                        {canOpenHealthDeclaration ? (
                            <CollapsibleSavedStep
                                isSaved={Boolean(healthStep && parentStageWasSubmitted(healthStep))}
                                title="הצהרת בריאות"
                            >
                                <HealthDeclarationSection token={token} onSubmitted={() => void refreshOnboarding()} />
                            </CollapsibleSavedStep>
                        ) : null}
                        {canOpenPickupAuthorization ? (
                            <CollapsibleSavedStep
                                isSaved={Boolean(pickupStep && parentStageWasSubmitted(pickupStep))}
                                title="מורשי איסוף"
                            >
                                <PickupAuthorizationSection token={token} onSubmitted={() => void refreshOnboarding()} />
                            </CollapsibleSavedStep>
                        ) : null}
                    </section>
                ) : null}

                {parentWorkComplete && !parentBundleSubmitted ? (
                    <section className={styles.finalSubmissionCard} aria-labelledby="final-submit-title">
                        <span className={styles.finalSubmissionEyebrow}>השלמתם את כל השלבים</span>
                        <h2 className={styles.finalSubmissionTitle} id="final-submit-title">
                            נשאר רק לשלוח לצוות המעון
                        </h2>
                        <p className={styles.finalSubmissionText}>
                            עברו על הפרטים ואם הכול נכון, לחצו על הכפתור. רק לאחר הלחיצה
                            התיק כולו יעבור לבדיקה של צוות המעון.
                        </p>
                        {bundleError ? <p className={styles.profileError} role="alert">{bundleError}</p> : null}
                        <button
                            className={styles.finalSubmissionButton}
                            type="button"
                            disabled={isSubmittingBundle || !onboarding.parentSubmission.canSubmit}
                            onClick={() => void handleFinalSubmit()}
                        >
                            {isSubmittingBundle ? "שולחים לצוות המעון..." : "סיום ושליחה לצוות המעון"}
                        </button>
                    </section>
                ) : null}

                {activeRevealedSteps.length > 0 ? (
                    <section
                        className={styles.stepsSection}
                        aria-labelledby="onboarding-steps-title"
                    >
                    <div className={styles.stepsHeader}>
                        <h2 id="onboarding-steps-title" className={styles.stepsTitle}>
                            שלבי ההצטרפות
                        </h2>
                        <p className={styles.stepsIntro}>
                            בכל פעם שמסיימים שלב, השלב הבא נפתח ומופיע כאן.
                        </p>
                    </div>

                        <div className={styles.stepsList}>
                            {activeRevealedSteps.map((step) => (
                                <OnboardingStepCard
                                    key={step.key}
                                    step={step}
                                    position={orderedSteps.findIndex(
                                        (orderedStep) => orderedStep.key === step.key
                                    ) + 1}
                                />
                            ))}
                        </div>
                    </section>
                ) : null}

                <aside className={styles.privacyNote}>
                    <ShieldCheck size={22} aria-hidden="true" />
                    <p className={styles.privacyText}>
                        זהו קישור אישי. כדי לשמור על פרטיות המשפחה, אל תעבירו אותו
                        לאחרים.
                    </p>
                </aside>
            </div>
        </main>
    );
};

export default DaycareOnboarding;
