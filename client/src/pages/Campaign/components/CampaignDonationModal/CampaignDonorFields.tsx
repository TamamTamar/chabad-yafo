import type { RefObject } from "react";
import type { FieldErrors, UseFormRegister } from "react-hook-form";

import styles from "../../DonationCampaignPage.module.scss";
import type { DonorForm } from "../../types";

type CampaignDonorFieldsProps = {
  amountMode: "preset" | "custom";
  amountToShow: number;
  customInputRef: RefObject<HTMLInputElement | null>;
  customRaw: string;
  errors: FieldErrors<DonorForm>;
  register: UseFormRegister<DonorForm>;
  setCustomRaw: (value: string) => void;
};

const CampaignDonorFields = ({
  amountMode,
  amountToShow,
  customInputRef,
  customRaw,
  errors,
  register,
  setCustomRaw,
}: CampaignDonorFieldsProps) => (
  <div className={styles.formContainer}>
    <div className={styles.modalAmountBox}>
      <span className={styles.modalAmountLabel}>סכום התרומה</span>
      <span className={styles.modalAmountValue}>₪{amountToShow}</span>
    </div>

    {amountMode === "custom" && (
      <div className={styles.customAmountRow}>
        <input
          ref={customInputRef}
          className={styles.customAmountInput}
          inputMode="numeric"
          placeholder="0"
          value={customRaw}
          onChange={(event) =>
            setCustomRaw(event.target.value.replace(/[^0-9]/g, ""))
          }
        />
      </div>
    )}

    <div className={styles.formGrid}>
      <div className={styles.field}>
        <label className={styles.label}>שם פרטי</label>
        <input
          className={`${styles.input} ${errors.firstName ? styles.inputError : ""}`}
          {...register("firstName", {
            required: "שדה חובה",
            minLength: { value: 2, message: "מינימום 2 תווים" },
          })}
        />
        {errors.firstName && (
          <span className={styles.errorText}>{errors.firstName.message}</span>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.label}>שם משפחה</label>
        <input
          className={`${styles.input} ${errors.lastName ? styles.inputError : ""}`}
          {...register("lastName", {
            required: "שדה חובה",
            minLength: { value: 2, message: "מינימום 2 תווים" },
          })}
        />
        {errors.lastName && (
          <span className={styles.errorText}>{errors.lastName.message}</span>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.label}>טלפון</label>
        <input
          className={`${styles.input} ${errors.phone ? styles.inputError : ""}`}
          {...register("phone", {
            required: "שדה חובה",
            pattern: { value: /^[0-9]{9,10}$/, message: "מספר טלפון לא תקין" },
          })}
        />
        {errors.phone && (
          <span className={styles.errorText}>{errors.phone.message}</span>
        )}
      </div>

      <div className={styles.field}>
        <label className={styles.label}>אימייל</label>
        <input
          className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
          {...register("email", {
            required: "שדה חובה",
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: "כתובת אימייל לא תקינה",
            },
          })}
        />
        {errors.email && (
          <span className={styles.errorText}>{errors.email.message}</span>
        )}
      </div>
    </div>
  </div>
);

export default CampaignDonorFields;
