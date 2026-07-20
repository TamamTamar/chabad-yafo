export type CampaignFaqItem = {
  q: string;
  a: string;
  open?: boolean;
};

export type CampaignInstructionSection = {
  title: string;
  intro?: string;
  items: Array<{
    title: string;
    text: string;
    cta?: {
      label: string;
      href: string;
    };
  }>;
  note?: string;
};

export type CampaignPrimaryButton = {
  label: string;
  href: string;
  icon?: "coin" | "arrow";
};

export type DonationCampaignConfig = {
  // identity
  slug: string; // "purim" | "machatzit" וכו'
  shaliachName: string;
  yearLabel: string;

  // hero
  heroImage: string;
  heroVariant?: "default" | "compact";
  title: string; // כותרת עמוד (למשל "מתנות לאביונים")

  // content
  paragraphs: string[];

  // donate
  presetAmounts: number[];
  allowCustomAmount: boolean;

  // countdown (optional)
  targetSunsetIso?: string;

  // extra CTA button (optional)
  primaryButton?: CampaignPrimaryButton;

  // faq (optional)
  faq?: CampaignFaqItem[];

  isCompact?: boolean; // <-- תוסיפי את השורה הזו
  showCalculator?: boolean;
  calculator?: {
    title: string;
    subtitle: string;
    rate: number;
    rateLabel: string;
  };
  collectBlessingNames?: boolean;
  instructions?: CampaignInstructionSection;
  instructionsBeforeDonation?: boolean;

  // nedarim settings
  nedarim: {
    Mosad: string;
    ApiValid: string;
    Currency: "1" | "2";
    PaymentType:string
    Comment:string
  };
};

export type DonorForm = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  blessingNames?: string;
};
