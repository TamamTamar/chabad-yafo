import {
    AlertTriangle,
    CheckCircle2,
    Circle,
    Clock3,
    MinusCircle,
    SearchCheck,
    type LucideIcon,
} from "lucide-react";
import {
    onboardingStepStatusLabels,
    type OnboardingStepStatus,
} from "../../../types/daycareOnboarding";
import styles from "../DaycareOnboarding.module.scss";

type OnboardingStatusBadgeProps = {
    status: OnboardingStepStatus;
};

type StatusPresentation = {
    icon: LucideIcon;
    className:
        | "statusNotStarted"
        | "statusInProgress"
        | "statusPendingReview"
        | "statusCompleted"
        | "statusRequiresCorrection"
        | "statusNotRequired";
};

const statusPresentations: Record<
    OnboardingStepStatus,
    StatusPresentation
> = {
    notStarted: {
        icon: Circle,
        className: "statusNotStarted",
    },
    inProgress: {
        icon: Clock3,
        className: "statusInProgress",
    },
    pendingReview: {
        icon: SearchCheck,
        className: "statusPendingReview",
    },
    completed: {
        icon: CheckCircle2,
        className: "statusCompleted",
    },
    requiresCorrection: {
        icon: AlertTriangle,
        className: "statusRequiresCorrection",
    },
    notRequired: {
        icon: MinusCircle,
        className: "statusNotRequired",
    },
};

const OnboardingStatusBadge = ({ status }: OnboardingStatusBadgeProps) => {
    const presentation = statusPresentations[status];
    const Icon = presentation.icon;

    return (
        <span
            className={`${styles.statusBadge} ${styles[presentation.className]}`}
        >
            <Icon className={styles.statusIcon} size={16} aria-hidden="true" />
            <span className={styles.statusText}>
                {onboardingStepStatusLabels[status]}
            </span>
        </span>
    );
};

export default OnboardingStatusBadge;
