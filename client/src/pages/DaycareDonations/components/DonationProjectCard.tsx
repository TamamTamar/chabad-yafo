import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { getDonationItemStatus } from "../daycareDonationsData";
import type { DonationItem, DonationSelection } from "../types";
import styles from "../DaycareDonations.module.scss";

type DonationProjectCardProps = {
    item: DonationItem;
    onDonate: (selection: DonationSelection) => void;
};

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("he-IL").format(value);

const statusLabels = {
    open: "פתוח לשותפות",
    almost: "קרובים להשלמה",
    complete: "הושלם בזכותכם",
    closed: "סגור לתרומות",
};

const DonationProjectCard = ({
    item,
    onDonate,
}: DonationProjectCardProps) => {
    const status = getDonationItemStatus(item);
    const remaining = Math.max(0, item.goal - item.raised);
    const selection: DonationSelection = {
        kind: "item",
        id: item.id,
        title: item.title,
    };
    const actionLabel =
        item.statusOverride === "open"
            ? "פתוח ידנית"
            : status === "almost"
            ? statusLabels.almost
            : remaining <= 1_000
              ? `נותרו רק ₪${formatCurrency(remaining)}`
              : statusLabels[status];

    return (
        <article
            className={`${styles.projectCard} ${
                status === "complete" ? styles.projectCardComplete : ""
            }`}
        >
            <div className={styles.cardBody}>
                <div className={styles.cardHeaderRow}>
                    <div className={styles.cardCopy}>
                        <h3>{item.title}</h3>
                        <p>{item.description}</p>
                    </div>
                <span
                    className={`${styles.statusBadge} ${
                        status === "almost"
                            ? styles.statusAlmost
                            : status === "complete"
                              ? styles.statusComplete
                              : status === "closed"
                                ? styles.statusClosed
                              : ""
                    }`}
                >
                    {status === "complete" && (
                        <CheckCircle2 aria-hidden="true" />
                    )}
                    {actionLabel}
                </span>
                </div>

                <div
                    className={styles.cardAmounts}
                    aria-label={`גויסו ₪${formatCurrency(item.raised)} מתוך יעד ₪${formatCurrency(item.goal)}. נותרו ₪${formatCurrency(remaining)}`}
                >
                    <span>
                        <small>גויסו</small>
                        <strong>₪{formatCurrency(item.raised)}</strong>
                    </span>
                    <span>
                        <small>מתוך יעד</small>
                        <strong>₪{formatCurrency(item.goal)}</strong>
                    </span>
                    <span>
                        <small>{remaining > 0 ? "נותרו" : "מצב"}</small>
                        <strong>
                            {remaining > 0
                                ? `₪${formatCurrency(remaining)}`
                                : "הושלם"}
                        </strong>
                    </span>
                </div>

                <button
                    type="button"
                    className={styles.cardButton}
                    onClick={() => onDonate(selection)}
                    disabled={!item.acceptingDonations}
                >
                    {item.acceptingDonations
                        ? "שותפים בחלק הזה"
                        : status === "complete"
                          ? "הושלם בזכותכם"
                          : "סגור לתרומות"}
                    {item.acceptingDonations && <ArrowLeft aria-hidden="true" />}
                </button>
            </div>
        </article>
    );
};

export default DonationProjectCard;
