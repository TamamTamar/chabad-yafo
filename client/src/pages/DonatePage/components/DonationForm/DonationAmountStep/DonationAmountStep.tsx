import { useMemo, useState } from "react";
import type {
    FieldErrors,
    UseFormRegister,
    UseFormSetValue,
} from "react-hook-form";

import type { DonationFormValues, DonationType } from "../DonationForm";
import AmountPresets, { type PresetAmount } from "./AmountPresets";
import CustomAmountField from "./CustomAmountField";
import DonationTypeToggle from "./DonationTypeToggle";
import PaymentsSelect from "./PaymentsSelect";

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

const PRESET_AMOUNTS: PresetAmount[] = [
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

                <AmountPresets
                    amount={amount}
                    customAmountLabel={customAmountLabel}
                    isCustomAmountOpen={isCustomAmountOpen}
                    onOpenCustomAmount={openCustomAmount}
                    onSelectPresetAmount={selectPresetAmount}
                    presetAmounts={PRESET_AMOUNTS}
                />

                {isCustomAmountOpen && (
                    <CustomAmountField register={register} />
                )}

                <p className={styles.errorText}>
                    {errors.amount?.message || ""}
                </p>
            </fieldset>

            <DonationTypeToggle
                donationType={donationType}
                onSelectDonationType={selectDonationType}
                register={register}
            />

            {donationType === "once" && (
                <PaymentsSelect
                    amount={amount}
                    payments={payments}
                    register={register}
                    setValue={setValue}
                />
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
