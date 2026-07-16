import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useForm, type SubmitHandler } from "react-hook-form";
import BaseDialog from "../../components/BaseDialog/BaseDialog";
import dialogStyles from "../../components/BaseDialog/BaseDialog.module.scss";
import styles from "./Shabbat.module.scss";
import { createShabbatRegistration } from "../../services/shabbatRegistrations.ts";

type FormState = {
    fullName: string;
    phone: string;
    email: string;
    adults: string;
    children: string;
    notes: string;
};

const initialForm: FormState = {
    fullName: "",
    phone: "",
    email: "",
    adults: "1",
    children: "0",
    notes: "",
};

const Shabbat = () => {
    const [submitted, setSubmitted] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, touchedFields, isSubmitting },
    } = useForm<FormState>({ defaultValues: initialForm, mode: "onBlur" });

    const fieldClass = (key: keyof FormState) => {
        if (!touchedFields[key]) return undefined;
        if (errors[key]) return styles.invalid;
        return styles.valid;
    };

    const onSubmit: SubmitHandler<FormState> = async (form) => {
        try {
            await createShabbatRegistration({
                fullName: form.fullName,
                phone: form.phone,
                email: form.email,
                adults: form.adults,
                children: form.children,
                notes: form.notes,
            });

            setSubmitted(true);
        } catch (err) {
            if (axios.isAxiosError(err)) {
                const responseMessage = err.response?.data?.message;
                setErrorMessage(
                    typeof responseMessage === "string"
                        ? responseMessage
                        : "אירעה שגיאה בשליחת הרישום. נסו שוב.",
                );
            } else {
                setErrorMessage("אין תקשורת עם השרת.");
            }
        }
    };

    if (submitted) {
        return (
            <main className="container">
                <div className={styles.success}>
                    <h1>נרשמתם בהצלחה ✅</h1>
                    <p>קיבלנו את הפרטים. ניצור קשר לאישור סופי.</p>

                    <div className={styles.actions}>
                        <Link to="/" className={styles.primary}>
                            חזרה לדף הבית
                        </Link>
                        <button
                            className={styles.secondary}
                            onClick={() => {
                reset(initialForm);
                setSubmitted(false);
                            }}
                        >
                            רישום נוסף
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="container">
            <div className={styles.page}>
                <Link to="/" className={styles.back}>
                    ← חזרה לדף הבית
                </Link>

                <h1 className={styles.h1}>רישום לסעודת שבת וחג</h1>
                <p className={styles.p}>נשמח לארח אתכם בבית חב״ד יפו. אנא מלאו את הפרטים ונחזור אליכם.</p>

                <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
                    <div className={styles.grid}>
                        {/* שם */}
                        <label className={styles.field}>
                            <span>שם מלא *</span>
                            <input
                                {...register("fullName", {
                                    required: "נא להזין שם מלא.",
                                    validate: (value) => value.trim().length >= 2 || "נא להזין שם מלא.",
                                })}
                                className={fieldClass("fullName")}
                            />
                            {errors.fullName && (
                                <small className={styles.error}>{errors.fullName.message}</small>
                            )}
                        </label>

                        {/* טלפון */}
                        <label className={styles.field}>
                            <span>טלפון *</span>
                            <input
                                {...register("phone", {
                                    required: "נא להזין מספר טלפון.",
                                    validate: (value) => value.replace(/\D/g, "").length >= 9 || "נא להזין מספר טלפון תקין.",
                                })}
                                inputMode="tel"
                                className={fieldClass("phone")}
                            />
                            {errors.phone && (
                                <small className={styles.error}>{errors.phone.message}</small>
                            )}
                        </label>

                        {/* אימייל */}
                        <label className={styles.field}>
                            <span>אימייל *</span>
                            <input
                                {...register("email", {
                                    required: "נא להזין אימייל.",
                                    pattern: { value: /^\S+@\S+\.\S+$/, message: "נא להזין אימייל תקין." },
                                })}
                                inputMode="email"
                                className={fieldClass("email")}
                            />
                            {errors.email && (
                                <small className={styles.error}>{errors.email.message}</small>
                            )}
                        </label>

                        {/* מבוגרים */}
                        <label className={styles.field}>
                            <span>מבוגרים *</span>
                            <select
                                {...register("adults", {
                                    validate: (value) => Number(value) >= 1 || "חובה לבחור לפחות מבוגר אחד.",
                                })}
                                className={fieldClass("adults")}
                            >
                                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                                    <option key={n}>{n}</option>
                                ))}
                            </select>
                            {errors.adults && (
                                <small className={styles.error}>{errors.adults.message}</small>
                            )}
                        </label>

                        {/* ילדים */}
                        <label className={styles.field}>
                            <span>ילדים</span>
                            <select {...register("children")}>
                                {Array.from({ length: 11 }, (_, i) => i).map((n) => (
                                    <option key={n}>{n}</option>
                                ))}
                            </select>
                        </label>

                        {/* הערות */}
                        <label className={`${styles.field} ${styles.full}`}>
                            <span>הערות</span>
                            <textarea {...register("notes")} rows={4} />
                        </label>
                    </div>

                    <div className={styles.actions}>
                        <button className={styles.primary} disabled={isSubmitting}>
                            {isSubmitting ? "שולחים..." : "שליחת רישום"}
                        </button>
                        <a href="https://www.matara.pro/nedarimplus/online/?S=aVIw" className={styles.secondary}>
                            לקחת חלק בפעילות
                        </a>
                    </div>

                    <p className={styles.note}>* הפרטים נשמרים לצורך רישום ויצירת קשר בלבד.</p>
                </form>
            </div>

            <BaseDialog
                open={errorMessage !== null}
                onClose={() => setErrorMessage(null)}
                title="לא הצלחנו לשלוח את הרישום"
            >
                <p className={dialogStyles.text}>{errorMessage}</p>
                <div className={dialogStyles.actions}>
                    <button
                        type="button"
                        className={dialogStyles.cta}
                        onClick={() => setErrorMessage(null)}
                    >
                        הבנתי
                    </button>
                </div>
            </BaseDialog>
        </main>
    );
};

export default Shabbat;
