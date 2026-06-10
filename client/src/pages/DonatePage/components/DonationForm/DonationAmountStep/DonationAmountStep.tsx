import { useMemo, useState } from "react";
import type {
    FieldErrors,
    UseFormRegister,
    UseFormSetValue,
} from "react-hook-form";

import type { DonationFormValues, DonationType } from "../DonationForm";

import styles from "./DonationAmountStep.module.scss";

type DonationAmountStepProps = {
    register: UseFormRegister<DonationFormValues>;
    setValue: UseFormSetValue<DonationFormValues>;
    amount: string;
    donationType: DonationType;
    payments: string;
    errors: FieldErrors<DonationFormValues>;
    onNext: () => void;
};

const PRESET_AMOUNTS = [
    {
        value: 180,
        title: "שותפות בשבת",
        subtitle: "עזרה לסעודות שבת",
    },
    {
        value: 360,
        title: "פעילות קהילתית",
        subtitle: "תמיכה בפעילות חודשית",
    },
    {
        value: 770,
        title: "ברכה והצלחה",
        subtitle: "הסכום הנבחר ביותר",
        featured: true,
    },
    {
        value: 1800,
        title: "תורם מוביל",
        subtitle: "השפעה משמעותית",
    },
];

const DonationAmountStep = ({
    register,
    setValue,
    amount,
    donationType,
    payments,
    errors,
    onNext,
}: DonationAmountStepProps) => {
    const [isCustomAmountOpen, setIsCustomAmountOpen] = useState(false);

    const presetValues = useMemo(
        () => PRESET_AMOUNTS.map((item) => String(item.value)),
        []
    );

    const isCustomAmount = Boolean(amount) && !presetValues.includes(amount);

    const selectPresetAmount = (value: number) => {
        setIsCustomAmountOpen(false);

        setValue("amount", String(value), {
            shouldValidate: true,
            shouldDirty: true,
        });
    };

    const openCustomAmount = () => {
        setIsCustomAmountOpen(true);

        if (presetValues.includes(amount)) {
            setValue("amount", "", {
                shouldValidate: false,
                shouldDirty: true,
            });
        }
    };

    const selectDonationType = (type: DonationType) => {
        setValue("donationType", type, {
            shouldValidate: true,
            shouldDirty: true,
        });

        if (type === "monthly") {
            setValue("payments", "12", {
                shouldValidate: true,
                shouldDirty: true,
            });
        }

        if (type === "once") {
            setValue("payments", "1", {
                shouldValidate: true,
                shouldDirty: true,
            });
        }
    };

    const customAmountLabel =
        isCustomAmount && amount
            ? `₪${Number(amount).toLocaleString()}`
            : "בחירה אישית";

    return (
        <section className={styles.stepContent}>
            <fieldset className={styles.fieldset}>
                <legend className={styles.legend}>
                    בחרו את רמת השותפות שלכם
                </legend>

                <p className={styles.description}>
                    כל תרומה מסייעת לנו להמשיך בפעילות, בשיעורים,
                    בסעודות השבת ובחיזוק החיים היהודיים ביפו.
                </p>

                <div className={styles.amounts}>
                    {PRESET_AMOUNTS.map((presetAmount) => (
                        <button
                            key={presetAmount.value}
                            type="button"
                            className={
                                !isCustomAmountOpen &&
                                    amount === String(presetAmount.value)
                                    ? styles.amountActive
                                    : presetAmount.featured
                                        ? styles.amountFeatured
                                        : styles.amountButton
                            }
                            onClick={() =>
                                selectPresetAmount(presetAmount.value)
                            }
                        >
                            <strong className={styles.amountValue}>
                                ₪{presetAmount.value.toLocaleString()}
                            </strong>

                            <span className={styles.amountTitle}>
                                {presetAmount.title}
                            </span>

                            <span className={styles.amountSubtitle}>
                                {presetAmount.subtitle}
                            </span>
                        </button>
                    ))}

                    <button
                        type="button"
                        className={
                            isCustomAmountOpen
                                ? styles.amountActive
                                : styles.amountButton
                        }
                        onClick={openCustomAmount}
                    >
                        <strong className={styles.customAmountValue}>
                            {customAmountLabel}
                        </strong>

                        <span className={styles.amountTitle}>
                            קבעו את הסכום
                        </span>
                    </button>
                </div>

                {isCustomAmountOpen && (
                    <label className={styles.field} htmlFor="amount">
                        <span className={styles.fieldLabel}>סכום מותאם</span>

                        <span className={styles.inputWrapper}>
                            <span className={styles.currency}>₪</span>

                            <input
                                id="amount"
                                className={styles.input}
                                inputMode="numeric"
                                placeholder="הקלידו סכום"
                                autoFocus
                                {...register("amount", {
                                    required: "נא לבחור סכום תרומה",
                                    validate: (value) =>
                                        Number(value) >= 18 ||
                                        "סכום התרומה המינימלי הוא ₪18",
                                    onChange: (event) => {
                                        event.target.value =
                                            event.target.value.replace(
                                                /[^\d]/g,
                                                ""
                                            );
                                    },
                                })}
                            />
                        </span>
                    </label>
                )}

                {errors.amount?.message && (
                    <p className={styles.errorText}>
                        {errors.amount.message}
                    </p>
                )}
            </fieldset>

            <fieldset className={styles.fieldset}>
                <legend className={styles.legend}>סוג התרומה</legend>

                <div className={styles.typeToggle}>
                    <button
                        type="button"
                        className={
                            donationType === "once"
                                ? styles.typeActive
                                : styles.typeButton
                        }
                        onClick={() => selectDonationType("once")}
                    >
                        חד־פעמי
                    </button>

                    <button
                        type="button"
                        className={
                            donationType === "monthly"
                                ? styles.typeActive
                                : styles.typeButton
                        }
                        onClick={() => selectDonationType("monthly")}
                    >
                        הו״ק ל־12 חודשים
                    </button>
                </div>

                <input
                    type="hidden"
                    {...register("donationType", {
                        required: "נא לבחור סוג תרומה",
                    })}
                />
            </fieldset>

            {donationType === "once" && (
                <fieldset className={styles.fieldset}>
                    <legend className={styles.legend}>מספר תשלומים</legend>

                    <select
                        id="payments"
                        className={styles.input}
                        value={payments}
                        {...register("payments", {
                            required: "נא לבחור מספר תשלומים",
                        })}
                        onChange={(event) =>
                            setValue("payments", event.target.value, {
                                shouldValidate: true,
                                shouldDirty: true,
                            })
                        }
                    >
                        {Array.from({ length: 12 }, (_, index) => {
                            const paymentsCount = index + 1;
                            const totalAmount = Number(amount) || 0;
                            const paymentAmount = totalAmount / paymentsCount;

                            return (
                                <option key={paymentsCount} value={String(paymentsCount)}>
                                    {paymentsCount === 1
                                        ? `תשלום אחד - ₪${paymentAmount.toLocaleString()}`
                                        : `${paymentsCount} תשלומים - ₪${paymentAmount.toLocaleString()} כל חודש`}
                                </option>
                            );
                        })}
                    </select>
                </fieldset>
            )}

            <footer className={styles.stepActions}>
                <button
                    type="button"
                    className={styles.submitButton}
                    onClick={onNext}
                >
                    המשך לפרטי התורם
                </button>
            </footer>
        </section>
    );
};

export default DonationAmountStep;