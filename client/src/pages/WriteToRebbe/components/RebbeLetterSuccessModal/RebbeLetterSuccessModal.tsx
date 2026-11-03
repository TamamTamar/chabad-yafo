import { Link } from "react-router-dom";
import styles from "./RebbeLetterSuccessModal.module.scss";

import type { WriteToRebbeConfig } from "../../writeToRebbeConfig";

type RebbeLetterSuccessModalProps = {
    config: WriteToRebbeConfig;
    onClose: () => void;
};

const RebbeLetterSuccessModal = ({
    onClose,
    config,
}: RebbeLetterSuccessModalProps) => {
    return (
        <div
            className={styles.overlay}
            onClick={onClose}
        >
            <div
                className={styles.modal}
                onClick={(event) =>
                    event.stopPropagation()
                }
            >
                <button
                    type="button"
                    className={styles.closeButton}
                    onClick={onClose}
                    aria-label="סגירה"
                >
                    ×
                </button>

                <div className={styles.icon}>
                    ✓
                </div>

                <h2 className={styles.title}>
                    הבקשה נשלחה בהצלחה
                </h2>

                <p className={styles.text}>
                    {config.occasion === "kinus-hashluchim"
                        ? "תודה ששיתפתם. בקשתכם התקבלה בבית חב״ד יפו, ובעזרת ה׳ תובא לאוהל הקדוש של הרבי בנסיעה לכינוס השלוחים."
                        : `תודה ששיתפתם. בקשתכם התקבלה בבית חב״ד יפו.${config.eventText ? ` ${config.eventText}` : ""}`}
                </p>

                <p className={styles.blessingText}>
                    יהי רצון שתזכו לברכה והצלחה,
                    <br />
                    לבשורות טובות ולמילוי משאלות לבבכם לטובה.
                </p>

                <div className={styles.donationBox}>
                    <strong>רוצים לקחת חלק בפעילות בית חב"ד יפו?</strong>

                    <p className={styles.donationText}>
                        התרומות מסייעות לפעילות בית חב"ד יפו לאורך כל השנה.
                    </p>
                </div>
                <div className={styles.actions}>
                   

                    <Link
                        to="/donate#donate-form"
                        className={styles.primaryButton}
                    >
                        לקחת חלק בפעילות
                    </Link>
                    <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={onClose}
                    >
                        סגירה
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RebbeLetterSuccessModal;
