import React, { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import {
  trackDonationComplete,
  trackDonationPaymentStart,
} from "../../../services/googleAnalyticsService";
import { buildNedarimPayload } from "../../../shared/donations/nedarimPayload";
import type { Currency } from "../../../shared/donations/nedarimPayload";
import { useNedarimIframe } from "../../../shared/donations/useNedarimIframe";
import type { DonationCampaignConfig, DonorForm } from "../types";
import CampaignDonorFields from "./CampaignDonationModal/CampaignDonorFields";
import CampaignModalFooter from "./CampaignDonationModal/CampaignModalFooter";
import CampaignModalHeader from "./CampaignDonationModal/CampaignModalHeader";
import CampaignModalSteps from "./CampaignDonationModal/CampaignModalSteps";
import CampaignPaymentFrame from "./CampaignDonationModal/CampaignPaymentFrame";
import CampaignSuccessMessage from "./CampaignDonationModal/CampaignSuccessMessage";
import type { CampaignDonationStep } from "./CampaignDonationModal/types";

import styles from "../DonationCampaignPage.module.scss";

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
  initialStep?: CampaignDonationStep;
  collectBlessingNames?: boolean;
};

const EMPTY_DONOR: DonorForm = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  blessingNames: "",
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
  collectBlessingNames = false,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<CampaignDonationStep>(1);
  const [amountMode, setAmountMode] = useState<"preset" | "custom">("preset");
  const [selectedAmount, setSelectedAmount] = useState<number>(presetAmount);
  const [customRaw, setCustomRaw] = useState<string>("");
  const [showSuccessPreview, setShowSuccessPreview] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DonorForm>({
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: prefilledDonor || EMPTY_DONOR,
  });

  const watchedDonor = useWatch({ control });
  const currency: Currency = nedarim.Currency;

  const { isPaying, errorText, setErrorText, startPayment, resetPaymentUi, ok } =
    useNedarimIframe({
      enabled: open && step === 2,
      iframeRef,
      onSuccess: () => {
        trackDonationComplete({
          value: selectedAmount,
          currency: currency === "1" ? "ILS" : String(currency),
          donation_source: "campaign",
          campaign_title: campaignTitle,
        });
        onClose();
      },
      successDelay: 4000,
    });

  useEffect(() => {
    if (!open) return;

    const resetTimer = window.setTimeout(() => {
      setStep(initialStep ?? 1);
      setShowSuccessPreview(false);
      setErrorText("");
      resetPaymentUi();
      setSelectedAmount(presetAmount);
      setCustomRaw("");
      setAmountMode(startWithCustom ? "custom" : "preset");
      reset(prefilledDonor || EMPTY_DONOR);
    }, 0);

    return () => window.clearTimeout(resetTimer);
  }, [
    open,
    presetAmount,
    startWithCustom,
    resetPaymentUi,
    setErrorText,
    prefilledDonor,
    initialStep,
    reset,
  ]);

  useEffect(() => {
    if (!open || !startWithCustom) return;

    const focusTimer = window.setTimeout(
      () => customInputRef.current?.focus(),
      0,
    );

    return () => window.clearTimeout(focusTimer);
  }, [open, startWithCustom]);

  const amountToShow = useMemo(() => {
    if (amountMode === "custom") {
      const parsed = Number(customRaw.replace(/[^\d]/g, ""));
      return parsed > 0 ? parsed : 0;
    }

    return selectedAmount;
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
      Comment: watchedDonor.blessingNames?.trim()
        ? `${nedarim.Comment} | לברכה: ${watchedDonor.blessingNames.trim()}`
        : nedarim.Comment,
      PaymentType: nedarim.PaymentType,
    });

    return { ...base, ForceUpdateMatching: "1" };
  }, [
    nedarim,
    amountToShow,
    currency,
    campaignTitle,
    yearLabel,
    shaliachName,
    watchedDonor,
  ]);

  const goNext = () => {
    let nextAmount = amountToShow;

    if (amountMode === "custom") {
      const parsed = Number(customRaw.replace(/[^\d]/g, ""));

      if (parsed < 1) {
        setErrorText("נא להזין סכום תקין");
        return;
      }

      nextAmount = parsed;
      setSelectedAmount(parsed);
    }

    setStep(2);
    trackDonationPaymentStart({
      value: nextAmount,
      currency: currency === "1" ? "ILS" : String(currency),
      donation_source: "campaign",
      campaign_title: campaignTitle,
    });
  };

  const showTestSuccess = () => {
    const previewAmount = amountToShow || selectedAmount || presetAmount;

    setSelectedAmount(previewAmount);
    setErrorText("");
    setShowSuccessPreview(true);
  };

  if (!open) return null;

  const isSuccessVisible = ok || showSuccessPreview;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalBackdrop} onClick={onClose} />

      <div className={styles.modal}>
        <CampaignModalHeader
          campaignTitle={campaignTitle}
          yearLabel={yearLabel}
          onClose={onClose}
        />

        {!isSuccessVisible && <CampaignModalSteps step={step} />}

        <div className={styles.modalBody}>
          {isSuccessVisible ? (
            <CampaignSuccessMessage
              firstName={watchedDonor.firstName}
              selectedAmount={selectedAmount}
            />
          ) : step === 1 ? (
            <CampaignDonorFields
              amountMode={amountMode}
              amountToShow={amountToShow}
              customInputRef={customInputRef}
              customRaw={customRaw}
              errors={errors}
              register={register}
              setCustomRaw={setCustomRaw}
              collectBlessingNames={collectBlessingNames}
            />
          ) : (
            <CampaignPaymentFrame
              iframeRef={iframeRef}
              selectedAmount={selectedAmount}
            />
          )}

          {errorText && <div className={styles.errorBox}>{errorText}</div>}
        </div>

        {!isSuccessVisible && (
          <CampaignModalFooter
            isPaying={isPaying}
            onBack={() => setStep(1)}
            onCancel={onClose}
            onNext={handleSubmit(goNext)}
            onPay={() => startPayment(payload)}
            onTestSuccess={import.meta.env.DEV ? showTestSuccess : undefined}
            step={step}
          />
        )}
      </div>
    </div>
  );
};

export default CampaignDonationModal;
