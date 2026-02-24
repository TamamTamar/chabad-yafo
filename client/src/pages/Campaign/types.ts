export type CampaignFaqItem = {
  q: string;
  a: string;
  open?: boolean;
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
};