import { Heart } from "lucide-react";
import type { DonationSelection } from "../types";
import styles from "../DaycareDonations.module.scss";

type MobileDonationBarProps = {
    onDonate: (selection: DonationSelection) => void;
};

const MobileDonationBar = ({ onDonate }: MobileDonationBarProps) => (
    <div className={styles.mobileDonationBar}>
        <button
            type="button"
            onClick={() =>
                onDonate({
                    kind: "general",
                    id: "general",
                    title: "למקום שבו התרומה נדרשת ביותר",
                })
            }
        >
            <Heart aria-hidden="true" />
            לתרומה למעון
        </button>
    </div>
);

export default MobileDonationBar;

