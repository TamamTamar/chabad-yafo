import type { RefObject } from "react";

import styles from "../../DonationCampaignPage.module.scss";

type CampaignPaymentFrameProps = {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  selectedAmount: number;
};

const CampaignPaymentFrame = ({
  iframeRef,
  selectedAmount,
}: CampaignPaymentFrameProps) => (
  <div className={styles.iframeStep}>
    <div className={styles.amountOnly}>₪{selectedAmount}</div>

    <div className={styles.iframeCard}>
      <iframe
        ref={iframeRef}
        title="Nedarim Plus"
        src="https://matara.pro/nedarimplus/iframe?language=he"
        className={styles.iframe}
        scrolling="no"
      />
    </div>
  </div>
);

export default CampaignPaymentFrame;
