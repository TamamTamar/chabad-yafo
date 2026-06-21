import React, { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";

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
};

const EMPTY_DONOR: DonorForm = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
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

  const [step, setStep] = useState<CampaignDonationStep>(1);
  const [amountMode, setAmountMode] = useState<"preset" | "custom">("preset");
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
    defaultValues: prefilledDonor || EMPTY_DONOR,
  });

  const watchedDonor = watch();
  const currency: Currency = nedarim.Currency;

  const { isPaying, errorText, setErrorText, startPayment, resetPaymentUi, ok } =
    useNedarimIframe({
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
    setCustomRaw("");
    reset(prefilledDonor || EMPTY_DONOR);

    if (startWithCustom) {
      setAmountMode("custom");
      window.setTimeout(() => customInputRef.current?.focus(), 0);
    } else {
      setAmountMode("preset");
    }
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
      Comment: nedarim.Comment,
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
        <CampaignModalHeader
          campaignTitle={campaignTitle}
          yearLabel={yearLabel}
          onClose={onClose}
        />

        {!ok && <CampaignModalSteps step={step} />}

        <div className={styles.modalBody}>
          {ok ? (
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
            />
          ) : (
            <CampaignPaymentFrame
              iframeRef={iframeRef}
              selectedAmount={selectedAmount}
            />
          )}

          {errorText && <div className={styles.errorBox}>{errorText}</div>}
        </div>

        {!ok && (
          <CampaignModalFooter
            isPaying={isPaying}
            isValid={isValid}
            onBack={() => setStep(1)}
            onCancel={onClose}
            onNext={handleSubmit(goNext)}
            onPay={() => startPayment(payload)}
            step={step}
          />
        )}
      </div>
    </div>
  );
};

export default CampaignDonationModal;
