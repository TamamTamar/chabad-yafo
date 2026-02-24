import React, { useState } from "react";
import styles from "../DonationCampaignPage.module.scss";
import type { CampaignFaqItem } from "../types";

type Props = { items: CampaignFaqItem[] };

const CampaignFaq: React.FC<Props> = ({ items }) => {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

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
                  {/* האייקון מופיע ראשון מצד ימין */}
                  <span className={styles.faqIcon}>{isOpen ? "−" : "+"}</span>
                  <span className={styles.faqQuestion}>{it.q}</span>
                </button>
                
                <div className={[styles.faqCollapse, isOpen ? styles.faqCollapseOpen : ""].join(" ")}>
                  <div className={styles.faqBody}>
                    {it.a}
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