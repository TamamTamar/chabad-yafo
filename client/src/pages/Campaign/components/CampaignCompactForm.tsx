import React, { useEffect } from "react";
import styles from "../DonationCampaignPage.module.scss";
import type { DonorForm } from "../types";
import { useForm } from "react-hook-form";

type Props = {
  externalAmount?: number;
  showCalculatorLink?: boolean;
  onSubmit: (amount: number, donor: DonorForm) => void;
};

interface FormInputs extends DonorForm {
  amount: string;
}

const CampaignCompactForm: React.FC<Props> = ({ externalAmount, showCalculatorLink = true, onSubmit }) => {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormInputs>({
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  useEffect(() => {
    if (externalAmount !== undefined && externalAmount > 0) {
      setValue("amount", externalAmount.toString(), { shouldValidate: true });
    }
  }, [externalAmount, setValue]);

  const onFormSubmit = (data: FormInputs) => {
    const { amount, ...donorData } = data;
    onSubmit(Number(amount), donorData);
  };

  const scrollToCalculator = () => {
    const el = document.getElementById("calculator-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const keepDigitsOnly = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.target.value = event.target.value.replace(/\D/g, "");
  };

  return (
    <form id="donation-form-section"
     className={styles.compactForm} onSubmit={handleSubmit(onFormSubmit)} noValidate>
      <div className={styles.compactInputSection}>
        <label className={styles.compactLabel}>סכום לתרומה</label>
        <div className={styles.amountInputWrapper}>
          <input
            type="text"
            inputMode="numeric"
            className={`${styles.compactAmountInput} ${errors.amount ? styles.inputError : ""}`}
            placeholder="0"
            {...register("amount", {
              required: "חובה להזין סכום",
              min: { value: 1, message: "מינימום תרומה: ₪1" },
              pattern: { value: /^[1-9]\d*$/, message: "יש להזין ספרות בלבד" },
              onChange: keepDigitsOnly,
            })}
          />
        </div>
        {/* שימוש באותו Class של שאר השדות */}
        {errors.amount && <div className={styles.error}>{errors.amount.message}</div>}

        {showCalculatorLink && (
          <button type="button" className={styles.calcLinkBtn} onClick={scrollToCalculator}>
            לא יודעים כמה לתרום? נסו את המחשבון שלנו
          </button>
        )}
      </div>

      <div className={styles.compactDetailsGrid}>
        <div className={styles.field}>
          <label className={styles.label}>שם פרטי</label>
          <input
            className={`${styles.input} ${errors.firstName ? styles.inputError : ""}`}
            {...register("firstName", {
              required: "חובה להזין שם פרטי",
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
              required: "חובה להזין שם משפחה",
              validate: (v) => {
                const value = String(v || "").trim();
                return value.length >= 2 || "לפחות 2 אותיות";
              },
              pattern: { value: /^[a-zA-Zא-ת\s\-]+$/, message: "שם לא תקין" }
            })}
          />
          {errors.lastName && <div className={styles.error}>{errors.lastName.message}</div>}
        </div>

        <div className={`${styles.field} ${styles.contactField}`}>
          <label className={styles.label}>טלפון</label>
          <input
            type="tel"
            className={`${styles.input} ${styles.ltrInput} ${errors.phone ? styles.inputError : ""}`}
            {...register("phone", {
              required: "חובה להזין טלפון",
              pattern: { 
                value: /^0(?:[23489]|[57]\d)\d{7}$/, 
                message: "טלפון לא תקין" 
              },
              onChange: keepDigitsOnly,
            })}
          />
          {errors.phone && <div className={styles.error}>{errors.phone.message}</div>}
        </div>

        <div className={`${styles.field} ${styles.contactField}`}>
          <label className={styles.label}>אימייל</label>
          <input
            type="email"
            className={`${styles.input} ${styles.ltrInput} ${errors.email ? styles.inputError : ""}`}
            {...register("email", {
              required: "חובה להזין אימייל",
              pattern: {
                value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                message: "אימייל לא תקין",
              },
            })}
          />
          {errors.email && <div className={styles.error}>{errors.email.message}</div>}
        </div>
      </div>

      <button type="submit" className={styles.compactSubmitBtn}>
        אני רוצה לתרום
      </button>
    </form>
  );
};

export default CampaignCompactForm;
