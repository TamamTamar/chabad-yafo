import styles from "./SuccessModal.module.scss";

type Props = {
    onClose: () => void;
};

const SuccessModal = ({ onClose }: Props) => {
    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div
                className={styles.successModal}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    type="button"
                    className={styles.closeModal}
                    onClick={onClose}
                    aria-label="סגירת הודעה"
                >
                    ×
                </button>

                <h3>תודה 💛</h3>

                <p>
                    אנחנו בונים משהו חדש למשפחות הצעירות של יפו —
                    שמחבר חינוך, קהילה וערכים יהודיים באווירה נעימה ומקרבת.
                </p>

                <p>
                    בקרוב נעדכן בפעילויות הראשונות.
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