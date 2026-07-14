import { useMemo, useState, type FormEvent } from "react";
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
    const [form, setForm] = useState(initialValue);
    const [showSecondGuardian, setShowSecondGuardian] = useState(
        initialValue.guardians.length > 1
    );

    const updateGuardian = (
        index: number,
        field: keyof DaycareGuardianSummary,
        value: string
    ) => {
        setForm((current) => ({
            ...current,
            guardians: current.guardians.map((guardian, guardianIndex) =>
                guardianIndex === index
                    ? { ...guardian, [field]: value }
                    : guardian
            ),
        }));
    };

    const handleSecondGuardianToggle = () => {
        setShowSecondGuardian((current) => {
            const next = !current;
            setForm((formValue) => ({
                ...formValue,
                guardians: next
                    ? [formValue.guardians[0], formValue.guardians[1] ?? emptyGuardian()]
                    : [formValue.guardians[0]],
            }));
            return next;
        });
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
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

            <form className={styles.profileForm} onSubmit={(event) => void handleSubmit(event)}>
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
                                required
                                value={form.child.firstName}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        child: { ...current.child, firstName: event.target.value },
                                    }))
                                }
                            />
                        </label>
                        <label className={styles.profileLabel}>
                            שם משפחה <span aria-hidden="true">*</span>
                            <input
                                className={styles.profileInput}
                                type="text"
                                autoComplete="family-name"
                                maxLength={100}
                                required
                                value={form.child.lastName}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        child: { ...current.child, lastName: event.target.value },
                                    }))
                                }
                            />
                        </label>
                        <label className={styles.profileLabel}>
                            תאריך לידה <span aria-hidden="true">*</span>
                            <input
                                className={styles.profileInput}
                                type="date"
                                max={new Date().toISOString().slice(0, 10)}
                                required
                                value={form.child.birthDate}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        child: { ...current.child, birthDate: event.target.value },
                                    }))
                                }
                            />
                        </label>
                    </div>
                </fieldset>

                <fieldset className={styles.profileFieldset} disabled={isSubmitting}>
                    <legend className={styles.profileLegend}>כתובת מגורים</legend>
                    <div className={styles.profileFieldsGrid}>
                        <label className={styles.profileLabel}>
                            עיר <span aria-hidden="true">*</span>
                            <input className={styles.profileInput} type="text" autoComplete="address-level2" maxLength={100} required value={form.address.city} onChange={(event) => setForm((current) => ({ ...current, address: { ...current.address, city: event.target.value } }))} />
                        </label>
                        <label className={styles.profileLabel}>
                            רחוב <span aria-hidden="true">*</span>
                            <input className={styles.profileInput} type="text" autoComplete="address-line1" maxLength={160} required value={form.address.street} onChange={(event) => setForm((current) => ({ ...current, address: { ...current.address, street: event.target.value } }))} />
                        </label>
                        <label className={styles.profileLabel}>
                            מספר בית <span aria-hidden="true">*</span>
                            <input className={styles.profileInput} type="text" inputMode="numeric" maxLength={20} required value={form.address.houseNumber} onChange={(event) => setForm((current) => ({ ...current, address: { ...current.address, houseNumber: event.target.value } }))} />
                        </label>
                        <label className={styles.profileLabel}>
                            דירה (אופציונלי)
                            <input className={styles.profileInput} type="text" inputMode="numeric" maxLength={20} value={form.address.apartment ?? ""} onChange={(event) => setForm((current) => ({ ...current, address: { ...current.address, apartment: event.target.value } }))} />
                        </label>
                    </div>
                </fieldset>

                {form.guardians.map((guardian, index) => (
                    <fieldset className={styles.profileFieldset} disabled={isSubmitting} key={index === 0 ? "primary" : "secondary"}>
                        <legend className={styles.profileLegend}>
                            הורה/אפוטרופוס {index + 1}{index === 1 ? " — אופציונלי" : ""}
                        </legend>
                        <div className={styles.profileFieldsGrid}>
                            <label className={styles.profileLabel}>
                                שם מלא <span aria-hidden="true">*</span>
                                <input className={styles.profileInput} type="text" autoComplete="name" maxLength={160} required value={guardian.fullName} onChange={(event) => updateGuardian(index, "fullName", event.target.value)} />
                            </label>
                            <label className={styles.profileLabel}>
                                קרבה לילד <span aria-hidden="true">*</span>
                                <select className={styles.profileSelect} required value={guardian.role} onChange={(event) => updateGuardian(index, "role", event.target.value)}>
                                    <option value="">בחירת קרבה</option>
                                    {relationshipOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                </select>
                            </label>
                            {guardian.role === "other" ? (
                                <label className={styles.profileLabel}>
                                    מה הקרבה? <span aria-hidden="true">*</span>
                                    <input className={styles.profileInput} type="text" maxLength={100} required value={guardian.roleDetails ?? ""} onChange={(event) => updateGuardian(index, "roleDetails", event.target.value)} />
                                </label>
                            ) : null}
                            <label className={styles.profileLabel}>
                                טלפון <span aria-hidden="true">*</span>
                                <input className={styles.profileInput} type="tel" dir="ltr" autoComplete="tel" maxLength={30} required value={guardian.phone} onChange={(event) => updateGuardian(index, "phone", event.target.value)} />
                            </label>
                            <label className={styles.profileLabel}>
                                אימייל (אופציונלי)
                                <input className={styles.profileInput} type="email" dir="ltr" autoComplete="email" maxLength={254} value={guardian.email ?? ""} onChange={(event) => updateGuardian(index, "email", event.target.value)} />
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
