import type { FieldErrors, UseFormRegister } from "react-hook-form";
import type { DaycareRegistrationFormValues } from "../../../../types/daycareRegistration";
import styles from "./DaycareContactFields.module.scss";

type Props = {
    errors: FieldErrors<DaycareRegistrationFormValues>;
    register: UseFormRegister<DaycareRegistrationFormValues>;
};

const DaycareContactFields = ({ errors, register }: Props) => (
    <>
        <div className={styles.row}>
            <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="parentName">
                    שם מלא של ההורה
                    <span className={styles.required}>(חובה)</span>
                </label>
                <input
                    id="parentName"
                    className={styles.fieldInput}
                    type="text"
                    autoComplete="name"
                    {...register("parentName", {
                        required: "יש למלא שם מלא של ההורה",
                        minLength: {
                            value: 2,
                            message: "השם קצר מדי",
                        },
                    })}
                />
                <span className={styles.errorText}>
                    {errors.parentName?.message || ""}
                </span>
            </div>

            <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="phone">
                    טלפון נייד
                    <span className={styles.required}>(חובה)</span>
                </label>
                <input
                    id="phone"
                    className={styles.fieldInput}
                    type="tel"
                    dir="ltr"
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="0501234567"
                    {...register("phone", {
                        required: "יש למלא טלפון נייד",
                        pattern: {
                            value: /^05\d{8}$/,
                            message:
                                "מספר נייד ישראלי צריך להתחיל ב-05 ולהכיל 10 ספרות",
                        },
                    })}
                />
                <span className={styles.errorText}>
                    {errors.phone?.message || ""}
                </span>
            </div>
        </div>

        <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="email">
                כתובת דוא"ל
            </label>
            <input
                id="email"
                className={styles.fieldInput}
                type="email"
                dir="ltr"
                autoComplete="email"
                {...register("email", {
                    pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: "כתובת דוא״ל לא תקינה",
                    },
                })}
            />
            <span className={styles.errorText}>
                {errors.email?.message || ""}
            </span>
        </div>
    </>
);

export default DaycareContactFields;
