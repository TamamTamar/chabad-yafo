import styles from "../../DonationCampaignPage.module.scss";

type CampaignSuccessMessageProps = {
  firstName?: string;
  selectedAmount: number;
};

const CampaignSuccessMessage = ({
  firstName,
  selectedAmount,
}: CampaignSuccessMessageProps) => (
  <div className={styles.successMessage}>
    <div className={styles.successIcon}>🎉</div>

    <h2 className={styles.successTitle}>תודה רבה, {firstName}!</h2>

    <p className={styles.successText}>
      התרומה על סך <b>₪{selectedAmount}</b> התקבלה בהצלחה.
    </p>

    <p className={styles.successNote}>החלון יסגר כעת...</p>
  </div>
);

export default CampaignSuccessMessage;
