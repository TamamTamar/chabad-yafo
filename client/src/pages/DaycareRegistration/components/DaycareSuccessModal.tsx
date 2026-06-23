import styles from "../DaycareRegistration.module.scss";

type Props = {
    onClose: () => void;
};

const DaycareSuccessModal = ({ onClose }: Props) => (
    <div className={styles.modalOverlay} onClick={onClose}>
        <div
            className={styles.successModal}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="daycare-success-title"
        >
            <button
                type="button"
                className={styles.closeModal}
                onClick={onClose}
                aria-label="סגירת הודעה"
            >
                ×
            </button>

            <div className={styles.iconCircle} aria-hidden="true">
                ✓
            </div>

            <h2 className={styles.modalTitle} id="daycare-success-title">
                תודה!
            </h2>

            <div className={styles.modalText}>
                <span>שמחים על ההתעניינות במעון החדש בצפון יפו.</span>
                <span>פרטיכם התקבלו בהצלחה.</span>
                <span>
                    עם התקדמות ההיערכות ופתיחת הרישום הרשמי ניצור עמכם קשר
                    ונעדכן בפרטים המלאים.
                </span>
                <span>בברכה,</span>
                <span>הרב לוי יצחק ותמר תמם</span>
                <span>מרכז חב"ד יפו</span>
            </div>

            <button
                type="button"
                className={styles.modalButton}
                onClick={onClose}
            >
                סגירה
            </button>
        </div>
    </div>
);

export default DaycareSuccessModal;
