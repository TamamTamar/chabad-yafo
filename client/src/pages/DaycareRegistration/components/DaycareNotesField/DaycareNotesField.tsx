import type { FieldErrors, UseFormRegister } from "react-hook-form";
import type { DaycareRegistrationFormValues } from "../../../../types/daycareRegistration";
import styles from "./DaycareNotesField.module.scss";

type Props = {
    errors: FieldErrors<DaycareRegistrationFormValues>;
    register: UseFormRegister<DaycareRegistrationFormValues>;
};

const DaycareNotesField = ({ errors, register }: Props) => (
    <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel} htmlFor="notes">
            הערות נוספות
        </label>
        <textarea
            id="notes"
            className={styles.fieldTextarea}
            rows={4}
            {...register("notes", {
                maxLength: {
                    value: 700,
                    message: "אפשר לכתוב עד 700 תווים",
                },
            })}
        />
        <span className={styles.errorText}>
            {errors.notes?.message || ""}
        </span>
    </div>
);

export default DaycareNotesField;
