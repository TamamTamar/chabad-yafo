import type { UseFormRegister } from "react-hook-form";

import type { DonationFormValues } from "../DonationForm";
import styles from "./CustomAmountField.module.scss";

type CustomAmountFieldProps = {
    register: UseFormRegister<DonationFormValues>;
};

const CustomAmountField = ({ register }: CustomAmountFieldProps) => (
    <label className={styles.field} htmlFor="amount">
        <span className={styles.fieldLabel}>סכום מותאם</span>

        <span className={styles.inputWrapper}>
            <span className={styles.currency}>₪</span>

            <input
                id="amount"
                className={styles.input}
                inputMode="numeric"
                placeholder="הקלידו סכום"
                autoFocus
                {...register("amount", {
                    required: "נא לבחור סכום תרומה",
                    validate: (value) =>
                        Number(value) >= 18 ||
                        "סכום התרומה המינימלי הוא ₪18",
                    onChange: (event) => {
                        event.target.value = event.target.value.replace(
                            /[^\d]/g,
                            ""
                        );
                    },
                })}
            />
        </span>
    </label>
);

export default CustomAmountField;
