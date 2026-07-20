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
import CampaignInstructions from "./components/CampaignInstructions";

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
      currency: config.nedarim.Currency === "1" ? "ILS" : String(config.nedarim.Currency),
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
      currency: config.nedarim.Currency === "1" ? "ILS" : String(config.nedarim.Currency),
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
      currency: config.nedarim.Currency === "1" ? "ILS" : String(config.nedarim.Currency),
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

  const donationForm = config.isCompact ? (
    <CampaignCompactForm
      externalAmount={syncAmount}
      showCalculatorLink={config.showCalculator !== false}
      collectBlessingNames={config.collectBlessingNames}
      onSubmit={handleCompactSubmit}
    />
  ) : (
    <CampaignDonationOptions
      presetAmounts={config.presetAmounts}
      allowCustomAmount={config.allowCustomAmount}
      onPickPresetAmount={openDonation}
      onPickCustomAmount={openCustomDonation}
    />
  );

  const campaignIntro = (
    <CampaignIntro
      title={config.title}
      yearLabel={config.yearLabel}
      shaliachName={config.shaliachName}
      paragraphs={config.paragraphs}
    />
  );

  const hasSequentialInstructions = Boolean(
    config.instructionsBeforeDonation && config.instructions
  );

  return (
    <div className={styles.page} dir="rtl" lang="he">
      <CampaignHeroImage imageUrl={config.heroImage} variant={config.heroVariant} />

      <header className={styles.header}>
        <div className={styles.headerInner}>
          {hasSequentialInstructions ? (
            <div className={styles.sequentialIntro}>{campaignIntro}</div>
          ) : (
            <div className={styles.mainContentRow}>
              <div className={styles.introSide}>{campaignIntro}</div>
              <div className={styles.donateSide}>{donationForm}</div>
            </div>
          )}
          {config.primaryButton && (
            <div className={styles.fullWidthBtnWrapper}>
              <CampaignPrimaryButton {...config.primaryButton} />
            </div>
          )}
        </div>
      </header>

      {config.targetSunsetIso && <CampaignCountdownBar targetSunsetIso={config.targetSunsetIso} />}

      <main className={styles.main}>
        {config.instructions ? (
          <CampaignInstructions section={config.instructions} />
        ) : null}
        {config.isCompact && config.showCalculator !== false && (
          <CampaignCalculator
            onSelectAmount={handleCalculatorSelect}
            {...config.calculator}
          />
        )}
        {!hasSequentialInstructions && config.faq?.length ? (
          <CampaignFaq items={config.faq} />
        ) : null}
      </main>

      {hasSequentialInstructions ? (
        <section
          id="campaign-donation"
          className={styles.sequentialDonationSection}
          aria-labelledby="donation-stage-title"
        >
          <div className={styles.donationStage}>
            <div className={styles.donationStageHeading}>
              <span>השלב האחרון</span>
              <h2 id="donation-stage-title">תרומת פדיון הכפרות</h2>
              <p>
                העבירו את סכום הכפרות לצדקה. אפשר לצרף שמות לברכה ולהמשיך לתשלום מאובטח.
              </p>
            </div>
            <div className={styles.sequentialDonate}>{donationForm}</div>
          </div>
        </section>
      ) : null}

      {hasSequentialInstructions && config.faq?.length ? (
        <div className={styles.main}>
          <CampaignFaq items={config.faq} />
        </div>
      ) : null}

      <CampaignDonationModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        presetAmount={presetAmount}
        startWithCustom={startWithCustom}
        prefilledDonor={prefilledDonor}
        initialStep={directToStep2 ? 2 : 1}
        collectBlessingNames={config.collectBlessingNames}
        {...modalContext}
      />
    </div>
  );
};

export default DonationCampaignPage;
