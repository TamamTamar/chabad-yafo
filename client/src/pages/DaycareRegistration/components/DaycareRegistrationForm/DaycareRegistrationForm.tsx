import { useForm, type SubmitHandler } from "react-hook-form";
import { createDaycareRegistration } from "../../../../services/daycareRegistrationService";
import { trackDaycareRegistrationSubmit } from "../../../../services/googleAnalyticsService";
import { trackLead } from "../../../../services/metaPixelService";
import type { DaycareRegistrationFormValues } from "../../../../types/daycareRegistration";
import {
    fridayCareOptions,
    requiredHoursOptions,
} from "../../daycareRegistrationOptions";
import DaycareChildFields from "../DaycareChildFields/DaycareChildFields";
import DaycareContactFields from "../DaycareContactFields/DaycareContactFields";
import DaycareNotesField from "../DaycareNotesField/DaycareNotesField";
import DaycareRadioGroup from "../DaycareRadioGroup/DaycareRadioGroup";
import styles from "./DaycareRegistrationForm.module.scss";

type Props = {
    onSuccess: () => void;
};

const DaycareRegistrationForm = ({ onSuccess }: Props) => {
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

    const onSubmit: SubmitHandler<DaycareRegistrationFormValues> = async (
        data
    ) => {
        try {
            await createDaycareRegistration({
                ...data,
                email: data.email?.trim() || undefined,
                notes: data.notes?.trim() || undefined,
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
                friday_care: data.fridayCare,
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
                        פרטי רישום מוקדם
                    </h2>
                    <p className={styles.formIntro}>
                        נשמח לקבל כמה פרטים כדי שנוכל לחזור אליכם בהמשך עם
                        עדכון מסודר.
                    </p>
                </div>

                <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
                    <DaycareContactFields errors={errors} register={register} />
                    <DaycareChildFields errors={errors} register={register} />

                    <DaycareRadioGroup
                        error={errors.requiredHours}
                        fieldName="requiredHours"
                        options={requiredHoursOptions}
                        register={register}
                        title="שעות נדרשות"
                        validationMessage="יש לבחור שעות נדרשות"
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

                    <DaycareRadioGroup
                        error={errors.fridayCare}
                        fieldName="fridayCare"
                        options={fridayCareOptions}
                        register={register}
                        title="האם אתם מעוניינים בימי שישי?"
                        validationMessage="יש לבחור האם מעוניינים בימי שישי"
                    />

                    <label className={styles.confirmationCheckbox}>
                        <input
                            className={styles.checkboxInput}
                            type="checkbox"
                            {...register("costApproval", {
                                required:
                                    "יש לאשר שהעלות המשוערת מתאימה עבורכם",
                            })}
                        />
                        <span className={styles.checkboxText}>
                            אני מאשר/ת שעלות משוערת של כ-5,500 ₪ לחודש מתאימה
                            עבורנו
                            <span className={styles.required}> (חובה)</span>
                        </span>
                    </label>
                    <span className={styles.errorText}>
                        {errors.costApproval?.message || ""}
                    </span>

                    <DaycareNotesField errors={errors} register={register} />

                    <span className={styles.formError}>
                        {errors.root?.message || ""}
                    </span>

                    <button
                        type="submit"
                        className={styles.submitButton}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "שולח..." : "שליחת רישום מוקדם"}
                    </button>
                </form>
            </div>
        </section>
    );
};

export default DaycareRegistrationForm;
