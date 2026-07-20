import React, { useState, useMemo } from "react";
import styles from "../DonationCampaignPage.module.scss";

type Props = {
  onSelectAmount: (amount: number) => void;
  title?: string;
  subtitle?: string;
  rate?: number;
  rateLabel?: string;
};

const CampaignCalculator: React.FC<Props> = ({
  onSelectAmount,
  title = "מחשבון מחצית השקל",
  subtitle = "הזינו את מספר הנפשות במשפחה",
  rate = 86,
  rateLabel = "עבור כל נפש",
}) => {
  const [peopleCount, setPeopleCount] = useState<number>(1);

  const total = useMemo(() => peopleCount * rate, [peopleCount, rate]);


const handleApply = () => {
  // 1. עדכון הסכום בדף הראשי
  onSelectAmount(total); 

  // 2. מציאת אלמנט הטופס וגלילה אליו
  const formElement = document.getElementById("donation-form-section");
  if (formElement) {
    formElement.scrollIntoView({ 
      behavior: "smooth", 
      block: "center" // "center" מבטיח שהטופס יהיה במרכז המסך ולא חתוך למעלה
    });
  }
};

  return (
    <div id="calculator-section" className={styles.calculatorCard}>
      <h2 className={styles.calcTitle}>{title}</h2>
      <p className={styles.calcSubtitle}>{subtitle}</p>

      <div className={styles.calcContent}>
        <div className={styles.inputGroup}>
          <div className={styles.numberInputWrapper}>
            <button type="button" className={styles.stepBtn} onClick={() => setPeopleCount(p => Math.max(1, p - 1))}>-</button>
            <input
              type="number"
              className={styles.calcInput}
              value={peopleCount}
              onChange={(e) => setPeopleCount(Math.max(1, parseInt(e.target.value) || 0))}
            />
            <button type="button" className={styles.stepBtn} onClick={() => setPeopleCount(p => p + 1)}>+</button>
          </div>
          <div className={styles.rateInfo}>({rate} ₪ {rateLabel})</div>
        </div>

        <div className={styles.resultSection}>
          <span className={styles.resultLabel}>סכום מומלץ לתרומה</span>
          <div className={styles.totalDisplay}>₪ {total.toLocaleString()}</div>
          <button type="button" className={styles.applyAmountBtn} onClick={handleApply}>
            עדכן סכום זה בטופס התרומה
          </button>
        </div>
      </div>
    </div>
  );
};

export default CampaignCalculator;
