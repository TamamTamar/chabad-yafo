import type {
    FieldError,
    FieldValues,
    Path,
    UseFormRegister,
} from "react-hook-form";
import styles from "../DaycareEnrollment.module.scss";

type ConsentCheckboxProps<T extends FieldValues> = {
    error?: FieldError;
    label: string;
    name: Path<T>;
    register: UseFormRegister<T>;
    required?: boolean;
};

const ConsentCheckbox = <T extends FieldValues>({
    error,
    label,
    name,
    register,
    required,
}: ConsentCheckboxProps<T>) => (
    <label className={styles.checkboxRow}>
        <input
            type="checkbox"
            {...register(name, {
                validate: (value) =>
                    !required || value === true || "יש לאשר סעיף זה",
            })}
        />
        <span>
            {label}
            {required && <strong> *</strong>}
            <small>{error?.message || ""}</small>
        </span>
    </label>
);

export default ConsentCheckbox;
