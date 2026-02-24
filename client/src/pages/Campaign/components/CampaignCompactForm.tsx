import React, { useState, useEffect } from "react";
import styles from "../DonationCampaignPage.module.scss";
import type { DonorForm } from "../types";

type Props = {
    externalAmount?: number;
    onSubmit: (amount: number, donor: DonorForm) => void;
};

const CampaignCompactForm: React.FC<Props> = ({ externalAmount, onSubmit }) => {
    const [amount, setAmount] = useState<string>("");
    const [donor, setDonor] = useState<DonorForm>({
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
    });

    // מאזין לשינויים מהמחשבון ומעדכן את שדה הסכום בטופס
    useEffect(() => {
        if (externalAmount !== undefined && externalAmount > 0) {
            setAmount(externalAmount.toString());
        }
    }, [externalAmount]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = Number(amount);
        if (numAmount > 0) {
            onSubmit(numAmount, donor);
        }
    };

    const scrollToCalculator = () => {
        const el = document.getElementById("calculator-section");
        if (el) el.scrollIntoView({ behavior: "smooth" });
    };

    return (
        <form
            id="donation-form-section"
            className={styles.compactForm} onSubmit={handleSubmit}>
            <div className={styles.compactInputSection}>
                <label className={styles.compactLabel}>סכום לתרומה</label>
                <div className={styles.amountInputWrapper}>
                    <input
                        type="number"
                        className={styles.compactAmountInput}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0"
                        required
                    />
                </div>
                <button type="button" className={styles.calcLinkBtn} onClick={scrollToCalculator}>
                    לא יודעים כמה לתרום? נסו את המחשבון שלנו
                </button>
            </div>

            <div className={styles.compactDetailsGrid}>
                <div className={styles.compactField}>
                    <input
                        type="text"
                        placeholder="שם פרטי"
                        value={donor.firstName}
                        onChange={(e) => setDonor({ ...donor, firstName: e.target.value })}
                        required
                    />
                </div>
                <div className={styles.compactField}>
                    <input
                        type="text"
                        placeholder="שם משפחה"
                        value={donor.lastName}
                        onChange={(e) => setDonor({ ...donor, lastName: e.target.value })}
                        required
                    />
                </div>
                <div className={styles.compactField}>
                    <input
                        type="tel"
                        placeholder="טלפון"
                        value={donor.phone}
                        onChange={(e) => setDonor({ ...donor, phone: e.target.value })}
                        required
                    />
                </div>
                <div className={styles.compactField}>
                    <input
                        type="email"
                        placeholder="אימייל"
                        value={donor.email}
                        onChange={(e) => setDonor({ ...donor, email: e.target.value })}
                        required
                    />
                </div>
            </div>

            <button type="submit" className={styles.compactSubmitBtn}>
                אני רוצה לתרום
            </button>
        </form>
    );
};

export default CampaignCompactForm;