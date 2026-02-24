import React from "react";
import styles from "../DonationCampaignPage.module.scss";
import type { CampaignPrimaryButton as ButtonType } from "../types";

const CampaignPrimaryButton: React.FC<ButtonType> = ({ label, href }) => {
  return (
    <a className={styles.machatzitBtn} href={href}>
      <span className={styles.machatzitText}>{label}</span>
    </a>
  );
};

export default CampaignPrimaryButton;