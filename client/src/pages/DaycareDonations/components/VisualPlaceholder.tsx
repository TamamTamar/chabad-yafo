import { Image as ImageIcon } from "lucide-react";
import type { DonationVisual } from "../types";
import styles from "../DaycareDonations.module.scss";

type VisualPlaceholderProps = {
    visual: DonationVisual;
    className?: string;
    loading?: "eager" | "lazy";
};

const VisualPlaceholder = ({
    visual,
    className = "",
    loading = "lazy",
}: VisualPlaceholderProps) => {
    if (visual.src) {
        return (
            <img
                className={`${styles.visualImage} ${className}`}
                src={visual.src}
                alt={visual.alt}
                loading={loading}
                decoding="async"
            />
        );
    }

    return (
        <div
            className={`${styles.visualPlaceholder} ${styles[`tone-${visual.tone}`]} ${className}`}
            role="img"
            aria-label={visual.alt}
        >
            <span className={styles.placeholderHalo} aria-hidden="true" />
            <ImageIcon aria-hidden="true" />
            <span>{visual.placeholderLabel}</span>
            <small>התמונה תוחלף בקלות לאחר שתצורף</small>
        </div>
    );
};

export default VisualPlaceholder;

