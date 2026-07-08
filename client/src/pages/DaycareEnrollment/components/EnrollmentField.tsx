import type {
    FieldError,
    FieldValues,
    Path,
    RegisterOptions,
    UseFormRegister,
} from "react-hook-form";
import styles from "../DaycareEnrollment.module.scss";

type EnrollmentFieldProps<T extends FieldValues, TName extends Path<T>> = {
    error?: FieldError;
    label: string;
    name: TName;
    register: UseFormRegister<T>;
    required?: boolean;
    type?: string;
    placeholder?: string;
    autoComplete?: string;
    inputMode?: "text" | "numeric" | "tel" | "email";
    maxLength?: number;
    rows?: number;
    options?: Array<string | { value: string; label: string }>;
    validation?: RegisterOptions<T, TName>;
    digitsOnly?: boolean;
};

const EnrollmentField = <T extends FieldValues, TName extends Path<T>>({
    error,
    label,
    name,
    register,
    required,
    type = "text",
    placeholder,
    autoComplete,
    inputMode,
    maxLength,
    rows,
    options,
    validation,
    digitsOnly,
}: EnrollmentFieldProps<T, TName>) => {
    const fieldId = String(name).replace(/\./g, "-");
    const registration = register(name, validation);

    return (
        <div className={styles.field}>
            <label className={styles.label} htmlFor={fieldId}>
                {label}
                {required && <span className={styles.required}>*</span>}
            </label>

            {rows ? (
                <textarea
                    id={fieldId}
                    className={styles.textarea}
                    placeholder={placeholder}
                    rows={rows}
                    {...registration}
                />
            ) : options ? (
                <select id={fieldId} className={styles.input} {...registration}>
                    <option value="">בחירה</option>
                    {options.map((option) => (
                        <option
                            key={typeof option === "string" ? option : option.value}
                            value={typeof option === "string" ? option : option.value}
                        >
                            {typeof option === "string" ? option : option.label}
                        </option>
                    ))}
                </select>
            ) : (
                <input
                    id={fieldId}
                    className={styles.input}
                    type={type}
                    placeholder={placeholder}
                    autoComplete={autoComplete}
                    inputMode={inputMode}
                    maxLength={maxLength}
                    onInput={
                        digitsOnly
                            ? (event) => {
                                  event.currentTarget.value =
                                      event.currentTarget.value.replace(
                                          /\D/g,
                                          ""
                                      );
                              }
                            : undefined
                    }
                    {...registration}
                />
            )}

            <span className={styles.error}>{error?.message || ""}</span>
        </div>
    );
};

export default EnrollmentField;
