import React from "react";
import styles from "../DonationCampaignPage.module.scss";

type Props = {
  presetAmounts: number[];
  allowCustomAmount: boolean;
  onPickPresetAmount: (amount: number) => void;
  onPickCustomAmount: () => void;
};

const CampaignDonationOptions: React.FC<Props> = ({
  presetAmounts,
  allowCustomAmount,
  onPickPresetAmount,
  onPickCustomAmount,
}) => {
  return (
    <section className={styles.donateSection} aria-label="בחירת סכום לתרומה">
      <div className={styles.donateHeader}>
        <h2 className={styles.donateTitle}>בחרו סכום</h2>
      </div>

      <div className={styles.amountRow}>
        {presetAmounts.map((amt) => (
          <button key={amt} type="button" className={styles.amountChip} onClick={() => onPickPresetAmount(amt)}>
            ₪{amt}
          </button>
        ))}

        {allowCustomAmount && (
          <button type="button" className={`${styles.amountChip} ${styles.amountChipAlt}`} onClick={onPickCustomAmount}>
            סכום אחר
          </button>
        )}
      </div>
    </section>
  );
};

export default CampaignDonationOptions;