import { ArrowLeft, HardHat } from "lucide-react";
import type {
    DaycareDonationFieldUpdate,
    DonationItem,
    DonationSelection,
    DonationVisual,
} from "../types";
import styles from "../DaycareDonations.module.scss";
import VisualPlaceholder from "./VisualPlaceholder";

type CampaignStoryProps = {
    onDonate: (selection: DonationSelection) => void;
    donationItems: DonationItem[];
    fieldUpdates: DaycareDonationFieldUpdate[];
};

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("he-IL", { maximumFractionDigits: 0 }).format(value);

const CampaignStory = ({
    onDonate,
    donationItems,
    fieldUpdates,
}: CampaignStoryProps) => {
    const update = fieldUpdates.find((entry) => entry.published);
    if (!update) return null;

    const updateVisual: DonationVisual = {
        src: update.imageUrl,
        alt: update.imageAlt,
        placeholderLabel: "עדכון מהעבודות במעון",
        tone: "sand",
    };
    const linkedItem = update.itemId
        ? donationItems.find(
              (item) => item.id === update.itemId && item.acceptingDonations
          )
        : undefined;
    const nextItem = linkedItem ?? donationItems.find((item) => item.acceptingDonations);
    const remaining = nextItem
        ? Math.max(0, nextItem.remaining ?? nextItem.goal - nextItem.raised)
        : 0;

    return (
        <section className={styles.fieldUpdate} aria-labelledby="field-update-title">
            <div className={styles.fieldUpdateVisualWrap}>
                <VisualPlaceholder
                    visual={updateVisual}
                    className={styles.fieldUpdateVisual}
                />
                <span className={styles.fieldUpdateBadge}>
                    <HardHat aria-hidden="true" />
                    עדכון אחרון מהשטח
                </span>
            </div>
            <div className={styles.fieldUpdateContent}>
                <p className={styles.sectionEyebrow}>העבודה ממשיכה להתקדם</p>
                <h2 id="field-update-title">{update.title}</h2>
                <p>{update.description}</p>
                {nextItem && (
                    <div className={styles.fieldUpdateAction}>
                        <div>
                            <span>השלב הבא</span>
                            <strong>{nextItem.title}</strong>
                            <small>נותרו ₪{formatCurrency(remaining)}</small>
                        </div>
                        <button
                            type="button"
                            onClick={() =>
                                onDonate({
                                    kind: "item",
                                    id: nextItem.id,
                                    title: nextItem.title,
                                })
                            }
                        >
                            שותפים בשלב הבא
                            <ArrowLeft aria-hidden="true" />
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
};

export default CampaignStory;
