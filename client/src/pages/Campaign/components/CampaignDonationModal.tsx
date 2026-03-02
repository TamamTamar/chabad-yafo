import React, { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import styles from "../DonationCampaignPage.module.scss";

import { buildNedarimPayload } from "../../../shared/donations/nedarimPayload";
import type { Currency } from "../../../shared/donations/nedarimPayload";
import { useNedarimIframe } from "../../../shared/donations/useNedarimIframe";

import type { DonorForm, DonationCampaignConfig } from "../types";

type Step = 1 | 2;

type Props = {
  open: boolean;
  onClose: () => void;
  presetAmount: number;
  startWithCustom?: boolean;
  shaliachName: string;
  yearLabel: string;
  campaignTitle: string;
  nedarim: DonationCampaignConfig["nedarim"];
  prefilledDonor?: DonorForm;
  initialStep?: 1 | 2;
};

const CampaignDonationModal: React.FC<Props> = ({
  open,
  onClose,
  presetAmount,
  startWithCustom = false,
  shaliachName,
  yearLabel,
  campaignTitle,
  nedarim,
  prefilledDonor,
  initialStep,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>(1);
  const [amountMode, setAmountMode] = useState<"preset" | "custom" | string>("preset");
  const [selectedAmount, setSelectedAmount] = useState<number>(presetAmount);
  const [customRaw, setCustomRaw] = useState<string>("");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isValid },
  } = useForm<DonorForm>({
    mode: "onChange",
    defaultValues: prefilledDonor || { firstName: "", lastName: "", phone: "", email: "" },
  });

  const watchedDonor = watch();
  const currency: Currency = nedarim.Currency;

  const {
    isPaying,
    errorText,
    setErrorText,
    startPayment,
    resetPaymentUi,
    ok, // משתנה המציין הצלחה
  } = useNedarimIframe({
    // ה-enabled מוודא שה-iframe לא רץ "ברקע" כשלא צריך
    enabled: open && step === 2,
    iframeRef,
    onSuccess: onClose, // סגירת המודל אוטומטית אחרי ההצלחה
  });

  useEffect(() => {
    if (!open) return;
    
    // איפוס מצב המודל בפתיחה מחדש
    setStep(initialStep ?? 1);
    setErrorText("");
    resetPaymentUi();
    setSelectedAmount(presetAmount);
    reset(prefilledDonor || { firstName: "", lastName: "", phone: "", email: "" });

    if (startWithCustom) {
      setAmountMode("custom");
      setCustomRaw("");
      window.setTimeout(() => customInputRef.current?.focus(), 0);
    } else {
      setAmountMode("preset");
      setCustomRaw("");
    }
  }, [open, presetAmount, startWithCustom, resetPaymentUi, setErrorText, prefilledDonor, initialStep, reset]);

  const parsedCustom = useMemo(() => {
    const n = Number(customRaw.replace(/[^\d]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }, [customRaw]);

  const amountToShowStep1 = useMemo(() => {
    return amountMode === "custom" ? (parsedCustom > 0 ? parsedCustom : 0) : selectedAmount;
  }, [amountMode, parsedCustom, selectedAmount]);

  const payload = useMemo(() => {
    return buildNedarimPayload({
      Mosad: nedarim.Mosad,
      ApiValid: nedarim.ApiValid,
      Amount: amountToShowStep1,
      Tashlumim: 1,
      Currency: currency,
      Description: `${campaignTitle} ${yearLabel} - ${shaliachName}`,
      firstName: (watchedDonor.firstName || "").trim(),
      lastName: (watchedDonor.lastName || "").trim(),
      phone: (watchedDonor.phone || "").trim(),
      email: (watchedDonor.email || "").trim(),
      Comment: nedarim.Comment,
      PaymentType: nedarim.PaymentType,
    });
  }, [nedarim, amountToShowStep1, currency, campaignTitle, yearLabel, shaliachName, watchedDonor]);

  const goNext = () => {
    if (amountMode === "custom") {
      if (!parsedCustom || parsedCustom < 1) {
        setErrorText("נא להזין סכום תקין");
        return;
      }
      setSelectedAmount(parsedCustom);
    }
    setStep(2);
  };

  if (!open) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalBackdrop} onClick={onClose} />
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            {campaignTitle} <span className={styles.modalMuted}>{yearLabel}</span>
          </div>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalSteps}>
          <div className={`${styles.stepChip} ${step === 1 ? styles.stepChipActive : ""}`}>1. פרטים</div>
          <div className={`${styles.stepChip} ${step === 2 ? styles.stepChipActive : ""}`}>2. תשלום</div>
        </div>

        <div className={styles.modalBody}>
          {step === 1 ? (
            <>
              <div className={styles.modalAmountBox}>
                <span className={styles.modalAmountLabel}>סכום התרומה</span>
                <span className={styles.modalAmountValue}>₪{amountToShowStep1}</span>
              </div>
              {amountMode === "custom" && (
                <div className={styles.customAmountRow}>
                  <input
                    ref={customInputRef}
                    className={styles.customAmountInput}
                    inputMode="numeric"
                    placeholder="0"
                    value={customRaw}
                    onChange={(e) => setCustomRaw(e.target.value.replace(/[^0-9]/g, ""))}
                  />
                </div>
              )}
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label className={styles.label}>שם פרטי</label>
                  <input
                    className={`${styles.input} ${errors.firstName ? styles.inputError : ""}`}
                    {...register("firstName", {
                      required: "חובה",
                      validate: (v) => (String(v || "").trim().length >= 2) || "לפחות 2 אותיות",
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
                      validate: (v) => (String(v || "").trim().length >= 2) || "לפחות 2 אותיות",
                    })}
                  />
                  {errors.lastName && <div className={styles.error}>{errors.lastName.message}</div>}
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>טלפון</label>
                  <input
                    className={`${styles.input} ${errors.phone ? styles.inputError : ""}`}
                    {...register("phone", {
                      required: "חובה",
                      validate: (v) => {
                        const digits = String(v || "").replace(/\D/g, "");
                        const ok = /^0\d{8,9}$/.test(digits) || /^972\d{8,9}$/.test(digits);
                        return ok || "טלפון לא תקין";
                      },
                    })}
                  />
                  {errors.phone && <div className={styles.error}>{errors.phone.message}</div>}
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>אימייל</label>
                  <input
                    className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
                    {...register("email", {
                      required: "חובה",
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: "אימייל לא תקין",
                      },
                    })}
                  />
                  {errors.email && <div className={styles.error}>{errors.email.message}</div>}
                </div>
              </div>
            </>
          ) : (
            <div className={styles.iframeStep}>
              {/* מסך הצלחה חגיגי */}
              {ok ? (
                <div className={styles.successMessage} style={{textAlign:'center', padding: '40px 20px'}}>
                   <div style={{fontSize: '50px', marginBottom: '10px'}}>🎉</div>
                   <h2 style={{color: '#28a745'}}>תודה רבה, {watchedDonor.firstName}!</h2>
                   <p>התרומה על סך ₪{selectedAmount} התקבלה בהצלחה.</p>
                   <p style={{fontSize: '0.9em', color: '#666'}}>החלון יסגר בעוד רגע...</p>
                </div>
              ) : (
                <>
                  <div className={styles.amountOnly}>₪{selectedAmount}</div>
                  <div className={styles.iframeCard}>
                    <iframe
                      ref={iframeRef}
                      title="Nedarim Plus"
                      src="https://matara.pro/nedarimplus/iframe?language=he"
                      className={styles.iframe}
                      scrolling="no"
                    />
                  </div>
                </>
              )}
            </div>
          )}
          {errorText && <div className={styles.errorBox} style={{textAlign:'center', color:'red', marginTop:'10px'}}>{errorText}</div>}
        </div>

        <div className={styles.modalFooter}>
          <div className={styles.modalActions}>
            {/* מסתירים את הכפתורים ברגע שהתשלום הצליח */}
            {!ok && (
              <>
                <button className={styles.btnSecondary} onClick={step === 2 ? () => setStep(1) : onClose}>
                  {step === 2 ? "חזרה" : "ביטול"}
                </button>
                <button
                  className={styles.btnPrimary}
                  onClick={step === 1 ? handleSubmit(goNext) : () => startPayment(payload)}
                  disabled={isPaying || (step === 1 && !isValid)}
                >
                  {step === 1 ? "המשך לתשלום" : "בצע תשלום"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignDonationModal;