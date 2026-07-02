import styles from "../../DonationCampaignPage.module.scss";
import type { CampaignDonationStep } from "./types";

type CampaignModalFooterProps = {
  isPaying: boolean;
  onBack: () => void;
  onCancel: () => void;
  onNext: () => void;
  onPay: () => void;
  onTestSuccess?: () => void;
  step: CampaignDonationStep;
};

const CampaignModalFooter = ({
  isPaying,
  onBack,
  onCancel,
  onNext,
  onPay,
  onTestSuccess,
  step,
}: CampaignModalFooterProps) => (
  <div className={styles.modalFooter}>
    <div className={styles.modalActions}>
      <button
        className={styles.btnSecondary}
        onClick={step === 2 ? onBack : onCancel}
        disabled={isPaying}
        type="button"
      >
        {step === 2 ? "חזרה" : "ביטול"}
      </button>

      <button
        className={styles.btnPrimary}
        onClick={step === 1 ? onNext : onPay}
        disabled={isPaying}
        type="button"
      >
        {step === 1 ? "המשך לתשלום" : isPaying ? "מעבד..." : "בצע תשלום"}
      </button>
    </div>

    {onTestSuccess && (
      <button
        className={styles.devTestButton}
        onClick={onTestSuccess}
        disabled={isPaying}
        type="button"
      >
        תצוגת בדיקה למסך האישור
      </button>
    )}
  </div>
);

export default CampaignModalFooter;
