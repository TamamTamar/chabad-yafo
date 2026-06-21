import styles from "../../DonationCampaignPage.module.scss";

type CampaignModalHeaderProps = {
  campaignTitle: string;
  yearLabel: string;
  onClose: () => void;
};

const CampaignModalHeader = ({
  campaignTitle,
  yearLabel,
  onClose,
}: CampaignModalHeaderProps) => (
  <div className={styles.modalHeader}>
    <div className={styles.modalTitle}>
      {campaignTitle} <span className={styles.modalMuted}>{yearLabel}</span>
    </div>

    <button className={styles.modalClose} onClick={onClose} type="button">
      ✕
    </button>
  </div>
);

export default CampaignModalHeader;
