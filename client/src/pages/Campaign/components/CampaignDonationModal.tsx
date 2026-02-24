import React, { useEffect, useMemo, useRef, useState } from "react";
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
  prefilledDonor?: DonorForm; // מאפשר להעביר פרטים מראש
  initialStep?: 1 | 2
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
  prefilledDonor, // <--- להוסיף כאן
  initialStep,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>(1);
  const [donor, setDonor] = useState<DonorForm>({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
  });

  const [amountMode, setAmountMode] = useState<"preset" | "custom">("preset");
  const [selectedAmount, setSelectedAmount] = useState<number>(presetAmount);
  const [customRaw, setCustomRaw] = useState<string>("");

  const currency: Currency = nedarim.Currency;

  const {
    isReady,
    isPaying,
    ok,
    statusText,
    errorText,
    setErrorText,
    startPayment,
    resetPaymentUi,
  } = useNedarimIframe({
    enabled: open && step === 2,
    iframeRef,
  });

  useEffect(() => {
  if (!open) return;

  // במקום תמיד לקבוע שלב 1, נשתמש ב-initialStep אם הוא קיים
  setStep(initialStep ?? 1); 
  
  setErrorText("");
  resetPaymentUi();
  setSelectedAmount(presetAmount);

  // אם הועברו פרטים מראש, נכניס אותם ל-State של ה-donor
  if (prefilledDonor) {
    setDonor(prefilledDonor);
  } else {
    // איפוס לטופס ריק עבור מתנות לאביונים
    setDonor({
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
    });
  }

  if (startWithCustom) {
    setAmountMode("custom");
    setCustomRaw("");
    window.setTimeout(() => customInputRef.current?.focus(), 0);
  } else {
    setAmountMode("preset");
    setCustomRaw("");
  }
}, [open, presetAmount, startWithCustom, resetPaymentUi, setErrorText, prefilledDonor, initialStep]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const parsedCustom = useMemo(() => {
    const n = Number(customRaw.replace(/[^\d]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }, [customRaw]);

  const amountToShowStep1 = useMemo(() => {
    if (amountMode === "custom") return parsedCustom > 0 ? parsedCustom : 0;
    return selectedAmount;
  }, [amountMode, parsedCustom, selectedAmount]);

  const description = useMemo(
    () => `${campaignTitle} ${yearLabel} - ${shaliachName}`,
    [campaignTitle, yearLabel, shaliachName]
  );

  const payload = useMemo(() => {
    return buildNedarimPayload({
      Mosad: nedarim.Mosad,
      ApiValid: nedarim.ApiValid,
      Amount: step === 1 && amountMode === "custom" ? parsedCustom : selectedAmount,
      Tashlumim: 1,
      Currency: currency,
      Description: description,
      firstName: donor.firstName.trim(),
      lastName: donor.lastName.trim(),
      phone: donor.phone.trim(),
      email: donor.email.trim(),
      Comment: nedarim.Comment,
      PaymentType: nedarim.PaymentType



      
    });
  }, [nedarim, selectedAmount, parsedCustom, amountMode, step, currency, description, donor]);

  const step1Errors = useMemo(() => {
    const e: Partial<Record<keyof DonorForm, string>> = {};
    if (!donor.firstName.trim()) e.firstName = "שם פרטי חובה";
    if (!donor.lastName.trim()) e.lastName = "שם משפחה חובה";
    if (!donor.phone.trim()) e.phone = "טלפון חובה";
    if (!donor.email.trim()) e.email = "אימייל חובה";
    else if (!/^\S+@\S+\.\S+$/.test(donor.email.trim())) e.email = "אימייל לא תקין";
    return e;
  }, [donor]);

  const canGoStep2 = Object.keys(step1Errors).length === 0;

  const goNext = () => {
    setErrorText("");
    if (!canGoStep2) return;
    if (amountMode === "custom") {
      if (!parsedCustom || parsedCustom < 1) {
        setErrorText("נא להזין סכום תקין");
        return;
      }
      setSelectedAmount(parsedCustom);
    }
    resetPaymentUi();
    setStep(2);
  };

  const onPay = () => {
    setErrorText("");
    if (!selectedAmount || selectedAmount < 1) {
      setErrorText("סכום לא תקין");
      return;
    }
    startPayment(payload);
  };

  if (!open) return null;

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true">
      <div className={styles.modalBackdrop} onClick={onClose} />

      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            {campaignTitle} <span className={styles.modalMuted}>{yearLabel}</span>
          </div>
          <button type="button" className={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalSteps}>
          <div className={[styles.stepChip, step === 1 ? styles.stepChipActive : ""].join(" ")}>1. פרטים</div>
          <div className={[styles.stepChip, step === 2 ? styles.stepChipActive : ""].join(" ")}>2. תשלום</div>
        </div>

        <div className={styles.modalBody}>
          {step === 1 && (
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
                    className={[styles.input, step1Errors.firstName ? styles.inputError : ""].join(" ")}
                    value={donor.firstName}
                    onChange={(e) => setDonor((p) => ({ ...p, firstName: e.target.value }))}
                  />
                  {step1Errors.firstName && <div className={styles.error}>{step1Errors.firstName}</div>}
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>שם משפחה</label>
                  <input
                    className={[styles.input, step1Errors.lastName ? styles.inputError : ""].join(" ")}
                    value={donor.lastName}
                    onChange={(e) => setDonor((p) => ({ ...p, lastName: e.target.value }))}
                  />
                  {step1Errors.lastName && <div className={styles.error}>{step1Errors.lastName}</div>}
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>טלפון</label>
                  <input
                    className={[styles.input, step1Errors.phone ? styles.inputError : ""].join(" ")}
                    inputMode="tel"
                    value={donor.phone}
                    onChange={(e) => setDonor((p) => ({ ...p, phone: e.target.value }))}
                  />
                  {step1Errors.phone && <div className={styles.error}>{step1Errors.phone}</div>}
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>אימייל</label>
                  <input
                    className={[styles.input, step1Errors.email ? styles.inputError : ""].join(" ")}
                    inputMode="email"
                    value={donor.email}
                    onChange={(e) => setDonor((p) => ({ ...p, email: e.target.value }))}
                  />
                  {step1Errors.email && <div className={styles.error}>{step1Errors.email}</div>}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <div className={styles.iframeStep}>
              <div className={styles.amountOnly}>₪{selectedAmount}</div>
              <div className={styles.iframeCard}>
                {!isReady && <div className={styles.loading}>טוען טופס תשלום…</div>}
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

          {/* הצגת הודעות רק אם קיימות, כדי לא לתפוס גובה מיותר */}
          {statusText && <div className={styles.result} style={{marginTop: '10px', textAlign: 'center'}}>{statusText}</div>}
          {errorText && <div className={styles.errorBox} style={{marginTop: '10px'}}>{errorText}</div>}
          {ok && <div className={styles.ok} style={{marginTop: '10px', textAlign: 'center'}}>✔️ התשלום הצליח!</div>}
          {isPaying && <div className={styles.wait} style={{marginTop: '10px', textAlign: 'center'}}>⏳ מעבד תשלום…</div>}
        </div>

        <div className={styles.modalFooter}>
          <div className={styles.modalActions}>
            <button type="button" className={styles.btnSecondary} onClick={step === 2 ? () => setStep(1) : onClose} disabled={isPaying}>
              {step === 2 ? "חזרה" : "ביטול"}
            </button>
            <button type="button" className={styles.btnPrimary} onClick={step === 1 ? goNext : onPay} disabled={isPaying || (step === 1 && !canGoStep2)}>
              {step === 1 ? "המשך לתשלום" : "בצע תשלום"}
            </button>
          </div>
          <div className={styles.micro}>מאובטח • קבלה מסודרת • נדרים פלוס</div>
        </div>
      </div>
    </div>
  );
};

export default CampaignDonationModal;