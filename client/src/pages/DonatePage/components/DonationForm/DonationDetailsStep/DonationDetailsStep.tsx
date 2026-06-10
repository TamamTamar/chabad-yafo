import type {
    FieldErrors,
    UseFormRegister,
} from "react-hook-form";

import type { DonationFormValues } from "../DonationForm";

import styles from "./DonationDetailsStep.module.scss";

type DonationDetailsStepProps = {
    register: UseFormRegister<DonationFormValues>;
    errors: FieldErrors<DonationFormValues>;
    onBack: () => void;
    onNext: () => void;
};

const DonationDetailsStep = ({
    register,
    errors,
    onBack,
    onNext,
}: DonationDetailsStepProps) => {
    return (
        <section className={styles.stepContent}>
            <header className={styles.header}>
                <p className={styles.eyebrow}>
                    פרטי התורם
                </p>

                <h2 className={styles.title}>
                    כמה פרטים אחרונים
                </h2>

                <p className={styles.description}>
                    הפרטים ישמשו לשליחת קבלה על התרומה.
                </p>
            </header>

            <fieldset className={styles.fieldset}>
                <legend className={styles.srOnly}>
                    פרטים לקבלה
                </legend>

                <div className={styles.row}>
                    <label className={styles.field} htmlFor="fullName">
                        <span className={styles.labelRow}>
                            <span className={styles.fieldLabel}>
                                שם מלא
                            </span>

                            <span className={styles.required}>
                                (חובה)
                            </span>
                        </span>
                        <input
                            id="fullName"
                            className={
                                errors.fullName
                                    ? styles.inputError
                                    : styles.input
                            }
                            type="text"
                            placeholder="שם פרטי ומשפחה"
                            autoComplete="name"
                            {...register("fullName", {
                                required: "נא למלא שם מלא",
                                minLength: {
                                    value: 2,
                                    message: "השם קצר מדי",
                                },
                            })}
                        />

                        <span className={styles.errorText}>
                            {errors.fullName?.message || ""}
                        </span>

                    </label>

                    <label className={styles.field} htmlFor="phone">
                        <span className={styles.labelRow}>
                            <span className={styles.fieldLabel}>
                                טלפון
                            </span>

                            <span className={styles.required}>
                                (חובה)
                            </span>
                        </span>

                        <input
                            id="phone"
                            className={
                                errors.phone
                                    ? styles.inputError
                                    : styles.input
                            }
                            type="tel"
                            inputMode="tel"
                            placeholder="0501234567"
                            autoComplete="tel"
                            dir="ltr"
                            {...register("phone", {
                                required: "נא למלא מספר טלפון",
                                pattern: {
                                    value: /^05\d{8}$/,
                                    message: "מספר טלפון לא תקין",
                                },
                            })}
                        />

                        <span className={styles.errorText}>
                            {errors.phone?.message || ""}
                        </span>
                    </label>
                </div>

                <label className={styles.field} htmlFor="email">
                    <span className={styles.labelRow}>
                        <span className={styles.fieldLabel}>
                            אימייל לקבלה
                        </span>

                        <span className={styles.required}>
                            (חובה)
                        </span>
                    </span>

                    <input
                        id="email"
                        className={
                            errors.email
                                ? styles.inputError
                                : styles.input
                        }
                        type="email"
                        inputMode="email"
                        placeholder="name@example.com"
                        autoComplete="email"
                        dir="ltr"
                        {...register("email", {
                            required: "נא למלא אימייל לקבלה",
                            pattern: {
                                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                message: "כתובת אימייל לא תקינה",
                            },
                        })}
                    />

                    <span className={styles.errorText}>
                        {errors.email?.message || ""}
                    </span>
                </label>

                <label className={styles.field} htmlFor="dedication">
                    <span className={styles.labelRow}>
                        <span className={styles.fieldLabel}>
                            הקדשה / לזכות / לעילוי נשמת
                        </span>

                    </span>

                    <textarea
                        id="dedication"
                        className={
                            errors.dedication
                                ? styles.textareaError
                                : styles.textarea
                        }
                        placeholder="לדוגמה: לזכות משפחת כהן לברכה והצלחה"
                        {...register("dedication", {
                            maxLength: {
                                value: 250,
                                message: "עד 250 תווים",
                            },
                        })}
                    />

                    <span className={styles.errorText}>
                        {errors.dedication?.message || ""}
                    </span>
                </label>
            </fieldset>

            <footer className={styles.stepActions}>
                <button
                    type="button"
                    className={styles.backButton}
                    onClick={onBack}
                >
                    חזרה
                </button>
                <button
                    type="button"
                    className={styles.submitButton}
                    onClick={onNext}
                >
                    המשך לתשלום
                </button>


            </footer>
        </section>
    );
};

export default DonationDetailsStep;