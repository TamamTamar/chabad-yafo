import { useForm, type SubmitHandler } from "react-hook-form";

import styles from "./RebbeLetterForm.module.scss";
import { createRebbeLetter } from "../../../../services/rebbeLetterService";
import { writeToRebbeConfigs } from "../../writeToRebbeConfig";

type RebbeLetterFormValues = {
    fullName: string;
    motherName: string;
    phone: string;
    email: string;
    letter: string;
    wantsUpdates: boolean;
};

type RebbeLetterFormProps = {
    onSuccess: () => void;
};

const RebbeLetterForm = ({ onSuccess }: RebbeLetterFormProps) => {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<RebbeLetterFormValues>({
        mode: "onChange",
        reValidateMode: "onChange",
        defaultValues: {
            fullName: "",
            motherName: "",
            phone: "",
            email: "",
            letter: "",
            wantsUpdates: false,
        },
    });

    const onSubmit: SubmitHandler<RebbeLetterFormValues> = async (data) => {
        try {
            await createRebbeLetter({
                ...data,
                occasion: writeToRebbeConfigs.general.occasion,
            });

            reset();
            onSuccess();
        } catch (error) {
            console.error("Failed to send Rebbe letter:", error);
        }
    };

    return (
        <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className={styles.header}>
                <h2 className={styles.title}>המכתב שלכם</h2>

                <p className={styles.subtitle}>
                    כתבו את אשר על ליבכם - בקשה, תפילה, הודיה או שם לברכה.
                </p>
            </div>

            <div className={styles.row}>
                <div className={styles.field}>
                    <label className={styles.labelText} htmlFor="fullName">
                        שם מלא
                        <span className={styles.required}>(חובה)</span>
                    </label>

                    <input
                        id="fullName"
                        className={styles.input}
                        type="text"
                        placeholder="ישראל ישראלי"
                        {...register("fullName", {
                            required: "יש להזין שם מלא",
                            minLength: {
                                value: 2,
                                message: "יש להזין לפחות 2 אותיות",
                            },
                        })}
                    />

                    <span className={styles.errorText}>
                        {errors.fullName?.message || ""}
                    </span>
                </div>

                <div className={styles.field}>
                    <label className={styles.labelText} htmlFor="motherName">
                        שם האם
                        <span className={styles.required}>(חובה)</span>
                    </label>

                    <input
                        id="motherName"
                        className={styles.input}
                        type="text"
                        placeholder="לברכה ותפילה"
                        {...register("motherName", {
                            required: "יש להזין שם האם",
                            minLength: {
                                value: 2,
                                message: "יש להזין לפחות 2 אותיות",
                            },
                        })}
                    />

                    <span className={styles.errorText}>
                        {errors.motherName?.message || ""}
                    </span>
                </div>
            </div>

            <div className={styles.row}>
                <div className={styles.field}>
                    <label className={styles.labelText} htmlFor="phone">
                        טלפון
                    </label>

                    <input
                        id="phone"
                        className={styles.input}
                        type="tel"
                        dir="ltr"
                        inputMode="numeric"
                        placeholder="0500000000"
                        {...register("phone", {
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

                <div className={styles.field}>
                    <label className={styles.labelText} htmlFor="email">
                        אימייל
                    </label>

                    <input
                        id="email"
                        className={styles.input}
                        type="email"
                        placeholder="name@example.com"
                        {...register("email", {
                            pattern: {
                                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                message: "אימייל לא תקין",
                            },
                        })}
                    />

                    <span className={styles.errorText}>
                        {errors.email?.message || ""}
                    </span>
                </div>
            </div>

            <div className={styles.field}>
                <label className={styles.labelText} htmlFor="letter">
                    תוכן המכתב
                </label>

                <textarea
                    id="letter"
                    className={styles.textarea}
                    placeholder="כתבו כאן את אשר על ליבכם..."
                    {...register("letter", {
                        maxLength: {
                            value: 1500,
                            message: "עד 1500 תווים",
                        },
                    })}
                />

                <span className={styles.errorText}>
                    {errors.letter?.message || ""}
                </span>
            </div>

            <label className={styles.checkbox}>
                <input
                    className={styles.checkboxInput}
                    type="checkbox"
                    {...register("wantsUpdates")}
                />

                <span className={styles.checkboxText}>
                    אשמח לקבל עדכונים מבית חב״ד יפו
                </span>
            </label>

            <button
                className={styles.submitButton}
                type="submit"
                disabled={isSubmitting}
            >
                {isSubmitting ? "שולח..." : "שליחת המכתב"}
            </button>
        </form>
    );
};

export default RebbeLetterForm;