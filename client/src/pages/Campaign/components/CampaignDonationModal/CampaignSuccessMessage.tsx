import styles from "../../DonationCampaignPage.module.scss";

type CampaignSuccessMessageProps = {
  firstName?: string;
  selectedAmount: number;
};

const CampaignSuccessMessage = ({
  firstName,
  selectedAmount,
}: CampaignSuccessMessageProps) => {
  const title = firstName ? `תודה רבה, ${firstName}` : "תודה רבה";

  return (
    <div className={styles.successMessage}>
      <div className={styles.successIcon} aria-hidden="true">
        ✓
      </div>

      <h2 className={styles.successTitle}>{title}</h2>

      <p className={styles.successText}>
        התרומה על סך <b>₪{selectedAmount}</b> התקבלה בהצלחה.
      </p>

      <p className={styles.successNote}>מיד נחזור לעמוד התרומה.</p>
    </div>
  );
};

export default CampaignSuccessMessage;
