import styles from "./SuccessModal.module.scss";

type Props = {
    onClose: () => void;
};

const SuccessModal = ({ onClose }: Props) => {
    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div
                className={styles.successModal}
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="success-title"
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
                    💛
                </div>

                <h3 id="success-title">תודה</h3>

                <p>תודה שהקדשתם רגע למלא את הטופס.

                    המידע יעזור לנו לבנות פעילויות, מסגרות ומפגשים שיתאימו באמת למשפחות הצעירות ביפו.</p>

                <p className={styles.smallText}>
                    נעדכן בקרוב על הפעילויות הראשונות.
                </p>

                <button
                    type="button"
                    className={styles.modalButton}
                    onClick={onClose}
                >
                    מעולה, תודה
                </button>
            </div>
        </div>
    );
};

export default SuccessModal;