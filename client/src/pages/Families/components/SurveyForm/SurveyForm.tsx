import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import styles from "./SurveyForm.module.scss";
import type { FormValues } from "../../../../types/family";
import { createFamily } from "../../../../services/familyService";
import SuccessModal from "./SuccessModal/SuccessModal";
import { ages, areas, interests } from "../../data";
import CommunityBox from "../CommunityBox/CommunityBox";

const SurveyForm = () => {
    const [isSuccess, setIsSuccess] = useState(false);

    const closeModal = () => {
        setIsSuccess(false);
    };

    const {
        register,
        handleSubmit,
        reset,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({
        mode: "onChange",
        reValidateMode: "onChange",

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
        } catch (error: any) {
            if (error?.response?.status === 409) {
                setError("phone", {
                    type: "server",
                    message: "הטלפון הזה כבר רשום במערכת",
                });

                const phoneInput = document.getElementById("phone");

                phoneInput?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                });

                (phoneInput as HTMLInputElement)?.focus();

                return;
            }

            console.error("Failed to submit form:", error);
        }
    };

    return (
        <section className={styles.formSection} id="form">
            {isSuccess && <SuccessModal onClose={closeModal} />}
            <div className={styles.formBox}>
                <h2 className={styles.formTitle}>ספרו לנו על המשפחה שלכם 💛</h2>

                <p className={styles.formIntro}>
                    כמה פרטים קצרים שיעזרו לנו לבנות פעילות מתאימה למשפחות ביפו.
                </p>



                <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
                    <div className={styles.row}>
                        <div className={styles.fieldGroup}>
                            <label className={styles.fieldLabel} htmlFor="parentName">
                                איך קוראים לכם?
                                <span className={styles.required}>(חובה)</span>
                            </label>

                            <input
                                id="parentName"
                                className={styles.fieldInput}
                                type="text"
                                placeholder="שם ההורה"
                                {...register("parentName", {
                                    required: "נשמח לדעת איך קוראים לכם",
                                    minLength: {
                                        value: 2,
                                        message: "השם קצר מדי",
                                    },
                                    pattern: {
                                        value: /^[א-תA-Za-z]+(?:[\s'-][א-תA-Za-z]+)*$/,
                                        message: "שם יכול להכיל אותיות בלבד",
                                    },
                                })}
                            />

                            <span className={styles.errorText}>
                                {errors.parentName?.message || ""}
                            </span>
                        </div>

                        <div className={styles.fieldGroup}>
                            <label className={styles.fieldLabel} htmlFor="phone">
                                איך נוכל ליצור קשר?
                                <span className={styles.required}>(חובה)</span>
                            </label>

                            <input
                                id="phone"
                                className={styles.fieldInput}
                                type="tel"
                                dir="ltr"
                                inputMode="numeric"
                                placeholder="0501234567"
                                {...register("phone", {
                                    required: "צריך מספר טלפון",
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
                    </div>

                    <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel} htmlFor="area">
                            איפה אתם גרים?
                            <span className={styles.required}>(חובה)</span>
                        </label>

                        <select
                            id="area"
                            className={styles.fieldSelect}
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

                        <span className={styles.errorText}>
                            {errors.area?.message || ""}
                        </span>
                    </div>

                    <div className={styles.group}>
                        <h3 className={styles.groupTitle}>
                            באיזה גילאים הילדים?
                            <span className={styles.optionalNote}>
                                (ניתן לבחור יותר מאחת)
                            </span>
                        </h3>

                        <div className={styles.options}>
                            {ages.map((age) => (
                                <label key={age} className={styles.checkbox}>
                                    <input
                                        className={styles.checkboxInput}
                                        type="checkbox"
                                        value={age}
                                        {...register("ages", {
                                            validate: (value) =>
                                                value.length > 0 ||
                                                "בחרו לפחות קבוצת גיל אחת",
                                        })}
                                    />
                                    <span className={styles.checkboxText}>{age}</span>
                                </label>
                            ))}
                        </div>

                        <span className={styles.errorText}>
                            {errors.ages?.message || ""}
                        </span>
                    </div>

                    <div className={styles.group}>
                        <h3 className={styles.groupTitle}>
                            איזה פעילויות מעניינות אתכם?
                            <span className={styles.optionalNote}>
                                (ניתן לבחור יותר מאחת)
                            </span>
                        </h3>

                        <div className={styles.options}>
                            {interests.map((interest) => (
                                <label key={interest} className={styles.checkbox}>
                                    <input
                                        className={styles.checkboxInput}
                                        type="checkbox"
                                        value={interest}
                                        {...register("interests", {
                                            validate: (value) =>
                                                value.length > 0 ||
                                                "בחרו לפחות תחום עניין אחד",
                                        })}
                                    />
                                    <span className={styles.checkboxText}>{interest}</span>
                                </label>
                            ))}
                        </div>

                        <span className={styles.errorText}>
                            {errors.interests?.message || ""}
                        </span>
                    </div>

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

                    <span className={styles.errorText}>
                        {errors.root?.message || ""}
                    </span>

                    <button
                        type="submit"
                        className={styles.submitButton}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "שולח..." : "שליחה ✨"}
                    </button>
                </form>
            </div>

            <CommunityBox />
        </section>
    );
};

export default SurveyForm;