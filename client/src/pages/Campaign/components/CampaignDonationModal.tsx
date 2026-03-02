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
    ok,
  } = useNedarimIframe({
    enabled: open && step === 2,
    iframeRef,
    onSuccess: onClose,
    successDelay: 4000,
  });

  useEffect(() => {
    if (!open) return;
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
    }
  }, [open, presetAmount, startWithCustom, resetPaymentUi, setErrorText, prefilledDonor, initialStep, reset]);

  const amountToShow = useMemo(() => {
    const parsed = Number(customRaw.replace(/[^\d]/g, ""));
    return amountMode === "custom" ? (parsed > 0 ? parsed : 0) : selectedAmount;
  }, [amountMode, customRaw, selectedAmount]);

  const payload = useMemo(() => {
    const base = buildNedarimPayload({
      Mosad: nedarim.Mosad,
      ApiValid: nedarim.ApiValid,
      Amount: amountToShow,
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
    return { ...base, ForceUpdateMatching: "1", ThirdPartyReceipt: "1" };
  }, [nedarim, amountToShow, currency, campaignTitle, yearLabel, shaliachName, watchedDonor]);

  const goNext = () => {
    if (amountMode === "custom") {
      const parsed = Number(customRaw.replace(/[^\d]/g, ""));
      if (parsed < 1) {
        setErrorText("נא להזין סכום תקין");
        return;
      }
      setSelectedAmount(parsed);
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

        {!ok && (
          <div className={styles.modalSteps}>
            <div className={`${styles.stepChip} ${step === 1 ? styles.stepChipActive : ""}`}>1. פרטים</div>
            <div className={`${styles.stepChip} ${step === 2 ? styles.stepChipActive : ""}`}>2. תשלום</div>
          </div>
        )}

        <div className={styles.modalBody}>
          {ok ? (
            <div className={styles.successMessage} style={{textAlign:'center', padding: '40px 20px'}}>
               <div style={{fontSize: '60px', marginBottom: '20px'}}>🎉</div>
               <h2 style={{color: '#28a745', fontSize: '24px'}}>תודה רבה, {watchedDonor.firstName}!</h2>
               <p style={{fontSize: '18px'}}>התרומה על סך <b>₪{selectedAmount}</b> התקבלה בהצלחה.</p>
               <p style={{color: '#888', marginTop: '20px', fontSize: '0.9em'}}>החלון יסגר כעת...</p>
            </div>
          ) : step === 1 ? (
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
                    placeholder="הזן סכום"
                    value={customRaw}
                    onChange={(e) => setCustomRaw(e.target.value.replace(/[^0-9]/g, ""))}
                  />
                </div>
              )}

              <div className={styles.formGrid}>
                {/* שם פרטי */}
                <div className={styles.field}>
                  <label className={styles.label}>שם פרטי</label>
                  <input 
                    className={`${styles.input} ${errors.firstName ? styles.inputError : ""}`} 
                    {...register("firstName", { 
                      required: "שדה חובה", 
                      minLength: { value: 2, message: "מינימום 2 תווים" } 
                    })} 
                  />
                  {errors.firstName && <span className={styles.errorText}>{errors.firstName.message}</span>}
                </div>

                {/* שם משפחה */}
                <div className={styles.field}>
                  <label className={styles.label}>שם משפחה</label>
                  <input 
                    className={`${styles.input} ${errors.lastName ? styles.inputError : ""}`} 
                    {...register("lastName", { 
                      required: "שדה חובה", 
                      minLength: { value: 2, message: "מינימום 2 תווים" } 
                    })} 
                  />
                  {errors.lastName && <span className={styles.errorText}>{errors.lastName.message}</span>}
                </div>

                {/* טלפון */}
                <div className={styles.field}>
                  <label className={styles.label}>טלפון</label>
                  <input 
                    className={`${styles.input} ${errors.phone ? styles.inputError : ""}`} 
                    {...register("phone", { 
                      required: "שדה חובה",
                      pattern: {
                        value: /^[0-9]{9,10}$/,
                        message: "מספר טלפון לא תקין"
                      }
                    })} 
                  />
                  {errors.phone && <span className={styles.errorText}>{errors.phone.message}</span>}
                </div>

                {/* אימייל */}
                <div className={styles.field}>
                  <label className={styles.label}>אימייל</label>
                  <input 
                    className={`${styles.input} ${errors.email ? styles.inputError : ""}`} 
                    {...register("email", { 
                      required: "שדה חובה",
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: "כתובת אימייל לא תקינה"
                      }
                    })} 
                  />
                  {errors.email && <span className={styles.errorText}>{errors.email.message}</span>}
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.iframeStep}>
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
            </div>
          )}
          {errorText && <div className={styles.errorBox} style={{textAlign:'center', color:'red', marginTop:'10px'}}>{errorText}</div>}
        </div>

        {!ok && (
          <div className={styles.modalFooter}>
            <div className={styles.modalActions}>
              <button className={styles.btnSecondary} onClick={step === 2 ? () => setStep(1) : onClose} disabled={isPaying}>
                {step === 2 ? "חזרה" : "ביטול"}
              </button>
              <button 
                className={styles.btnPrimary} 
                onClick={step === 1 ? handleSubmit(goNext) : () => startPayment(payload)} 
                disabled={isPaying || (step === 1 && !isValid)}
              >
                {step === 1 ? "המשך לתשלום" : isPaying ? "מעבד..." : "בצע תשלום"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignDonationModal;