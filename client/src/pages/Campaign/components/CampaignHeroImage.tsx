import React from "react";
import styles from "../DonationCampaignPage.module.scss";

type Props = {
  imageUrl: string;
  variant?: "default" | "compact";
};

const CampaignHeroImage: React.FC<Props> = ({ imageUrl, variant = "default" }) => {
  const mediaClassName = [
    styles.heroMedia,
    variant === "compact" ? styles.heroMediaCompact : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={mediaClassName}>
      <img className={styles.heroImg} src={imageUrl} alt="" />
    </div>
  );
};

export default CampaignHeroImage;
