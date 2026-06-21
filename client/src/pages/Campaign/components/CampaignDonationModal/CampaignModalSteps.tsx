import styles from "../../DonationCampaignPage.module.scss";
import type { CampaignDonationStep } from "./types";

type CampaignModalStepsProps = {
  step: CampaignDonationStep;
};

const CampaignModalSteps = ({ step }: CampaignModalStepsProps) => (
  <div className={styles.modalSteps}>
    <div className={`${styles.stepChip} ${step === 1 ? styles.stepChipActive : ""}`}>
      1. פרטים
    </div>

    <div className={`${styles.stepChip} ${step === 2 ? styles.stepChipActive : ""}`}>
      2. תשלום
    </div>
  </div>
);

export default CampaignModalSteps;
