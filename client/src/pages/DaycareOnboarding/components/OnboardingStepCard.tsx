import { CalendarDays } from "lucide-react";
import {
    type OnboardingStepStatus,
    type PublicOnboardingStep,
} from "../../../types/daycareOnboarding";
import styles from "../DaycareOnboarding.module.scss";
import OnboardingStatusBadge from "./OnboardingStatusBadge";

type OnboardingStepCardProps = {
    step: PublicOnboardingStep;
    position: number;
};

const defaultStatusMessages: Record<OnboardingStepStatus, string> = {
    notStarted: "השלב עדיין לא התחיל.",
    inProgress: "השלב נמצא בתהליך.",
    pendingReview: "המסמך התקבל וממתין לבדיקה.",
    completed: "השלב הושלם ואושר.",
    requiresCorrection: "נדרש תיקון לפני שנוכל לאשר את השלב.",
    notRequired: "שלב זה אינו נדרש עבורכם.",
};

const documentStepKeys = new Set([
    "agreement",
    "healthDeclaration",
    "parentPermissions",
]);

const formatDate = (value?: string) => {
    if (!value) {
        return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return new Intl.DateTimeFormat("he-IL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(date);
};

const OnboardingStepCard = ({ step, position }: OnboardingStepCardProps) => {
    const updatedDate = formatDate(step.updatedAt ?? step.completedAt);
    const defaultMessage =
        step.status === "completed" && documentStepKeys.has(step.key)
            ? "המסמך התקבל ואושר."
            : defaultStatusMessages[step.status];
    const message = step.parentMessage?.trim() || defaultMessage;
    const messageClassName =
        step.status === "requiresCorrection"
            ? styles.stepMessageCorrection
            : step.status === "pendingReview"
              ? styles.stepMessagePending
              : styles.stepMessage;

    return (
        <article className={styles.stepCard}>
            <div className={styles.stepTopRow}>
                <span className={styles.stepNumber} aria-hidden="true">
                    {position}
                </span>
                <div className={styles.stepHeadingGroup}>
                    <h3 className={styles.stepTitle}>{step.title}</h3>
                    <OnboardingStatusBadge status={step.status} />
                </div>
            </div>

            {step.description ? (
                <p className={styles.stepDescription}>{step.description}</p>
            ) : null}

            <p className={messageClassName}>{message}</p>

            <div className={styles.stepMeta}>
                {updatedDate ? (
                    <span className={styles.updatedDate}>
                        <CalendarDays size={15} aria-hidden="true" />
                        עודכן ב־{updatedDate}
                    </span>
                ) : null}
            </div>

        </article>
    );
};

export default OnboardingStepCard;
