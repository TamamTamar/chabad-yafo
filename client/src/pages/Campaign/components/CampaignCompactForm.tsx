import React, { useEffect } from "react";
import styles from "../DonationCampaignPage.module.scss";
import type { DonorForm } from "../types";
import { useForm } from "react-hook-form";

type Props = {
  externalAmount?: number;
  onSubmit: (amount: number, donor: DonorForm) => void;
};

interface FormInputs extends DonorForm {
  amount: string;
}

const CampaignCompactForm: React.FC<Props> = ({ externalAmount, onSubmit }) => {
  const {
    register,
    handleSubmit,
    setValue,
    trigger, // הוספנו trigger כדי לעדכן את isValid ידנית
    formState: { errors, isValid },
  } = useForm<FormInputs>({
    mode: "onChange", // שינוי ל-onChange גורם לכפתור להשתחרר בזמן אמת
  });

  useEffect(() => {
    if (externalAmount !== undefined && externalAmount > 0) {
      setValue("amount", externalAmount.toString(), { shouldValidate: true });
      trigger(); // מוודא שהטופס בודק את עצמו מחדש כשהסכום מגיע מהמחשבון
    }
  }, [externalAmount, setValue, trigger]);

  const onFormSubmit = (data: FormInputs) => {
    const { amount, ...donorData } = data;
    onSubmit(Number(amount), donorData);
  };

  const scrollToCalculator = () => {
    const el = document.getElementById("calculator-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <form id="donation-form-section"
     className={styles.compactForm} onSubmit={handleSubmit(onFormSubmit)} noValidate>
      <div className={styles.compactInputSection}>
        <label className={styles.compactLabel}>סכום לתרומה</label>
        <div className={styles.amountInputWrapper}>
          <input
            type="number"
            className={`${styles.compactAmountInput} ${errors.amount ? styles.inputError : ""}`}
            placeholder="0"
            {...register("amount", {
              required: "חובה",
              min: { value: 1, message: "מינימום תרומה: ₪1" },
            })}
          />
        </div>
        {/* שימוש באותו Class של שאר השדות */}
        {errors.amount && <div className={styles.error}>{errors.amount.message}</div>}

        <button type="button" className={styles.calcLinkBtn} onClick={scrollToCalculator}>
          לא יודעים כמה לתרום? נסו את המחשבון שלנו
        </button>
      </div>

      <div className={styles.compactDetailsGrid}>
        <div className={styles.field}>
          <label className={styles.label}>שם פרטי</label>
          <input
            className={`${styles.input} ${errors.firstName ? styles.inputError : ""}`}
            {...register("firstName", {
              required: "חובה",
              validate: (v) => {
                const value = String(v || "").trim();
                return value.length >= 2 || "לפחות 2 אותיות";
              },
              pattern: { value: /^[a-zA-Zא-ת\s\-]+$/, message: "שם לא תקין" }
            })}
          />
          {errors.firstName && <div className={styles.error}>{errors.firstName.message}</div>}
        </div>

        <div className={styles.field}>
          <label className={styles.label}>שם משפחה</label>
          <input
            className={`${styles.input} ${errors.lastName ? styles.inputError : ""}`}
            {...register("lastName", {
              required: "חובה",
              validate: (v) => {
                const value = String(v || "").trim();
                return value.length >= 2 || "לפחות 2 אותיות";
              },
              pattern: { value: /^[a-zA-Zא-ת\s\-]+$/, message: "שם לא תקין" }
            })}
          />
          {errors.lastName && <div className={styles.error}>{errors.lastName.message}</div>}
        </div>

        <div className={styles.field}>
          <label className={styles.label}>טלפון</label>
          <input
            type="tel"
            className={`${styles.input} ${errors.phone ? styles.inputError : ""}`}
            {...register("phone", {
              required: "חובה",
              pattern: { 
                value: /^0(?:[23489]|[57]\d)\d{7}$/, 
                message: "טלפון לא תקין" 
              }
            })}
          />
          {errors.phone && <div className={styles.error}>{errors.phone.message}</div>}
        </div>

        <div className={styles.field}>
          <label className={styles.label}>אימייל</label>
          <input
            type="email"
            className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
            {...register("email", {
              required: "חובה",
              pattern: {
                value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                message: "אימייל לא תקין",
              },
            })}
          />
          {errors.email && <div className={styles.error}>{errors.email.message}</div>}
        </div>
      </div>

      <button type="submit" className={styles.compactSubmitBtn} disabled={!isValid}>
        אני רוצה לתרום
      </button>
    </form>
  );
};

export default CampaignCompactForm;