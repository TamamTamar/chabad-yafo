import styles from "./DonationSummary.module.scss";

type DonationSummaryProps = {
    amount: number;
    monthly: boolean;
};

const DonationSummary = ({ amount, monthly }: DonationSummaryProps) => {
    const hasAmount = amount > 0;
    const totalAmount = monthly ? amount * 12 : amount;

    const donationTypeText = monthly
        ? "תרומה חודשית ל־12 חודשים"
        : "תרומה חד־פעמית";

    return (
        <aside className={styles.card}>
            <header className={styles.header}>
                <p className={styles.eyebrow}>השותפות שלך</p>

                <strong className={styles.amount}>
                    {hasAmount ? `₪${amount.toLocaleString()}` : "בחירה אישית"}
                </strong>

                <p className={styles.type}>
                    {hasAmount ? donationTypeText : "ממתין להזנת סכום"}
                </p>
            </header>

            <section className={styles.summary}>
                {monthly && hasAmount && (
                    <p className={styles.note}>
                        ₪{amount.toLocaleString()} בכל חודש
                    </p>
                )}

                <div className={styles.total}>
                    <span className={styles.totalLabel}>
                        {hasAmount ? "סה״כ תרומה" : "סכום מינימלי"}
                    </span>

                    <strong className={styles.totalAmount}>
                        {hasAmount ? `₪${totalAmount.toLocaleString()}` : "₪18"}
                    </strong>
                </div>
            </section>

            <footer className={styles.footer}>
                <p className={styles.benefit}>קבלה תישלח למייל</p>
                <p className={styles.benefit}>תשלום מאובטח</p>
            </footer>
        </aside>
    );
};

export default DonationSummary;