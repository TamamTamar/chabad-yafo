import React from "react";
import styles from "../DonationCampaignPage.module.scss";

type Props = { imageUrl: string };

const CampaignHeroImage: React.FC<Props> = ({ imageUrl }) => {
  return (
    <div className={styles.heroMedia}>
      <img className={styles.heroImg} src={imageUrl} alt="" />
    </div>
  );
};

export default CampaignHeroImage;