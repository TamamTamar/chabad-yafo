import { ArrowLeft, Heart, UsersRound, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PublicDaycareDonation } from "../types";
import styles from "../DaycareDonations.module.scss";

type RecentDonorsProps = {
    donationCount: number;
    donations: PublicDaycareDonation[];
};

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("he-IL", {
        maximumFractionDigits: 0,
    }).format(Math.round(value));

const formatDonationAmount = (donation: PublicDaycareDonation) =>
    donation.originalCurrency === "USD" &&
    donation.originalAmount !== undefined
        ? `$${formatCurrency(donation.originalAmount)}`
        : `₪${formatCurrency(donation.amount)}`;

const RecentDonors = ({ donationCount, donations }: RecentDonorsProps) => {
    const [open, setOpen] = useState(false);
    const dialogRef = useRef<HTMLDialogElement | null>(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (open && !dialog.open) dialog.showModal();
        if (!open && dialog.open) dialog.close();
    }, [open]);

    if (donationCount === 0) return null;

    return (
        <section className={styles.donorsStrip} aria-label="שותפים בקמפיין">
            <div className={styles.donorsIntro}>
                <span><UsersRound aria-hidden="true" /></span>
                <div>
                    <strong>{donationCount} שותפים כבר הצטרפו</strong>
                    <small>יחד בונים מקום לגדול בו</small>
                </div>
            </div>
            <div className={styles.donorsPreview}>
                {donations.slice(0, 12).map((donation) => (
                    <article key={donation.id}>
                        <span className={styles.donorAvatar} aria-hidden="true">
                            {donation.donorName.slice(0, 1)}
                        </span>
                        <span className={styles.donorPreviewCopy}>
                            <strong dir="auto">{donation.donorName}</strong>
                            {donation.dedication && (
                                <small dir="auto">{donation.dedication}</small>
                            )}
                        </span>
                        <b dir="ltr">{formatDonationAmount(donation)}</b>
                    </article>
                ))}
            </div>
            <button type="button" onClick={() => setOpen(true)}>
                לכל השותפים
                <ArrowLeft aria-hidden="true" />
            </button>

            <dialog
                ref={dialogRef}
                className={styles.donorsDialog}
                aria-labelledby="donors-dialog-title"
                onCancel={(event) => {
                    event.preventDefault();
                    setOpen(false);
                }}
                onClose={() => setOpen(false)}
                onClick={(event) => {
                    if (event.target === event.currentTarget) setOpen(false);
                }}
            >
                <div className={styles.donorsDialogCard}>
                    <header>
                        <div>
                            <p><Heart aria-hidden="true" /> תודה לכל השותפים</p>
                            <h2 id="donors-dialog-title">בונים את המעון יחד</h2>
                        </div>
                        <button type="button" onClick={() => setOpen(false)} aria-label="סגירת רשימת התורמים">
                            <X aria-hidden="true" />
                        </button>
                    </header>
                    <div className={styles.donorsList}>
                        {donations.map((donation) => (
                            <div key={donation.id}>
                                <span>{donation.donorName.slice(0, 1)}</span>
                                <div>
                                    <strong dir="auto">{donation.donorName}</strong>
                                    {donation.dedication && (
                                        <small dir="auto">{donation.dedication}</small>
                                    )}
                                </div>
                                <b dir="ltr">{formatDonationAmount(donation)}</b>
                            </div>
                        ))}
                    </div>
                    {donationCount > donations.length && (
                        <p className={styles.donorsListNote}>
                            מוצגות {donations.length} התרומות האחרונות מתוך {donationCount}.
                        </p>
                    )}
                </div>
            </dialog>
        </section>
    );
};

export default RecentDonors;
