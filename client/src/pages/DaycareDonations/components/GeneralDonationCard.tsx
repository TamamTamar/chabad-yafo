import { ArrowLeft, HeartHandshake } from "lucide-react";
import type { DonationSelection } from "../types";
import styles from "../DaycareDonations.module.scss";

type GeneralDonationCardProps = {
    onDonate: (selection: DonationSelection) => void;
    generalRaised: number;
};

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("he-IL").format(value);

const GeneralDonationCard = ({
    onDonate,
    generalRaised,
}: GeneralDonationCardProps) => (
    <section className={styles.generalCard}>
        <div className={styles.generalIcon} aria-hidden="true">
            <HeartHandshake />
        </div>
        <div className={styles.generalContent}>
            <p className={styles.generalEyebrow}>רוצים לתת לנו לבחור?</p>
            <h2>למקום שבו התרומה נדרשת ביותר</h2>
            <p>
                התרומה שלכם תופנה לצורך הדחוף ביותר באותו רגע, ותעזור
                לנו להתקדם בלי לעצור.
            </p>
            <span>
                ₪{formatCurrency(generalRaised)} כבר נתרמו
                במסלול הכללי
            </span>
        </div>
        <button
            type="button"
            className={styles.generalButton}
            onClick={() =>
                onDonate({
                    kind: "general",
                    id: "general",
                    title: "למקום שבו התרומה נדרשת ביותר",
                })
            }
        >
            תרומה למקום הנדרש ביותר
            <ArrowLeft aria-hidden="true" />
        </button>
    </section>
);

export default GeneralDonationCard;
