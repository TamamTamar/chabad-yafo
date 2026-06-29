import React, { useMemo, useState } from "react";
import styles from "./DonationCampaignPage.module.scss";

import { trackDonationStart } from "../../services/googleAnalyticsService";
import type { DonationCampaignConfig, DonorForm } from "./types";
import CampaignHeroImage from "./components/CampaignHeroImage";
import CampaignIntro from "./components/CampaignIntro";
import CampaignPrimaryButton from "./components/CampaignPrimaryButton";
import CampaignDonationOptions from "./components/CampaignDonationOptions";
import CampaignCountdownBar from "./components/CampaignCountdownBar";
import CampaignFaq from "./components/CampaignFaq";
import CampaignDonationModal from "./components/CampaignDonationModal";
import CampaignCompactForm from "./components/CampaignCompactForm";
import CampaignCalculator from "./components/CampaignCalculator";

type Props = {
  config: DonationCampaignConfig;
};

const DonationCampaignPage: React.FC<Props> = ({ config }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [presetAmount, setPresetAmount] = useState<number>(config.presetAmounts[0] ?? 100);
  const [startWithCustom, setStartWithCustom] = useState(false);
  const [prefilledDonor, setPrefilledDonor] = useState<DonorForm | undefined>(undefined);
  const [directToStep2, setDirectToStep2] = useState(false);
  
  // המשתנה שמחזיק את הסכום שנבחר במחשבון ומעביר אותו לטופס
  const [syncAmount, setSyncAmount] = useState<number | undefined>(undefined);

  const modalContext = useMemo(
    () => ({
      shaliachName: config.shaliachName,
      yearLabel: config.yearLabel,
      campaignTitle: config.title,
      nedarim: config.nedarim,
    }),
    [config]
  );

  const openDonation = (amount: number) => {
    trackDonationStart({
      value: amount,
      currency: config.nedarim.Currency === 1 ? "ILS" : String(config.nedarim.Currency),
      donation_source: "campaign",
      campaign_title: config.title,
    });
    setPrefilledDonor(undefined);
    setDirectToStep2(false);
    setStartWithCustom(false);
    setPresetAmount(amount);
    setIsModalOpen(true);
  };

  const openCustomDonation = () => {
    trackDonationStart({
      currency: config.nedarim.Currency === 1 ? "ILS" : String(config.nedarim.Currency),
      donation_source: "campaign",
      campaign_title: config.title,
      amount_mode: "custom",
    });
    setPrefilledDonor(undefined);
    setDirectToStep2(false);
    setStartWithCustom(true);
    setPresetAmount(config.presetAmounts[0] ?? 100);
    setIsModalOpen(true);
  };

  const handleCompactSubmit = (amount: number, donor: DonorForm) => {
    trackDonationStart({
      value: amount,
      currency: config.nedarim.Currency === 1 ? "ILS" : String(config.nedarim.Currency),
      donation_source: "campaign_compact_form",
      campaign_title: config.title,
    });
    setPresetAmount(amount);
    setPrefilledDonor(donor);
    setDirectToStep2(true); 
    setIsModalOpen(true);
  };

  // פונקציה שמעדכנת רק את הסטייט המקומי, מה שגורם לטופס להתעדכן
  const handleCalculatorSelect = (amount: number) => {
    setSyncAmount(amount);
  };

  return (
    <div className={styles.page} dir="rtl" lang="he">
      <CampaignHeroImage imageUrl={config.heroImage} />

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.mainContentRow}>
            <div className={styles.introSide}>
              <CampaignIntro
                title={config.title}
                yearLabel={config.yearLabel}
                shaliachName={config.shaliachName}
                paragraphs={config.paragraphs}
              />
            </div>

            <div className={styles.donateSide}>
              {config.isCompact ? (
                <CampaignCompactForm 
                  externalAmount={syncAmount} 
                  onSubmit={handleCompactSubmit} 
                />
              ) : (
                <CampaignDonationOptions
                  presetAmounts={config.presetAmounts}
                  allowCustomAmount={config.allowCustomAmount}
                  onPickPresetAmount={openDonation}
                  onPickCustomAmount={openCustomDonation}
                />
              )}
            </div>
          </div>
          {config.primaryButton && (
            <div className={styles.fullWidthBtnWrapper}>
              <CampaignPrimaryButton {...config.primaryButton} />
            </div>
          )}
        </div>
      </header>

      {config.targetSunsetIso && <CampaignCountdownBar targetSunsetIso={config.targetSunsetIso} />}

      <main className={styles.main}>
        {config.isCompact && (
          <CampaignCalculator onSelectAmount={handleCalculatorSelect} />
        )}
        {config.faq?.length ? <CampaignFaq items={config.faq} /> : null}
      </main>

      <CampaignDonationModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        presetAmount={presetAmount}
        startWithCustom={startWithCustom}
        prefilledDonor={prefilledDonor}
        initialStep={directToStep2 ? 2 : 1}
        {...modalContext}
      />
    </div>
  );
};

export default DonationCampaignPage;
