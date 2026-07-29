import { ArrowLeft, Heart } from "lucide-react";
import type { DonationSelection } from "../types";
import styles from "../DaycareDonations.module.scss";

type ClosingDonationSectionProps = {
    onDonate: (selection: DonationSelection) => void;
};

const ClosingDonationSection = ({
    onDonate,
}: ClosingDonationSectionProps) => (
    <section className={styles.closingSection}>
        <div className={styles.closingOverlay} aria-hidden="true" />
        <div className={styles.closingContent}>
            <p className={styles.eyebrow}>
                <Heart aria-hidden="true" />
                עוד חלק אחד, עוד צעד אל הפתיחה
            </p>
            <h2>ביחד נהפוך את המקום הזה לבית לילדי יפו</h2>
            <p className={styles.closingLead}>
                כל תרומה מקרבת אותנו לפתיחת הדלת וליום הראשון של הילדים
                במעון.
            </p>
            <button
                type="button"
                className={styles.primaryButton}
                onClick={() =>
                    onDonate({
                        kind: "general",
                        id: "general",
                        title: "למקום שבו התרומה נדרשת ביותר",
                    })
                }
            >
                אני רוצה לקחת חלק
                <ArrowLeft aria-hidden="true" />
            </button>
        </div>
    </section>
);

export default ClosingDonationSection;
