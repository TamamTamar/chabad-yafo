import { useMemo, useState } from "react";
import { useFieldArray, useForm, type SubmitHandler } from "react-hook-form";
import Container from "../../components/Container/Container";
import { createDaycareEnrollment } from "../../services/daycareEnrollmentService";
import type { DaycareEnrollmentFormValues } from "../../types/daycareEnrollment";
import {
    genderOptions,
    healthFundOptions,
} from "./daycareEnrollmentOptions";
import {
    isValidEmail,
    isValidIsraeliId,
    onlyDigits,
} from "./daycareEnrollmentUtils";
import ConsentCheckbox from "./components/ConsentCheckbox";
import EnrollmentField from "./components/EnrollmentField";
import StepProgress from "./components/StepProgress";
import styles from "./DaycareEnrollment.module.scss";

const today = new Date().toISOString().slice(0, 10);
const phoneValidation = {
    required: "שדה חובה",
    setValueAs: onlyDigits,
    validate: (value: string) =>
        /^0\d{8,9}$/.test(value) || "מספר טלפון לא תקין",
};
const idValidation = {
    required: "שדה חובה",
    setValueAs: onlyDigits,
    validate: (value: string) =>
        isValidIsraeliId(value) || "תעודת זהות לא תקינה",
};
const emailValidation = {
    required: "שדה חובה",
    validate: (value: string) => isValidEmail(value) || "אימייל לא תקין",
};
const requiredText = { required: "שדה חובה" };
const optionalCleanText = {
    setValueAs: (value: string) => value?.trim() || undefined,
};
const monthlyTuitionText = "5,000 ₪";
const monthlyEnrichmentFeeText = "500 ₪";
const monthlyTotalText = "5,500 ₪";
const registrationDepositText = "500 ₪";

const stepFields: Array<Array<keyof DaycareEnrollmentFormValues | string>> = [
    [
        "child.firstName",
        "child.lastName",
        "child.israeliId",
        "child.birthDate",
        "child.gender",
        "child.address",
        "child.homeLanguage",
    ],
    [
        "parents.motherName",
        "parents.motherPhone",
        "parents.motherEmail",
        "parents.motherIsraeliId",
        "parents.fatherName",
        "parents.fatherPhone",
        "parents.fatherEmail",
        "parents.fatherIsraeliId",
    ],
    ["emergencyContacts"],
    ["medical.healthFund"],
    [
        "consents.detailsCorrect",
        "consents.emergencyContact",
        "consents.medicalUpdateCommitment",
        "consents.daycareRules",
        "consents.registrationDeposit",
        "consents.monthlyTuition",
    ],
    ["signature.signerFullName", "signature.digitalSignatureConsent"],
];

const defaultValues: DaycareEnrollmentFormValues = {
    child: {
        firstName: "",
        lastName: "",
        israeliId: "",
        birthDate: "",
        gender: "",
        address: "",
        homeLanguage: "",
    },
    parents: {
        motherName: "",
        motherPhone: "",
        motherEmail: "",
        motherIsraeliId: "",
        fatherName: "",
        fatherPhone: "",
        fatherEmail: "",
        fatherIsraeliId: "",
        differentParentAddress: "",
    },
    emergencyContacts: [
        { fullName: "", relation: "", phone: "" },
        { fullName: "", relation: "", phone: "" },
    ],
    medical: {
        allergies: "",
        foodSensitivities: "",
        regularMedications: "",
        medicalLimitations: "",
        healthFund: "",
        pediatricianName: "",
        additionalNotes: "",
    },
    consents: {
        detailsCorrect: false,
        emergencyContact: false,
        medicalUpdateCommitment: false,
        daycareRules: false,
        registrationDeposit: false,
        monthlyTuition: false,
        internalPhotos: false,
        whatsappUpdates: false,
    },
    signature: {
        signerFullName: "",
        signedAt: today,
        digitalSignatureConsent: false,
    },
};

const DaycareEnrollment = () => {
    const [currentStep, setCurrentStep] = useState(0);
    const [submitted, setSubmitted] = useState(false);
    const {
        control,
        formState: { errors, isSubmitting },
        handleSubmit,
        register,
        reset,
        setError,
        trigger,
    } = useForm<DaycareEnrollmentFormValues>({
        defaultValues,
        mode: "onChange",
        reValidateMode: "onChange",
    });
    const { fields, append } = useFieldArray({
        control,
        name: "emergencyContacts",
    });
    const stepTitle = useMemo(
        () =>
            [
                "פרטי הילד/ה",
                "פרטי ההורים",
                "אנשי קשר לשעת חירום",
                "מידע רפואי",
                "אישורים והצהרות",
                "חתימה דיגיטלית",
            ][currentStep],
        [currentStep]
    );

    const goNext = async () => {
        const isValid = await trigger(stepFields[currentStep] as never);

        if (isValid) {
            setCurrentStep((step) => Math.min(step + 1, stepFields.length - 1));
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    const goBack = () => {
        setCurrentStep((step) => Math.max(step - 1, 0));
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const onSubmit: SubmitHandler<DaycareEnrollmentFormValues> = async (data) => {
        try {
            await createDaycareEnrollment({
                ...data,
                signature: {
                    ...data.signature,
                    signedAt: today,
                },
            });
            setSubmitted(true);
            reset(defaultValues);
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (error: any) {
            setError("root", {
                type: "server",
                message:
                    error?.response?.data?.message ||
                    "לא הצלחנו לשמור את ההרשמה. נסו שוב בעוד רגע.",
            });
        }
    };

    return (
        <main className={styles.page} dir="rtl">
            <Container>
                <section className={styles.hero}>
                    <span className={styles.eyebrow}>מעון חב״ד יפו</span>
                    <h1 className={styles.title}>טופס הרשמה דיגיטלי</h1>
                    <p className={styles.intro}>
                        הרשמה מלאה לילד/ה שהתקבל/ה למעון. הפרטים נשמרים
                        בצורה מסודרת ומועברים לצוות המנהלי של המעון.
                    </p>
                </section>

                {submitted ? (
                    <section className={styles.successBox}>
                        <span className={styles.successMark}>✓</span>
                        <h2>ההרשמה נשלחה בהצלחה</h2>
                        <p>
                            קיבלנו את הפרטים. צוות המעון יעבור על ההרשמה
                            ויצור קשר במידת הצורך.
                        </p>
                        <button
                            className={styles.secondaryButton}
                            type="button"
                            onClick={() => setSubmitted(false)}
                        >
                            מילוי הרשמה נוספת
                        </button>
                    </section>
                ) : (
                    <section className={styles.formShell}>
                        <StepProgress currentStep={currentStep} />

                        <form onSubmit={handleSubmit(onSubmit)}>
                            <div className={styles.formHeader}>
                                <span>שלב {currentStep + 1} מתוך 6</span>
                                <h2>{stepTitle}</h2>
                            </div>

                            {currentStep === 0 && (
                                <div className={styles.grid}>
                                    <EnrollmentField
                                        error={errors.child?.firstName}
                                        label="שם פרטי"
                                        name="child.firstName"
                                        register={register}
                                        required
                                        validation={requiredText}
                                    />
                                    <EnrollmentField
                                        error={errors.child?.lastName}
                                        label="שם משפחה"
                                        name="child.lastName"
                                        register={register}
                                        required
                                        validation={requiredText}
                                    />
                                    <EnrollmentField
                                        error={errors.child?.israeliId}
                                        inputMode="numeric"
                                        digitsOnly
                                        label="תעודת זהות"
                                        maxLength={9}
                                        name="child.israeliId"
                                        register={register}
                                        required
                                        validation={idValidation}
                                    />
                                    <EnrollmentField
                                        error={errors.child?.birthDate}
                                        label="תאריך לידה"
                                        name="child.birthDate"
                                        register={register}
                                        required
                                        type="date"
                                        validation={requiredText}
                                    />
                                    <EnrollmentField
                                        error={errors.child?.gender}
                                        label="מין"
                                        name="child.gender"
                                        options={[...genderOptions]}
                                        register={register}
                                        required
                                        validation={requiredText}
                                    />
                                    <EnrollmentField
                                        error={errors.child?.address}
                                        label="כתובת מגורים"
                                        name="child.address"
                                        register={register}
                                        required
                                        validation={requiredText}
                                    />
                                    <EnrollmentField
                                        error={errors.child?.homeLanguage}
                                        label="שפת דיבור בבית"
                                        name="child.homeLanguage"
                                        register={register}
                                        required
                                        validation={requiredText}
                                    />
                                </div>
                            )}

                            {currentStep === 1 && (
                                <div className={styles.grid}>
                                    <EnrollmentField
                                        error={errors.parents?.motherName}
                                        label="שם האם"
                                        name="parents.motherName"
                                        register={register}
                                        required
                                        validation={requiredText}
                                    />
                                    <EnrollmentField
                                        error={errors.parents?.motherPhone}
                                        inputMode="tel"
                                        digitsOnly
                                        label="טלפון האם"
                                        name="parents.motherPhone"
                                        register={register}
                                        required
                                        validation={phoneValidation}
                                    />
                                    <EnrollmentField
                                        error={errors.parents?.motherEmail}
                                        inputMode="email"
                                        label="אימייל האם"
                                        name="parents.motherEmail"
                                        register={register}
                                        required
                                        type="email"
                                        validation={emailValidation}
                                    />
                                    <EnrollmentField
                                        error={errors.parents?.motherIsraeliId}
                                        inputMode="numeric"
                                        digitsOnly
                                        label="תעודת זהות האם"
                                        maxLength={9}
                                        name="parents.motherIsraeliId"
                                        register={register}
                                        required
                                        validation={idValidation}
                                    />
                                    <EnrollmentField
                                        error={errors.parents?.fatherName}
                                        label="שם האב"
                                        name="parents.fatherName"
                                        register={register}
                                        required
                                        validation={requiredText}
                                    />
                                    <EnrollmentField
                                        error={errors.parents?.fatherPhone}
                                        inputMode="tel"
                                        digitsOnly
                                        label="טלפון האב"
                                        name="parents.fatherPhone"
                                        register={register}
                                        required
                                        validation={phoneValidation}
                                    />
                                    <EnrollmentField
                                        error={errors.parents?.fatherEmail}
                                        inputMode="email"
                                        label="אימייל האב"
                                        name="parents.fatherEmail"
                                        register={register}
                                        required
                                        type="email"
                                        validation={emailValidation}
                                    />
                                    <EnrollmentField
                                        error={errors.parents?.fatherIsraeliId}
                                        inputMode="numeric"
                                        digitsOnly
                                        label="תעודת זהות האב"
                                        maxLength={9}
                                        name="parents.fatherIsraeliId"
                                        register={register}
                                        required
                                        validation={idValidation}
                                    />
                                    <div className={styles.fullWidth}>
                                        <EnrollmentField
                                            error={
                                                errors.parents
                                                    ?.differentParentAddress
                                            }
                                            label="כתובת ההורים אם שונה מכתובת הילד"
                                            name="parents.differentParentAddress"
                                            register={register}
                                            validation={optionalCleanText}
                                        />
                                    </div>
                                </div>
                            )}

                            {currentStep === 2 && (
                                <div className={styles.contactStack}>
                                    {fields.map((field, index) => (
                                        <div
                                            className={styles.contactCard}
                                            key={field.id}
                                        >
                                            <h3>איש קשר {index + 1}</h3>
                                            <div className={styles.grid}>
                                                <EnrollmentField
                                                    error={
                                                        errors
                                                            .emergencyContacts?.[
                                                            index
                                                        ]?.fullName
                                                    }
                                                    label="שם מלא"
                                                    name={
                                                        `emergencyContacts.${index}.fullName` as const
                                                    }
                                                    register={register}
                                                    required
                                                    validation={requiredText}
                                                />
                                                <EnrollmentField
                                                    error={
                                                        errors
                                                            .emergencyContacts?.[
                                                            index
                                                        ]?.relation
                                                    }
                                                    label="קרבה לילד"
                                                    name={
                                                        `emergencyContacts.${index}.relation` as const
                                                    }
                                                    register={register}
                                                    required
                                                    validation={requiredText}
                                                />
                                                <EnrollmentField
                                                    error={
                                                        errors
                                                            .emergencyContacts?.[
                                                            index
                                                        ]?.phone
                                                    }
                                                    inputMode="tel"
                                                    digitsOnly
                                                    label="טלפון"
                                                    name={
                                                        `emergencyContacts.${index}.phone` as const
                                                    }
                                                    register={register}
                                                    required
                                                    validation={phoneValidation}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    <button
                                        className={styles.secondaryButton}
                                        type="button"
                                        onClick={() =>
                                            append({
                                                fullName: "",
                                                relation: "",
                                                phone: "",
                                            })
                                        }
                                    >
                                        הוספת איש קשר
                                    </button>
                                </div>
                            )}

                            {currentStep === 3 && (
                                <div className={styles.grid}>
                                    <EnrollmentField
                                        error={errors.medical?.allergies}
                                        label="אלרגיות"
                                        name="medical.allergies"
                                        register={register}
                                        rows={3}
                                        validation={optionalCleanText}
                                    />
                                    <EnrollmentField
                                        error={errors.medical?.foodSensitivities}
                                        label="רגישויות למזון"
                                        name="medical.foodSensitivities"
                                        register={register}
                                        rows={3}
                                        validation={optionalCleanText}
                                    />
                                    <EnrollmentField
                                        error={errors.medical?.regularMedications}
                                        label="תרופות קבועות"
                                        name="medical.regularMedications"
                                        register={register}
                                        rows={3}
                                        validation={optionalCleanText}
                                    />
                                    <EnrollmentField
                                        error={errors.medical?.medicalLimitations}
                                        label="מגבלות רפואיות"
                                        name="medical.medicalLimitations"
                                        register={register}
                                        rows={3}
                                        validation={optionalCleanText}
                                    />
                                    <EnrollmentField
                                        error={errors.medical?.healthFund}
                                        label="קופת חולים"
                                        name="medical.healthFund"
                                        options={healthFundOptions}
                                        register={register}
                                        required
                                        validation={requiredText}
                                    />
                                    <EnrollmentField
                                        error={errors.medical?.pediatricianName}
                                        label="שם רופא ילדים אם יש"
                                        name="medical.pediatricianName"
                                        register={register}
                                        validation={optionalCleanText}
                                    />
                                    <div className={styles.fullWidth}>
                                        <EnrollmentField
                                            error={errors.medical?.additionalNotes}
                                            label="הערות רפואיות נוספות"
                                            name="medical.additionalNotes"
                                            register={register}
                                            rows={4}
                                            validation={optionalCleanText}
                                        />
                                    </div>
                                </div>
                            )}

                            {currentStep === 4 && (
                                <div className={styles.checkboxGroup}>
                                    <ConsentCheckbox
                                        error={errors.consents?.detailsCorrect}
                                        label="אני מאשר/ת שהפרטים שמסרתי נכונים ומלאים."
                                        name="consents.detailsCorrect"
                                        register={register}
                                        required
                                    />
                                    <ConsentCheckbox
                                        error={errors.consents?.emergencyContact}
                                        label="אני מאשר/ת לצוות המעון ליצור קשר במקרה חירום."
                                        name="consents.emergencyContact"
                                        register={register}
                                        required
                                    />
                                    <ConsentCheckbox
                                        error={
                                            errors.consents
                                                ?.medicalUpdateCommitment
                                        }
                                        label="אני מתחייב/ת לעדכן את המעון בכל שינוי רפואי או אישי."
                                        name="consents.medicalUpdateCommitment"
                                        register={register}
                                        required
                                    />
                                    <ConsentCheckbox
                                        error={errors.consents?.daycareRules}
                                        label="אני מאשר/ת שקראתי את נהלי המעון ואפעל לפיהם."
                                        name="consents.daycareRules"
                                        register={register}
                                        required
                                    />
                                    <ConsentCheckbox
                                        error={errors.consents?.registrationDeposit}
                                        label={`אני מאשר/ת כי ידוע לי שלצורך שמירת המקום נדרשת מקדמת רישום בסך ${registrationDepositText}, אשר תקוזז מהתשלום עבור החודש הראשון.`}
                                        name="consents.registrationDeposit"
                                        register={register}
                                        required
                                    />
                                    <ConsentCheckbox
                                        error={errors.consents?.monthlyTuition}
                                        label={`אני מאשר/ת כי ידוע לי שהעלות החודשית היא ${monthlyTuitionText} שכר לימוד + ${monthlyEnrichmentFeeText} דמי שכלול, סה״כ ${monthlyTotalText} לחודש.`}
                                        name="consents.monthlyTuition"
                                        register={register}
                                        required
                                    />
                                    <ConsentCheckbox
                                        label="אני מאשר/ת צילום הילד/ה לצרכים פנימיים של המעון."
                                        name="consents.internalPhotos"
                                        register={register}
                                    />
                                    <ConsentCheckbox
                                        label="אני מאשר/ת קבלת עדכונים בוואטסאפ."
                                        name="consents.whatsappUpdates"
                                        register={register}
                                    />
                                </div>
                            )}

                            {currentStep === 5 && (
                                <div className={styles.grid}>
                                    <EnrollmentField
                                        error={errors.signature?.signerFullName}
                                        label="שם מלא של ההורה החותם"
                                        name="signature.signerFullName"
                                        register={register}
                                        required
                                        validation={requiredText}
                                    />
                                    <EnrollmentField
                                        label="תאריך חתימה"
                                        name="signature.signedAt"
                                        register={register}
                                        required
                                        type="date"
                                        validation={requiredText}
                                    />
                                    <div className={styles.fullWidth}>
                                        <ConsentCheckbox
                                            error={
                                                errors.signature
                                                    ?.digitalSignatureConsent
                                            }
                                            label="אני מאשר/ת שהקלדת שמי מהווה חתימה ואישור דיגיטלי."
                                            name="signature.digitalSignatureConsent"
                                            register={register}
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            <span className={styles.formError}>
                                {errors.root?.message || ""}
                            </span>

                            <div className={styles.actions}>
                                {currentStep > 0 && (
                                    <button
                                        className={styles.secondaryButton}
                                        type="button"
                                        onClick={goBack}
                                    >
                                        חזרה
                                    </button>
                                )}
                                {currentStep < stepFields.length - 1 ? (
                                    <button
                                        className={styles.primaryButton}
                                        type="button"
                                        onClick={goNext}
                                    >
                                        המשך
                                    </button>
                                ) : (
                                    <button
                                        className={styles.primaryButton}
                                        disabled={isSubmitting}
                                        type="submit"
                                    >
                                        {isSubmitting
                                            ? "שומר הרשמה..."
                                            : "שליחת הרשמה"}
                                    </button>
                                )}
                            </div>
                        </form>
                    </section>
                )}
            </Container>
        </main>
    );
};

export default DaycareEnrollment;
