import { useEffect, useMemo } from "react";
import { useFieldArray, useForm, type SubmitHandler } from "react-hook-form";
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
        watch,
        formState: { errors },
    } = useForm<SubmitDaycareIdentityProfilePayload>({
        defaultValues: initialValue,
        mode: "onBlur",
    });
    const { fields: guardianFields, append, remove } = useFieldArray({
        control,
        name: "guardians",
    });
    const guardians = watch("guardians");
    const showSecondGuardian = guardianFields.length > 1;

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
                <span className={styles.profileFormEyebrow}>השלב הבא</span>
                <h2 className={styles.profileFormTitle} id="profile-form-title">
                    מילוי פרטי הילד וההורים
                </h2>
                <p className={styles.profileFormIntro}>
                    מלאו את הפרטים ושלחו אותם לצוות המעון לבדיקה. שדות המסומנים
                    בכוכבית הם שדות חובה.
                </p>
            </div>

            <form className={styles.profileForm} noValidate onSubmit={handleSubmit(submitProfile)}>
                <fieldset className={styles.profileFieldset} disabled={isSubmitting}>
                    <legend className={styles.profileLegend}>פרטי הילד</legend>
                    <div className={styles.profileFieldsGrid}>
                        <label className={styles.profileLabel}>
                            שם פרטי <span aria-hidden="true">*</span>
                            <input
                                className={styles.profileInput}
                                type="text"
                                autoComplete="given-name"
                                maxLength={100}
                                {...register("child.firstName", { required: "יש להזין שם פרטי" })}
                            />
                            {errors.child?.firstName ? <span className={styles.profileError}>{errors.child.firstName.message}</span> : null}
                        </label>
                        <label className={styles.profileLabel}>
                            שם משפחה <span aria-hidden="true">*</span>
                            <input
                                className={styles.profileInput}
                                type="text"
                                autoComplete="family-name"
                                maxLength={100}
                                {...register("child.lastName", { required: "יש להזין שם משפחה" })}
                            />
                            {errors.child?.lastName ? <span className={styles.profileError}>{errors.child.lastName.message}</span> : null}
                        </label>
                        <label className={styles.profileLabel}>
                            תאריך לידה <span aria-hidden="true">*</span>
                            <input
                                className={styles.profileInput}
                                type="date"
                                max={new Date().toISOString().slice(0, 10)}
                                {...register("child.birthDate", { required: "יש לבחור תאריך לידה" })}
                            />
                            {errors.child?.birthDate ? <span className={styles.profileError}>{errors.child.birthDate.message}</span> : null}
                        </label>
                    </div>
                </fieldset>

                <fieldset className={styles.profileFieldset} disabled={isSubmitting}>
                    <legend className={styles.profileLegend}>כתובת מגורים</legend>
                    <div className={styles.profileFieldsGrid}>
                        <label className={styles.profileLabel}>
                            עיר <span aria-hidden="true">*</span>
                            <input className={styles.profileInput} type="text" autoComplete="address-level2" maxLength={100} {...register("address.city", { required: "יש להזין עיר" })} />
                            {errors.address?.city ? <span className={styles.profileError}>{errors.address.city.message}</span> : null}
                        </label>
                        <label className={styles.profileLabel}>
                            רחוב <span aria-hidden="true">*</span>
                            <input className={styles.profileInput} type="text" autoComplete="address-line1" maxLength={160} {...register("address.street", { required: "יש להזין רחוב" })} />
                            {errors.address?.street ? <span className={styles.profileError}>{errors.address.street.message}</span> : null}
                        </label>
                        <label className={styles.profileLabel}>
                            מספר בית <span aria-hidden="true">*</span>
                            <input className={styles.profileInput} type="text" inputMode="numeric" maxLength={20} {...register("address.houseNumber", { required: "יש להזין מספר בית" })} />
                            {errors.address?.houseNumber ? <span className={styles.profileError}>{errors.address.houseNumber.message}</span> : null}
                        </label>
                        <label className={styles.profileLabel}>
                            דירה (אופציונלי)
                            <input className={styles.profileInput} type="text" inputMode="numeric" maxLength={20} {...register("address.apartment")} />
                        </label>
                    </div>
                </fieldset>

                {guardianFields.map((guardian, index) => (
                    <fieldset className={styles.profileFieldset} disabled={isSubmitting} key={guardian.id}>
                        <legend className={styles.profileLegend}>
                            הורה/אפוטרופוס {index + 1}{index === 1 ? " — אופציונלי" : ""}
                        </legend>
                        <div className={styles.profileFieldsGrid}>
                            <label className={styles.profileLabel}>
                                שם מלא <span aria-hidden="true">*</span>
                                <input className={styles.profileInput} type="text" autoComplete="name" maxLength={160} {...register(`guardians.${index}.fullName`, { required: "יש להזין שם מלא" })} />
                                {errors.guardians?.[index]?.fullName ? <span className={styles.profileError}>{errors.guardians[index]?.fullName?.message}</span> : null}
                            </label>
                            <label className={styles.profileLabel}>
                                קרבה לילד <span aria-hidden="true">*</span>
                                <select className={styles.profileSelect} {...register(`guardians.${index}.role`, { required: "יש לבחור קרבה" })}>
                                    <option value="">בחירת קרבה</option>
                                    {relationshipOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                </select>
                                {errors.guardians?.[index]?.role ? <span className={styles.profileError}>{errors.guardians[index]?.role?.message}</span> : null}
                            </label>
                            {guardians?.[index]?.role === "other" ? (
                                <label className={styles.profileLabel}>
                                    מה הקרבה? <span aria-hidden="true">*</span>
                                    <input className={styles.profileInput} type="text" maxLength={100} {...register(`guardians.${index}.roleDetails`, { required: "יש לפרט את הקרבה" })} />
                                    {errors.guardians?.[index]?.roleDetails ? <span className={styles.profileError}>{errors.guardians[index]?.roleDetails?.message}</span> : null}
                                </label>
                            ) : null}
                            <label className={styles.profileLabel}>
                                טלפון <span aria-hidden="true">*</span>
                                <input className={styles.profileInput} type="tel" dir="ltr" autoComplete="tel" maxLength={30} {...register(`guardians.${index}.phone`, { required: "יש להזין טלפון", validate: (value) => value.replace(/\D/g, "").length >= 9 || "יש להזין טלפון תקין" })} />
                                {errors.guardians?.[index]?.phone ? <span className={styles.profileError}>{errors.guardians[index]?.phone?.message}</span> : null}
                            </label>
                            <label className={styles.profileLabel}>
                                אימייל (אופציונלי)
                                <input className={styles.profileInput} type="email" dir="ltr" autoComplete="email" maxLength={254} {...register(`guardians.${index}.email`, { pattern: { value: /^\S+@\S+\.\S+$/, message: "יש להזין אימייל תקין" } })} />
                                {errors.guardians?.[index]?.email ? <span className={styles.profileError}>{errors.guardians[index]?.email?.message}</span> : null}
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
                    {isSubmitting ? "שולחים את הפרטים..." : "שליחת הפרטים לבדיקה"}
                </button>
            </form>
        </section>
    );
};

export default IdentityProfileForm;
