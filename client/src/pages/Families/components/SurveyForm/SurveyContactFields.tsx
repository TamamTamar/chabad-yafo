import type { FieldErrors, UseFormRegister } from "react-hook-form";

import type { FormValues } from "../../../../types/family";
import { areas } from "../../data";
import styles from "./SurveyForm.module.scss";

type SurveyContactFieldsProps = {
    errors: FieldErrors<FormValues>;
    register: UseFormRegister<FormValues>;
};

const SurveyContactFields = ({ errors, register }: SurveyContactFieldsProps) => (
    <>
        <div className={styles.row}>
            <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="parentName">
                    איך קוראים לכם?
                    <span className={styles.required}>(חובה)</span>
                </label>

                <input
                    id="parentName"
                    className={styles.fieldInput}
                    type="text"
                    placeholder="שם ההורה"
                    {...register("parentName", {
                        required: "נשמח לדעת איך קוראים לכם",
                        minLength: {
                            value: 2,
                            message: "השם קצר מדי",
                        },
                        pattern: {
                            value: /^[א-תA-Za-z]+(?:[\s'-][א-תA-Za-z]+)*$/,
                            message: "שם יכול להכיל אותיות בלבד",
                        },
                    })}
                />

                <span className={styles.errorText}>
                    {errors.parentName?.message || ""}
                </span>
            </div>

            <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="phone">
                    איך נוכל ליצור קשר?
                    <span className={styles.required}>(חובה)</span>
                </label>

                <input
                    id="phone"
                    className={styles.fieldInput}
                    type="tel"
                    dir="ltr"
                    inputMode="numeric"
                    placeholder="0501234567"
                    {...register("phone", {
                        required: "צריך מספר טלפון",
                        pattern: {
                            value: /^05\d{8}$/,
                            message: "מספר טלפון לא תקין",
                        },
                    })}
                />

                <span className={styles.errorText}>
                    {errors.phone?.message || ""}
                </span>
            </div>
        </div>

        <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="area">
                איפה אתם גרים?
                <span className={styles.required}>(חובה)</span>
            </label>

            <select
                id="area"
                className={styles.fieldSelect}
                defaultValue=""
                {...register("area", {
                    required: "בחרו אזור מגורים",
                })}
            >
                <option value="" disabled>
                    בחרו אזור
                </option>

                {areas.map((area) => (
                    <option key={area} value={area}>
                        {area}
                    </option>
                ))}
            </select>

            <span className={styles.errorText}>{errors.area?.message || ""}</span>
        </div>
    </>
);

export default SurveyContactFields;
