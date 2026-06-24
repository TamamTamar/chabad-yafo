import type { FieldErrors, UseFormRegister } from "react-hook-form";
import type { DaycareRegistrationFormValues } from "../../../../types/daycareRegistration";
import styles from "./DaycareChildFields.module.scss";

type Props = {
    errors: FieldErrors<DaycareRegistrationFormValues>;
    register: UseFormRegister<DaycareRegistrationFormValues>;
};

const DaycareChildFields = ({ errors, register }: Props) => (
    <div className={styles.row}>
        <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="childName">
                שם הילד/ה
                <span className={styles.required}>(חובה)</span>
            </label>
            <input
                id="childName"
                className={styles.fieldInput}
                type="text"
                {...register("childName", {
                    required: "יש למלא את שם הילד/ה",
                })}
            />
            <span className={styles.errorText}>
                {errors.childName?.message || ""}
            </span>
        </div>

        <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="birthDate">
                תאריך לידה
                <span className={styles.required}>(חובה)</span>
            </label>
            <input
                id="birthDate"
                className={styles.fieldInput}
                type="date"
                {...register("birthDate", {
                    required: "יש לבחור תאריך לידה",
                })}
            />
            <span className={styles.errorText}>
                {errors.birthDate?.message || ""}
            </span>
        </div>
    </div>
);

export default DaycareChildFields;
