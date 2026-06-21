import styles from "./AmountPresets.module.scss";

export type PresetAmount = {
    featured?: boolean;
    subtitle: string;
    title: string;
    value: number;
};

type AmountPresetsProps = {
    amount: string;
    isCustomAmountOpen: boolean;
    onOpenCustomAmount: () => void;
    onSelectPresetAmount: (value: number) => void;
    presetAmounts: PresetAmount[];
    customAmountLabel: string;
};

const AmountPresets = ({
    amount,
    isCustomAmountOpen,
    onOpenCustomAmount,
    onSelectPresetAmount,
    presetAmounts,
    customAmountLabel,
}: AmountPresetsProps) => (
    <div className={styles.amounts}>
        {presetAmounts.map((presetAmount) => (
            <button
                key={presetAmount.value}
                type="button"
                className={
                    !isCustomAmountOpen && amount === String(presetAmount.value)
                        ? styles.amountActive
                        : presetAmount.featured
                            ? styles.amountFeatured
                            : styles.amountButton
                }
                onClick={() => onSelectPresetAmount(presetAmount.value)}
            >
                <strong className={styles.amountValue}>
                    ₪{presetAmount.value.toLocaleString()}
                </strong>

                <span className={styles.amountTitle}>{presetAmount.title}</span>

                <span className={styles.amountSubtitle}>
                    {presetAmount.subtitle}
                </span>
            </button>
        ))}

        <button
            type="button"
            className={
                isCustomAmountOpen ? styles.amountActive : styles.amountButton
            }
            onClick={onOpenCustomAmount}
        >
            <strong className={styles.customAmountValue}>
                {customAmountLabel}
            </strong>

            <span className={styles.amountTitle}>קבעו את הסכום</span>
        </button>
    </div>
);

export default AmountPresets;
