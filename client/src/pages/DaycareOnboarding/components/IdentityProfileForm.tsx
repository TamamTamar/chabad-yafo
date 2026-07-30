import { useEffect, useMemo } from "react";
import {
    useFieldArray,
    useForm,
    useWatch,
    type SubmitHandler,
} from "react-hook-form";
import type {
    DaycareGuardianSummary,
    DaycareIdentityProfile,
    SubmitDaycareIdentityProfilePayload,
} from "../../../types/daycareOnboarding";
import styles from "../DaycareOnboarding.module.scss";

type IdentityProfileFormProps = {
    initialProfile?: DaycareIdentityProfile;
    prefill?: {
        guardianFullName?: string;
        guardianPhone?: string;
    };
    isSubmitting: boolean;
    errorMessage?: string;
    onSubmit: (profile: SubmitDaycareIdentityProfilePayload) => Promise<void>;
};

const emptyGuardian = (): DaycareGuardianSummary => ({
    fullName: "",
    role: "",
    roleDetails: "",
    phone: "",
    email: "",
});

const relationshipOptions = [
    { value: "mother", label: "אמא" },
    { value: "father", label: "אבא" },
    { value: "guardian", label: "אפוטרופוס/ית" },
    { value: "grandfather", label: "סבא" },
    { value: "grandmother", label: "סבתא" },
    { value: "other", label: "אחר" },
];

const RequiredFieldLabel = ({ children }: { children: string }) => (
    <span className={styles.profileLabelText}>
        {children}
        <span className={styles.fieldQualifierText}>(חובה)</span>
    </span>
);

const OptionalFieldLabel = ({ children }: { children: string }) => (
    <span className={styles.profileLabelText}>
        {children}
        <span className={styles.fieldQualifierText}>(אופציונלי)</span>
    </span>
);

const normalizeInitialProfile = (
    profile?: DaycareIdentityProfile,
    prefill?: IdentityProfileFormProps["prefill"]
): SubmitDaycareIdentityProfilePayload => ({
    child: {
        firstName: profile?.child.firstName ?? "",
        lastName: profile?.child.lastName ?? "",
        birthDate: profile?.child.birthDate?.slice(0, 10) ?? "",
    },
    guardians: profile?.guardians.length
        ? profile.guardians.map((guardian) => ({ ...guardian }))
        : [
              {
                  ...emptyGuardian(),
                  fullName: prefill?.guardianFullName ?? "",
                  phone: prefill?.guardianPhone ?? "",
              },
          ],
    address: {
        city: profile?.address.city ?? "",
        street: profile?.address.street ?? "",
        houseNumber: profile?.address.houseNumber ?? "",
        apartment: profile?.address.apartment ?? "",
    },
});

const IdentityProfileForm = ({
    initialProfile,
    prefill,
    isSubmitting,
    errorMessage,
    onSubmit,
}: IdentityProfileFormProps) => {
    const initialValue = useMemo(
        () => normalizeInitialProfile(initialProfile, prefill),
        [initialProfile, prefill]
    );
    const {
        control,
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<SubmitDaycareIdentityProfilePayload>({
        defaultValues: initialValue,
        mode: "onBlur",
    });
    const { fields: guardianFields, append, remove } = useFieldArray({
        control,
        name: "guardians",
    });
    const guardians = useWatch({ control, name: "guardians" });
    const showSecondGuardian = guardianFields.length > 1;
    const isEditingSavedProfile = Boolean(initialProfile);

    useEffect(() => {
        reset(initialValue);
    }, [initialValue, reset]);

    const handleSecondGuardianToggle = () => {
        if (showSecondGuardian) {
            remove(1);
        } else {
            append(emptyGuardian());
        }
    };

    const submitProfile: SubmitHandler<SubmitDaycareIdentityProfilePayload> = async (form) => {
        await onSubmit({
            ...form,
            guardians: form.guardians.map((guardian) => ({
                ...guardian,
                roleDetails:
                    guardian.role === "other"
                        ? guardian.roleDetails?.trim()
                        : undefined,
                email: guardian.email?.trim() || undefined,
            })),
            address: {
                ...form.address,
                apartment: form.address.apartment?.trim() || undefined,
            },
        });
    };

    return (
        <section className={styles.profileFormCard} aria-labelledby="profile-form-title">
            <div className={styles.profileFormHeader}>
                <span className={styles.profileFormEyebrow}>
                    {isEditingSavedProfile ? "אפשר לערוך עד השליחה הסופית" : "השלב הבא"}
                </span>
                <h2 className={styles.profileFormTitle} id="profile-form-title">
                    מילוי פרטי הילד וההורים
                </h2>
                <p className={styles.profileFormIntro}>
                    מלאו את הפרטים ושלחו אותם לצוות המעון לבדיקה. שדות החובה
                    מסומנים לצד שם השדה.
                </p>
            </div>

            <form className={styles.profileForm} noValidate onSubmit={handleSubmit(submitProfile)}>
                <fieldset className={styles.profileFieldset} disabled={isSubmitting}>
                    <legend className={styles.profileLegend}>פרטי הילד</legend>
                    <div className={styles.profileFieldsGrid}>
                        <label className={styles.profileLabel}>
                            <RequiredFieldLabel>שם פרטי</RequiredFieldLabel>
                            <input
                                className={styles.profileInput}
                                type="text"
                                autoComplete="given-name"
                                maxLength={100}
                                {...register("child.firstName", { required: "יש להזין שם פרטי" })}
                            />
                            <span className={styles.formFieldError} role="alert">{errors.child?.firstName?.message || ""}</span>
                        </label>
                        <label className={styles.profileLabel}>
                            <RequiredFieldLabel>שם משפחה</RequiredFieldLabel>
                            <input
                                className={styles.profileInput}
                                type="text"
                                autoComplete="family-name"
                                maxLength={100}
                                {...register("child.lastName", { required: "יש להזין שם משפחה" })}
                            />
                            <span className={styles.formFieldError} role="alert">{errors.child?.lastName?.message || ""}</span>
                        </label>
                        <label className={styles.profileLabel}>
                            <RequiredFieldLabel>תאריך לידה</RequiredFieldLabel>
                            <input
                                className={styles.profileInput}
                                type="date"
                                max={new Date().toISOString().slice(0, 10)}
                                {...register("child.birthDate", { required: "יש לבחור תאריך לידה" })}
                            />
                            <span className={styles.formFieldError} role="alert">{errors.child?.birthDate?.message || ""}</span>
                        </label>
                    </div>
                </fieldset>

                <fieldset className={styles.profileFieldset} disabled={isSubmitting}>
                    <legend className={styles.profileLegend}>כתובת מגורים</legend>
                    <div className={styles.profileFieldsGrid}>
                        <label className={styles.profileLabel}>
                            <RequiredFieldLabel>עיר</RequiredFieldLabel>
                            <input className={styles.profileInput} type="text" autoComplete="address-level2" maxLength={100} {...register("address.city", { required: "יש להזין עיר" })} />
                            <span className={styles.formFieldError} role="alert">{errors.address?.city?.message || ""}</span>
                        </label>
                        <label className={styles.profileLabel}>
                            <RequiredFieldLabel>רחוב</RequiredFieldLabel>
                            <input className={styles.profileInput} type="text" autoComplete="address-line1" maxLength={160} {...register("address.street", { required: "יש להזין רחוב" })} />
                            <span className={styles.formFieldError} role="alert">{errors.address?.street?.message || ""}</span>
                        </label>
                        <label className={styles.profileLabel}>
                            <RequiredFieldLabel>מספר בית</RequiredFieldLabel>
                            <input className={styles.profileInput} type="text" inputMode="numeric" maxLength={20} {...register("address.houseNumber", { required: "יש להזין מספר בית" })} />
                            <span className={styles.formFieldError} role="alert">{errors.address?.houseNumber?.message || ""}</span>
                        </label>
                        <label className={styles.profileLabel}>
                            <OptionalFieldLabel>דירה</OptionalFieldLabel>
                            <input className={styles.profileInput} type="text" inputMode="numeric" maxLength={20} {...register("address.apartment")} />
                            <span className={styles.formFieldError}>{""}</span>
                        </label>
                    </div>
                </fieldset>

                {guardianFields.map((guardian, index) => (
                    <fieldset className={styles.profileFieldset} disabled={isSubmitting} key={guardian.id}>
                        <legend className={styles.profileLegend}>
                            הורה/אפוטרופוס {index + 1}
                            {index === 1 ? <span className={styles.fieldQualifierText}> (אופציונלי)</span> : null}
                        </legend>
                        <div className={styles.profileFieldsGrid}>
                            <label className={styles.profileLabel}>
                                <RequiredFieldLabel>שם מלא</RequiredFieldLabel>
                                <input className={styles.profileInput} type="text" autoComplete="name" maxLength={160} {...register(`guardians.${index}.fullName`, { required: "יש להזין שם מלא" })} />
                                <span className={styles.formFieldError} role="alert">{errors.guardians?.[index]?.fullName?.message || ""}</span>
                            </label>
                            <label className={styles.profileLabel}>
                                <RequiredFieldLabel>קרבה לילד</RequiredFieldLabel>
                                <select className={styles.profileSelect} {...register(`guardians.${index}.role`, { required: "יש לבחור קרבה" })}>
                                    <option value="">בחירת קרבה</option>
                                    {relationshipOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                </select>
                                <span className={styles.formFieldError} role="alert">{errors.guardians?.[index]?.role?.message || ""}</span>
                            </label>
                            {guardians?.[index]?.role === "other" ? (
                                <label className={styles.profileLabel}>
                                    <RequiredFieldLabel>מה הקרבה?</RequiredFieldLabel>
                                    <input className={styles.profileInput} type="text" maxLength={100} {...register(`guardians.${index}.roleDetails`, { required: "יש לפרט את הקרבה" })} />
                                    <span className={styles.formFieldError} role="alert">{errors.guardians?.[index]?.roleDetails?.message || ""}</span>
                                </label>
                            ) : null}
                            <label className={styles.profileLabel}>
                                <RequiredFieldLabel>טלפון</RequiredFieldLabel>
                                <input className={styles.profileInput} type="tel" dir="ltr" autoComplete="tel" maxLength={30} {...register(`guardians.${index}.phone`, { required: "יש להזין טלפון", validate: (value) => value.replace(/\D/g, "").length >= 9 || "יש להזין טלפון תקין" })} />
                                <span className={styles.formFieldError} role="alert">{errors.guardians?.[index]?.phone?.message || ""}</span>
                            </label>
                            <label className={styles.profileLabel}>
                                <OptionalFieldLabel>אימייל</OptionalFieldLabel>
                                <input className={styles.profileInput} type="email" dir="ltr" autoComplete="email" maxLength={254} {...register(`guardians.${index}.email`, { pattern: { value: /^\S+@\S+\.\S+$/, message: "יש להזין אימייל תקין" } })} />
                                <span className={styles.formFieldError} role="alert">{errors.guardians?.[index]?.email?.message || ""}</span>
                            </label>
                        </div>
                    </fieldset>
                ))}

                <button className={styles.secondaryProfileButton} type="button" disabled={isSubmitting} onClick={handleSecondGuardianToggle}>
                    {showSecondGuardian ? "הסרת הורה/אפוטרופוס 2" : "הוספת הורה/אפוטרופוס 2"}
                </button>

                <div className={styles.profileFeedback} aria-live="assertive">
                    {errorMessage ? <p className={styles.profileError} role="alert">{errorMessage}</p> : null}
                </div>

                <button className={styles.submitProfileButton} type="submit" disabled={isSubmitting}>
                    {isSubmitting
                        ? "שומרים את הפרטים..."
                        : isEditingSavedProfile
                          ? "שמירת הפרטים המתוקנים"
                          : "שליחת הפרטים לבדיקה"}
                </button>
            </form>
        </section>
    );
};

export default IdentityProfileForm;
