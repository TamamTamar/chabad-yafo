import styles from "../DaycareDonations.module.scss";

type ProgressBarProps = {
    value: number;
    label: string;
    size?: "small" | "large";
};

const ProgressBar = ({
    value,
    label,
    size = "small",
}: ProgressBarProps) => (
    <div
        className={`${styles.progressTrack} ${
            size === "large" ? styles.progressTrackLarge : ""
        }`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-label={label}
    >
        <span
            className={styles.progressFill}
            style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
    </div>
);

export default ProgressBar;

