import React, { useState, useMemo } from "react";
import styles from "../DonationCampaignPage.module.scss";

type Props = {
  onSelectAmount: (amount: number) => void;
};

const CampaignCalculator: React.FC<Props> = ({ onSelectAmount }) => {
  const [peopleCount, setPeopleCount] = useState<number>(1);
  const RATE = 86;

  const total = useMemo(() => peopleCount * RATE, [peopleCount]);


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
      <h2 className={styles.calcTitle}>מחשבון מחצית השקל</h2>
      <p className={styles.calcSubtitle}>הזינו את מספר הנפשות במשפחה</p>

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
          <div className={styles.rateInfo}>(86 ₪ עבור כל נפש)</div>
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