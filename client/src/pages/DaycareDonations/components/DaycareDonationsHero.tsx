import { ArrowDown, Heart } from "lucide-react";
import DaycareLogo from "../../../components/DaycareLogo/DaycareLogo";
import type { DonationSelection, DonationVisual } from "../types";
import styles from "../DaycareDonations.module.scss";
import OverallProgress from "./OverallProgress";
import VisualPlaceholder from "./VisualPlaceholder";

type DaycareDonationsHeroProps = {
    onDonate: (selection: DonationSelection) => void;
    goal: number;
    raised: number;
    completedItemsCount: number;
};

const heroVisual: DonationVisual = {
    src: "/daycare-donations/hero.webp",
    alt: "חצר מעון חב״ד יפו במהלך עבודות השיפוץ",
    placeholderLabel: "תמונה ראשית של תהליך הקמת המעון",
    tone: "gold",
};

const DaycareDonationsHero = ({
    onDonate,
    goal,
    raised,
    completedItemsCount,
}: DaycareDonationsHeroProps) => (
    <section className={styles.hero}>
        <VisualPlaceholder
            visual={heroVisual}
            className={styles.heroVisual}
            loading="eager"
        />
        <div className={styles.heroOverlay} aria-hidden="true" />

        <div className={styles.heroInner}>
            <div className={styles.heroLogo}>
                <DaycareLogo />
            </div>

            <p className={styles.eyebrow}>
                <Heart aria-hidden="true" />
                מקימים יחד בית קטן עם לב גדול
            </p>

            <h1>בונים לילדי יפו מקום לגדול בו</h1>
            <p className={styles.heroLead}>
                מעון בטוח, חם ושמח — שנבנה יחד, חלק אחר חלק.
            </p>

            <OverallProgress
                goal={goal}
                raised={raised}
                completedItemsCount={completedItemsCount}
            />

            <div className={styles.heroActions}>
                <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={() =>
                        document
                            .getElementById("campaign-parts")
                            ?.scrollIntoView({ behavior: "smooth" })
                    }
                >
                    בחרו במה תרצו לקחת חלק
                    <ArrowDown aria-hidden="true" />
                </button>
                <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() =>
                        onDonate({
                            kind: "general",
                            id: "general",
                            title: "למקום שבו התרומה נדרשת ביותר",
                        })
                    }
                >
                    תרומה כללית למעון
                </button>
            </div>
            <p className={styles.heroTrust}>
                תשלום מאובטח באמצעות נדרים פלוס
                <span aria-hidden="true">•</span>
                קבלה אוטומטית
                <span aria-hidden="true">•</span>
                פרטי האשראי אינם נשמרים באתר
            </p>
        </div>
    </section>
);

export default DaycareDonationsHero;
