import { enrollmentSteps } from "../daycareEnrollmentOptions";
import styles from "../DaycareEnrollment.module.scss";

type StepProgressProps = {
    currentStep: number;
};

const StepProgress = ({ currentStep }: StepProgressProps) => (
    <div className={styles.progress} aria-label="התקדמות בטופס">
        <div className={styles.progressTrack}>
            <span
                style={{
                    width: `${((currentStep + 1) / enrollmentSteps.length) * 100}%`,
                }}
            />
        </div>
        <ol className={styles.stepList}>
            {enrollmentSteps.map((step, index) => (
                <li
                    className={
                        index <= currentStep ? styles.stepActive : styles.step
                    }
                    key={step}
                >
                    <span>{index + 1}</span>
                    {step}
                </li>
            ))}
        </ol>
    </div>
);

export default StepProgress;
