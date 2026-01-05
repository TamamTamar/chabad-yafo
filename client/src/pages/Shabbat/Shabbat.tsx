import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
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
    const [form, setForm] = useState<FormState>(initialForm);
    const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
    const [submitted, setSubmitted] = useState(false);

    const errors = useMemo(() => {
        const e: Partial<Record<keyof FormState, string>> = {};

        if (form.fullName.trim().length < 2) e.fullName = "נא להזין שם מלא.";
        if (form.phone.replace(/\D/g, "").length < 9) e.phone = "נא להזין מספר טלפון תקין.";
        if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "נא להזין אימייל תקין.";
        if (Number(form.adults) < 1) e.adults = "חובה לבחור לפחות מבוגר אחד.";

        return e;
    }, [form]);

    const isValid = Object.keys(errors).length === 0;

    const onChange =
        (key: keyof FormState) =>
            (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
                setForm((prev) => ({ ...prev, [key]: e.target.value }));
            };

    const onBlur = (key: keyof FormState) => () => {
        setTouched((prev) => ({ ...prev, [key]: true }));
    };

    const fieldClass = (key: keyof FormState) => {
        if (!touched[key]) return undefined;
        if (errors[key]) return styles.invalid;
        return styles.valid;
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isValid) {
            setTouched({
                fullName: true,
                phone: true,
                email: true,
                adults: true,
            });
            return;
        }

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
                alert(err.response?.data?.message ?? "אירעה שגיאה בשליחת הרישום. נסו שוב.");
            } else {
                alert("אין תקשורת עם השרת.");
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
                                setForm(initialForm);
                                setTouched({});
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

                <form className={styles.form} onSubmit={onSubmit} noValidate>
                    <div className={styles.grid}>
                        {/* שם */}
                        <label className={styles.field}>
                            <span>שם מלא *</span>
                            <input
                                value={form.fullName}
                                onChange={onChange("fullName")}
                                onBlur={onBlur("fullName")}
                                className={fieldClass("fullName")}
                            />
                            {touched.fullName && errors.fullName && (
                                <small className={styles.error}>{errors.fullName}</small>
                            )}
                        </label>

                        {/* טלפון */}
                        <label className={styles.field}>
                            <span>טלפון *</span>
                            <input
                                value={form.phone}
                                onChange={onChange("phone")}
                                onBlur={onBlur("phone")}
                                inputMode="tel"
                                className={fieldClass("phone")}
                            />
                            {touched.phone && errors.phone && (
                                <small className={styles.error}>{errors.phone}</small>
                            )}
                        </label>

                        {/* אימייל */}
                        <label className={styles.field}>
                            <span>אימייל *</span>
                            <input
                                value={form.email}
                                onChange={onChange("email")}
                                onBlur={onBlur("email")}
                                inputMode="email"
                                className={fieldClass("email")}
                            />
                            {touched.email && errors.email && (
                                <small className={styles.error}>{errors.email}</small>
                            )}
                        </label>

                        {/* מבוגרים */}
                        <label className={styles.field}>
                            <span>מבוגרים *</span>
                            <select
                                value={form.adults}
                                onChange={onChange("adults")}
                                onBlur={onBlur("adults")}
                                className={fieldClass("adults")}
                            >
                                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                                    <option key={n}>{n}</option>
                                ))}
                            </select>
                            {touched.adults && errors.adults && (
                                <small className={styles.error}>{errors.adults}</small>
                            )}
                        </label>

                        {/* ילדים */}
                        <label className={styles.field}>
                            <span>ילדים</span>
                            <select value={form.children} onChange={onChange("children")}>
                                {Array.from({ length: 11 }, (_, i) => i).map((n) => (
                                    <option key={n}>{n}</option>
                                ))}
                            </select>
                        </label>

                        {/* הערות */}
                        <label className={`${styles.field} ${styles.full}`}>
                            <span>הערות</span>
                            <textarea value={form.notes} onChange={onChange("notes")} rows={4} />
                        </label>
                    </div>

                    <div className={styles.actions}>
                        <button className={styles.primary} disabled={!isValid}>
                            שליחת רישום
                        </button>
                        <a href="#donate" className={styles.secondary}>
                            תרומה לפעילות
                        </a>
                    </div>

                    <p className={styles.note}>* הפרטים נשמרים לצורך רישום ויצירת קשר בלבד.</p>
                </form>
            </div>
        </main>
    );
};

export default Shabbat;
