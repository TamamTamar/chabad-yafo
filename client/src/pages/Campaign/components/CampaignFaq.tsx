import React, { useState } from "react";
import styles from "../DonationCampaignPage.module.scss";
import type { CampaignFaqItem } from "../types";

type Props = { items: CampaignFaqItem[] };

const CampaignFaq: React.FC<Props> = ({ items }) => {
  // מחפש את האינדקס הראשון שבו open הוא true
  const defaultOpenIdx = items?.findIndex(it => it.open) ?? null;
  
  // מאתחל את ה-State עם האינדקס שמצאנו (או null אם לא נמצא)
  const [openIdx, setOpenIdx] = useState<number | null>(defaultOpenIdx !== -1 ? defaultOpenIdx : null);

  if (!items || items.length === 0) return null;

  const toggle = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <section className={styles.sectionAlt}>
      <div className={styles.sectionInner}>
        <div className={styles.faq}>
          {items.map((it, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div 
                key={idx} 
                className={[styles.faqItem, isOpen ? styles.faqItemOpen : ""].join(" ")}
              >
                <button 
                  type="button"
                  className={styles.faqSummary} 
                  onClick={() => toggle(idx)}
                >
                  <span className={styles.faqIcon}>{isOpen ? "−" : "+"}</span>
                  <span className={styles.faqQuestion}>{it.q}</span>
                </button>
                
                <div className={[styles.faqCollapse, isOpen ? styles.faqCollapseOpen : ""].join(" ")}>
                  <div className={styles.faqBody}>
                    {/* שינוי קטן כאן: תמיכה ברינדור HTML אם תרצה להדגיש טקסט גם בתוך התשובה */}
                    <div dangerouslySetInnerHTML={{ __html: it.a }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CampaignFaq;