import type { FieldErrors, UseFormRegister } from "react-hook-form";

import type { FormValues } from "../../../../types/family";
import styles from "./SurveyForm.module.scss";

type SurveyAdditionalFieldsProps = {
    errors: FieldErrors<FormValues>;
    isSubmitting: boolean;
    register: UseFormRegister<FormValues>;
};

const SurveyAdditionalFields = ({
    errors,
    isSubmitting,
    register,
}: SurveyAdditionalFieldsProps) => (
    <>
        <div className={styles.group}>
            <h3 className={styles.groupTitle}>מה הכי חסר לכם באזור?</h3>

            <textarea
                className={styles.fieldTextarea}
                placeholder="אפשר לכתוב ממש בקצרה..."
                {...register("missing", {
                    maxLength: {
                        value: 300,
                        message: "עד 300 תווים",
                    },
                })}
            />

            <span className={styles.errorText}>
                {errors.missing?.message || ""}
            </span>
        </div>

        <label className={styles.updatesCheckbox}>
            <input
                className={styles.checkboxInput}
                type="checkbox"
                {...register("updates")}
            />
            <span className={styles.updatesText}>
                אשמח לקבל עדכונים על פעילויות ומסגרות חדשות
            </span>
        </label>

        <span className={styles.errorText}>{errors.root?.message || ""}</span>

        <button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting}
        >
            {isSubmitting ? "שולח..." : "שליחה ✨"}
        </button>
    </>
);

export default SurveyAdditionalFields;
