import React from "react";
import styles from "../DonationCampaignPage.module.scss";

type Props = {
  title: string;
  yearLabel: string;
  shaliachName: string;
  subtitle?: string;
  paragraphs: string[];
};

const CampaignIntro: React.FC<Props> = ({ title, yearLabel, shaliachName, paragraphs }) => {
  return (
    <div className={styles.introContainer}>
      {/* כותרת ראשית בולטת */}
      <h1 className={styles.mainTitle}>{title}</h1>

      {/* כותרות משנה מסודרות אחת מתחת לשנייה */}
      <div className={styles.subTitles}>
        <h2 className={styles.infoTitle}>{yearLabel}</h2>
        <h3 className={styles.infoTitle}>{shaliachName}</h3>
      </div>


      {/* פסקאות הטקסט */}
      <div className={styles.content}>
        {/* הפסקה הראשונה עם עיצוב ה-lead */}
        {paragraphs[0] && (
          <p
            className={styles.lead}
            dangerouslySetInnerHTML={{ __html: paragraphs[0] }}
          />
        )}

        {/* שאר הפסקאות */}
        {paragraphs.slice(1).map((t, i) => (
          <p
            key={i}
            className={styles.text}
            dangerouslySetInnerHTML={{ __html: t }}
          />
        ))}
      </div>
    </div>
  );
};

export default CampaignIntro;