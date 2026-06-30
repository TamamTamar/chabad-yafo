import { useRef } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { createDaycareRegistration } from "../../../../services/daycareRegistrationService";
import {
    trackDaycareFormStart,
    trackDaycareFormSubmit,
    trackDaycareRegistrationSubmit,
} from "../../../../services/googleAnalyticsService";
import { trackLead } from "../../../../services/metaPixelService";
import type { DaycareRegistrationFormValues } from "../../../../types/daycareRegistration";
import { requiredHoursOptions } from "../../daycareRegistrationOptions";
import DaycareContactFields from "../DaycareContactFields/DaycareContactFields";
import DaycareNotesField from "../DaycareNotesField/DaycareNotesField";
import DaycareRadioGroup from "../DaycareRadioGroup/DaycareRadioGroup";
import styles from "./DaycareRegistrationForm.module.scss";

type Props = {
    onSuccess: () => void;
};

const DaycareRegistrationForm = ({ onSuccess }: Props) => {
    const hasTrackedFormStart = useRef(false);
    const {
        register,
        handleSubmit,
        reset,
        setError,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<DaycareRegistrationFormValues>({
        mode: "onChange",
        reValidateMode: "onChange",
        defaultValues: {
            requiredHours: "עד 15:30",
            fridayCare: "לא",
            costApproval: false,
        },
    });
    const selectedRequiredHours = watch("requiredHours");

    const handleFormStart = () => {
        if (hasTrackedFormStart.current) {
            return;
        }

        hasTrackedFormStart.current = true;
        trackDaycareFormStart({
            content_name: "daycare_registration",
            location: "daycare_form",
        });
    };

    const onSubmit: SubmitHandler<DaycareRegistrationFormValues> = async (
        data
    ) => {
        try {
            await createDaycareRegistration({
                ...data,
                phone: data.phone.replace(/\D/g, ""),
                email: data.email?.trim() || undefined,
                notes: data.notes?.trim() || undefined,
                childAge: data.childAge.trim(),
                requiredHoursOther:
                    data.requiredHours === "אחר"
                        ? data.requiredHoursOther?.trim()
                        : undefined,
            });

            trackLead({
                content_name: "daycare_registration",
                content_category: "daycare",
            });
            trackDaycareRegistrationSubmit({
                content_name: "daycare_registration",
                required_hours: data.requiredHours,
                child_age: data.childAge,
            });
            trackDaycareFormSubmit({
                content_name: "daycare_registration",
                required_hours: data.requiredHours,
                child_age: data.childAge,
            });

            reset();
            onSuccess();
        } catch (error) {
            console.error("Failed to submit daycare registration:", error);
            setError("root", {
                type: "server",
                message:
                    "אירעה שגיאה בשליחת הטופס. בדקו את הפרטים ונסו שוב.",
            });
        }
    };

    return (
        <section
            className={styles.formSection}
            id="daycare-form"
            aria-labelledby="form-title"
        >
            <div className={styles.formBox}>
                <div className={styles.formHeader}>
                    <h2 className={styles.formTitle} id="form-title">
                        השאירו פרטים לרישום מוקדם
                    </h2>
                    <p className={styles.formIntro}>
                        מלאו כמה פרטים בסיסיים ונחזור אליכם לשיחת היכרות
                        קצרה על המעון, השעות והמקומות הפנויים.
                    </p>
                </div>

                <form
                    className={styles.form}
                    onFocus={handleFormStart}
                    onSubmit={handleSubmit(onSubmit)}
                >
                    <DaycareContactFields errors={errors} register={register} />

                    <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel} htmlFor="childAge">
                            גיל הילד/ה
                            <span className={styles.required}>(חובה)</span>
                        </label>
                        <input
                            id="childAge"
                            className={styles.fieldInput}
                            type="text"
                            placeholder="לדוגמה: שנה וחצי"
                            autoComplete="off"
                            {...register("childAge", {
                                required: "יש למלא גיל הילד/ה",
                                maxLength: {
                                    value: 80,
                                    message: "אפשר לכתוב עד 80 תווים",
                                },
                            })}
                        />
                        <span className={styles.errorText}>
                            {errors.childAge?.message || ""}
                        </span>
                    </div>

                    <DaycareRadioGroup
                        error={errors.requiredHours}
                        fieldName="requiredHours"
                        options={requiredHoursOptions}
                        register={register}
                        title="שעות מועדפות"
                        validationMessage="יש לבחור שעות מועדפות"
                    />

                    {selectedRequiredHours === "אחר" && (
                        <div className={styles.fieldGroup}>
                            <label
                                className={styles.fieldLabel}
                                htmlFor="requiredHoursOther"
                            >
                                פירוט שעות נדרשות
                                <span className={styles.required}>
                                    (חובה)
                                </span>
                            </label>
                            <input
                                id="requiredHoursOther"
                                className={styles.fieldInput}
                                type="text"
                                placeholder="לדוגמה: עד 17:00"
                                {...register("requiredHoursOther", {
                                    validate: (value) =>
                                        selectedRequiredHours !== "אחר" ||
                                        Boolean(value?.trim()) ||
                                        "יש למלא את השעות הרצויות",
                                    maxLength: {
                                        value: 80,
                                        message: "אפשר לכתוב עד 80 תווים",
                                    },
                                })}
                            />
                            <span className={styles.errorText}>
                                {errors.requiredHoursOther?.message || ""}
                            </span>
                        </div>
                    )}

                    <DaycareNotesField errors={errors} register={register} />

                    <p className={styles.reassurance}>
                        השארת פרטים אינה מחייבת. נחזור אליכם לשיחת היכרות קצרה.
                    </p>

                    <span className={styles.formError}>
                        {errors.root?.message || ""}
                    </span>

                    <button
                        type="submit"
                        className={styles.submitButton}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "שולח..." : "השאירו פרטים"}
                    </button>
                </form>
            </div>
        </section>
    );
};

export default DaycareRegistrationForm;
