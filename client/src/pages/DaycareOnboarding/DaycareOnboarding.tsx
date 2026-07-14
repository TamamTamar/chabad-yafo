import axios from "axios";
import { Link2Off, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import DaycareLogo from "../../components/DaycareLogo/DaycareLogo";
import {
    getPublicDaycareOnboarding,
    submitPublicDaycareProfile,
} from "../../services/daycareOnboardingService";
import type { PublicDaycareOnboarding } from "../../types/daycareOnboarding";
import styles from "./DaycareOnboarding.module.scss";
import OnboardingProgress from "./components/OnboardingProgress";
import OnboardingStepCard from "./components/OnboardingStepCard";
import IdentityProfileForm from "./components/IdentityProfileForm";
import AgreementSection from "./components/AgreementSection";

type PageState =
    | { status: "loading" }
    | { status: "ready"; onboarding: PublicDaycareOnboarding }
    | { status: "invalid" }
    | { status: "rateLimited" }
    | { status: "error" };

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
            setProfileNotice("הפרטים נשלחו בהצלחה וממתינים לבדיקה של צוות המעון.");
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
    const nextStep = orderedSteps.find(
        (step) => step.status !== "completed" && step.status !== "notRequired"
    );
    const nextStepTitle = onboarding.missingStepTitle ?? nextStep?.title;
    const profileStep = orderedSteps.find(
        (step) => step.key === "childAndGuardianDetails"
    );
    const canOpenAgreement =
        profileStep?.status === "completed" ||
        profileStep?.status === "notRequired";

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
                        כאן תוכלו לראות אילו שלבים כבר הושלמו ומה עדיין נדרש כדי
                        להשלים את ההרשמה.
                    </p>
                </header>

                <OnboardingProgress
                    overallStatus={onboarding.overallStatus}
                    progress={onboarding.progress}
                />

                {nextStepTitle ? (
                    <aside className={styles.nextStepCard} aria-label="השלב הבא">
                        <span className={styles.nextStepLabel}>מה עכשיו?</span>
                        <strong className={styles.nextStepTitle}>
                            {nextStepTitle}
                        </strong>
                        <span className={styles.nextStepText}>
                            זהו השלב הבא שעדיין נדרש במסלול. צוות המעון יעדכן אתכם
                            אם נדרשת פעולה נוספת.
                        </span>
                    </aside>
                ) : (
                    <aside
                        className={styles.completedCard}
                        aria-label="ההרשמה הושלמה"
                    >
                        <strong className={styles.completedTitle}>
                            כל השלבים הנדרשים הושלמו
                        </strong>
                        <span className={styles.completedText}>
                            צוות המעון יעדכן אתכם אם יידרש דבר נוסף.
                        </span>
                    </aside>
                )}

                <div className={styles.profileNoticeRegion} aria-live="polite">
                    {profileNotice ? (
                        <p className={styles.profileSuccess}>{profileNotice}</p>
                    ) : null}
                </div>

                {onboarding.canEditProfile ? (
                    <IdentityProfileForm
                        key={onboarding.profile ? "existing-profile" : "new-profile"}
                        initialProfile={onboarding.profile}
                        prefill={onboarding.profilePrefill}
                        isSubmitting={isSubmittingProfile}
                        errorMessage={profileError}
                        onSubmit={handleProfileSubmit}
                    />
                ) : null}

                {token && canOpenAgreement ? (
                    <AgreementSection token={token} onSubmitted={() => void refreshOnboarding()} />
                ) : null}

                <section
                    className={styles.stepsSection}
                    aria-labelledby="onboarding-steps-title"
                >
                    <div className={styles.stepsHeader}>
                        <h2 id="onboarding-steps-title" className={styles.stepsTitle}>
                            שלבי ההצטרפות
                        </h2>
                        <p className={styles.stepsIntro}>
                            הסטטוס מתעדכן בהתאם למסמכים ולבדיקות של צוות המעון.
                        </p>
                    </div>

                    {orderedSteps.length > 0 ? (
                        <div className={styles.stepsList}>
                            {orderedSteps.map((step, index) => (
                                <OnboardingStepCard
                                    key={step.key}
                                    step={step}
                                    position={index + 1}
                                />
                            ))}
                        </div>
                    ) : (
                        <p className={styles.emptyStepsMessage}>
                            השלבים עדיין בהכנה. צוות המעון יעדכן אתכם בהקדם.
                        </p>
                    )}
                </section>

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
