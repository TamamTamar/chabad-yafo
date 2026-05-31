import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import styles from "../Families.module.scss";
import { ages, areas, interests } from "../data";
import { createFamily } from "../../../services/familyService";
import SuccessModal from "./SuccessModal";

type FormValues = {
    parentName: string;
    phone: string;
    area: string;
    ages: string[];
    interests: string[];
    missing: string;
    updates: boolean;
};

const SurveyForm = () => {
    const [isSuccess, setIsSuccess] = useState(false);

    const closeModal = () => {
        setIsSuccess(false);
    };

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({
        defaultValues: {
            ages: [],
            interests: [],
            updates: true,
        },
    });

    const onSubmit: SubmitHandler<FormValues> = async (data) => {
        try {
            await createFamily(data);

            reset();
            setIsSuccess(true);

            window.scrollTo({
                top: 0,
                behavior: "smooth",
            });
        } catch (error) {
            console.error("Failed to submit form:", error);
        }
    };

    return (
        <section className={styles.formSection} id="form">
            <div className={styles.formBox}>
                <h2>נשמח להכיר אתכם 💛</h2>
                <p>כמה שאלות קצרות שיעזרו לנו להבין מה משפחות ביפו באמת צריכות.</p>
                {isSuccess && (
                    <SuccessModal onClose={closeModal} />
                )}
                <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
                    <label>
                        איך קוראים לכם?
                        <input
                            type="text"
                            placeholder="שם ההורה"
                            {...register("parentName", {
                                required: "נשמח לדעת איך קוראים לכם",
                            })}
                        />
                        {errors.parentName && (
                            <span className={styles.error}>{errors.parentName.message}</span>
                        )}
                    </label>

                    <label>
                        איך נוכל ליצור קשר?
                        <input
                            type="tel"
                            dir="ltr"
                            inputMode="numeric"
                            placeholder="050-1234567"
                            {...register("phone", {
                                required: "צריך מספר טלפון",
                            })}
                        />
                        {errors.phone && (
                            <span className={styles.error}>{errors.phone.message}</span>
                        )}
                    </label>

                    <label>
                        איפה אתם גרים?
                        <select
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
                        {errors.area && (
                            <span className={styles.error}>{errors.area.message}</span>
                        )}
                    </label>

                    <div className={styles.group}>
                        <h3>באיזה גילאים הילדים?</h3>

                        <div className={styles.options}>
                            {ages.map((age) => (
                                <label key={age} className={styles.checkbox}>
                                    <input
                                        type="checkbox"
                                        value={age}
                                        {...register("ages", {
                                            validate: (value) =>
                                                value.length > 0 || "בחרו לפחות קבוצת גיל אחת",
                                        })}
                                    />
                                    {age}
                                </label>
                            ))}
                        </div>

                        {errors.ages && (
                            <span className={styles.error}>{errors.ages.message}</span>
                        )}
                    </div>

                    <div className={styles.group}>
                        <h3>מה הכי מעניין אתכם?</h3>

                        <div className={styles.options}>
                            {interests.map((interest) => (
                                <label key={interest} className={styles.checkbox}>
                                    <input
                                        type="checkbox"
                                        value={interest}
                                        {...register("interests", {
                                            validate: (value) =>
                                                value.length > 0 || "בחרו לפחות תחום עניין אחד",
                                        })}
                                    />
                                    {interest}
                                </label>
                            ))}
                        </div>

                        {errors.interests && (
                            <span className={styles.error}>{errors.interests.message}</span>
                        )}
                    </div>

                    <label>
                        מה הכי חסר לכם באזור?
                        <textarea
                            placeholder="אפשר לכתוב ממש בקצרה..."
                            {...register("missing")}
                        />
                    </label>

                    <label className={styles.checkbox}>
                        <input type="checkbox" {...register("updates")} />
                        אשמח לקבל עדכונים על פעילויות ומסגרות חדשות
                    </label>

                    <button
                        type="submit"
                        className={styles.submitButton}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "שולח..." : "שליחה ✨"}
                    </button>
                </form>
            </div>

            <aside className={styles.sideBox}>
                <h2>הצטרפו לקהילת ההורים של יפו 💛</h2>
                <p>קבוצה שקטה ועדכונים על פעילויות, אירועים ותוכניות חדשות למשפחות.</p>

                <ul>
                    <li>מידע אמין ועדכונים ראשונים</li>
                    <li>פעילויות מותאמות למשפחות</li>
                    <li>יחד יוצרים קהילה חזקה ביפו</li>
                </ul>

                <strong>ביוזמת הרב לוי יצחק תמם — בית חב״ד יפו</strong>
            </aside>
        </section>
    );
};

export default SurveyForm;