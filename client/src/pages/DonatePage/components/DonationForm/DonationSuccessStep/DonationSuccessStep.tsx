import styles from "./DonationSuccessStep.module.scss";

type DonationSuccessStepProps = {
    amount: number;
    monthly: boolean;
};

const DonationSuccessStep = ({
    amount,
    monthly,
}: DonationSuccessStepProps) => {
    const totalAmount = monthly
        ? amount * 12
        : amount;

    return (
        <section className={styles.successWrapper}>
            <section className={styles.successBox}>
                <div
                    className={styles.icon}
                    aria-hidden="true"
                >
                    ✓
                </div>

                <p className={styles.eyebrow}>
                    התרומה הושלמה בהצלחה
                </p>

                <h2 className={styles.title}>
                    תודה רבה על התרומה!
                </h2>

                <p className={styles.amountLine}>
                    {monthly ? (
                        <>
                            תרומתך בסך ₪
                            {amount.toLocaleString()}
                            {" "}לחודש למשך 12 חודשים
                            נקלטה בהצלחה.
                        </>
                    ) : (
                        <>
                            תרומתך בסך ₪
                            {totalAmount.toLocaleString()}
                            {" "}נקלטה בהצלחה.
                        </>
                    )}
                </p>

                <p className={styles.text}>
                    התרומה תסייע לבית חב״ד יפו להמשיך
                    בפעילות של חסד, קהילה והפצת יהדות
                    בלב יפו.
                </p>

                <div className={styles.infoCard}>
                    <p className={styles.infoText}>
                        קבלה תישלח לכתובת המייל שהוזנה במהלך
                        התרומה.
                    </p>
                </div>

                <a
                    href="/"
                    className={styles.homeButton}
                >
                    חזרה לדף הבית
                </a>
            </section>
        </section>
    );
};

export default DonationSuccessStep;