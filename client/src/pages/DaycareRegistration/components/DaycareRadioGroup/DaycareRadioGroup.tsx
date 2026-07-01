import type { FieldErrors, UseFormRegister } from "react-hook-form";
import type { DaycareRegistrationFormValues } from "../../../../types/daycareRegistration";
import styles from "./DaycareRadioGroup.module.scss";

type RadioFieldName =
    | "requiredHours";

type Props = {
    error: FieldErrors<DaycareRegistrationFormValues>[RadioFieldName];
    fieldName: RadioFieldName;
    options: readonly string[];
    register: UseFormRegister<DaycareRegistrationFormValues>;
    title: string;
    validationMessage: string;
};

const DaycareRadioGroup = ({
    error,
    fieldName,
    options,
    register,
    title,
    validationMessage,
}: Props) => (
    <fieldset className={styles.optionGroup}>
        <legend className={styles.groupTitle}>
            {title}
        </legend>

        <div className={styles.options}>
            {options.map((option) => (
                <label className={styles.radioOption} key={option}>
                    <input
                        className={styles.radioInput}
                        type="radio"
                        value={option}
                        {...register(fieldName, {
                            required: validationMessage,
                        })}
                    />
                    <span className={styles.radioText}>
                        {option}
                    </span>
                </label>
            ))}
        </div>

        <span className={styles.errorText}>
            {error?.message || ""}
        </span>
    </fieldset>
);

export default DaycareRadioGroup;
