import {
    onboardingOverallStatusLabels,
    type OnboardingOverallStatus,
    type OnboardingProgress as OnboardingProgressData,
} from "../../../types/daycareOnboarding";
import styles from "../DaycareOnboarding.module.scss";

type OnboardingProgressProps = {
    overallStatus: OnboardingOverallStatus;
    progress: OnboardingProgressData;
};

const normalizePercentage = (value: number) => {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.min(100, Math.max(0, Math.round(value)));
};

const OnboardingProgress = ({
    overallStatus,
    progress,
}: OnboardingProgressProps) => {
    const percentage = normalizePercentage(progress.percentage);

    return (
        <section
            className={styles.progressCard}
            aria-labelledby="onboarding-progress-title"
        >
            <div className={styles.progressHeader}>
                <div className={styles.progressHeadingGroup}>
                    <h2
                        id="onboarding-progress-title"
                        className={styles.progressTitle}
                    >
                        ההתקדמות שלכם
                    </h2>
                    <p className={styles.progressCount}>
                        {progress.completedSteps} מתוך {progress.totalSteps} שלבים
                        הושלמו
                    </p>
                </div>
                <strong className={styles.progressPercentage}>
                    {percentage}%
                </strong>
            </div>

            <progress
                className={styles.progressBar}
                value={percentage}
                max={100}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percentage}
                aria-valuetext={`${percentage} אחוזים הושלמו`}
            >
                {percentage}%
            </progress>

            <div className={styles.overallStatusRow}>
                <span className={styles.overallStatusLabel}>סטטוס כללי</span>
                <span className={styles.overallStatusValue}>
                    {onboardingOverallStatusLabels[overallStatus]}
                </span>
            </div>
        </section>
    );
};

export default OnboardingProgress;
