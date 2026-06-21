import type { FieldError, UseFormRegister } from "react-hook-form";

import type { FormValues } from "../../../../types/family";
import styles from "./SurveyForm.module.scss";

type CheckboxFieldName = "ages" | "interests";

type SurveyCheckboxGroupProps = {
    error?: FieldError;
    fieldName: CheckboxFieldName;
    options: string[];
    title: string;
    validationMessage: string;
};

type Props = SurveyCheckboxGroupProps & {
    register: UseFormRegister<FormValues>;
};

const SurveyCheckboxGroup = ({
    error,
    fieldName,
    options,
    register,
    title,
    validationMessage,
}: Props) => (
    <div className={styles.group}>
        <h3 className={styles.groupTitle}>
            {title}
            <span className={styles.optionalNote}>(ניתן לבחור יותר מאחת)</span>
        </h3>

        <div className={styles.options}>
            {options.map((option) => (
                <label key={option} className={styles.checkbox}>
                    <input
                        className={styles.checkboxInput}
                        type="checkbox"
                        value={option}
                        {...register(fieldName, {
                            validate: (value) =>
                                value.length > 0 || validationMessage,
                        })}
                    />
                    <span className={styles.checkboxText}>{option}</span>
                </label>
            ))}
        </div>

        <span className={styles.errorText}>{error?.message || ""}</span>
    </div>
);

export default SurveyCheckboxGroup;
