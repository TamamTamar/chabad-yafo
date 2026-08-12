export type DaycareDonationStatusOverride = "auto" | "open" | "closed";
export type DaycareDonationRecordStatus =
    | "confirmed"
    | "refunded"
    | "cancelled";
export type DaycareDonationSource = "manual" | "nedarim";
export type DaycareDonationManualSource =
    | "bank_transfer"
    | "cash"
    | "check"
    | "other";
export type DaycareDonationIntentStatus =
    | "created"
    | "submitted"
    | "confirmed"
    | "failed"
    | "expired";
export type DaycareDonationIntentMode = "live" | "diagnostic";

export type DaycareDonationAmbassadorDocument = {
    name: string;
    refCode: string;
    goal: number;
    active: boolean;
    createdAt?: Date;
    updatedAt?: Date;
};

export type DaycareDonationVisual = {
    src?: string;
    alt: string;
};

export type DaycareDonationCategoryConfig = {
    id: string;
    title: string;
    shortTitle: string;
    description: string;
    goal: number;
    order: number;
    visual: DaycareDonationVisual;
};

export type DaycareDonationItemConfig = {
    id: string;
    categoryId: string;
    title: string;
    description: string;
    goal: number;
    order: number;
    openingPriority: number;
    acceptingDonations: boolean;
    statusOverride: DaycareDonationStatusOverride;
    visual: DaycareDonationVisual;
};

export type DaycareDonationCampaignDocument = {
    slug: string;
    title: string;
    goal: number;
    active: boolean;
    categories: DaycareDonationCategoryConfig[];
    items: DaycareDonationItemConfig[];
    createdAt?: Date;
    updatedAt?: Date;
};

export type DaycareDonationRecordDocument = {
    campaignSlug: string;
    source: DaycareDonationSource;
    status: DaycareDonationRecordStatus;
    amount: number;
    itemId?: string;
    donorName?: string;
    phone?: string;
    email?: string;
    dedication?: string;
    note?: string;
    manualSource?: DaycareDonationManualSource;
    reference?: string;
    enteredById?: string;
    enteredByLabel?: string;
    providerIntentId?: string;
    externalTransactionId?: string;
    ambassadorId?: unknown;
    receivedAt: Date;
    createdAt?: Date;
    updatedAt?: Date;
};

export type DaycareDonationIntentDocument = {
    publicId: string;
    campaignSlug: string;
    mode: DaycareDonationIntentMode;
    status: DaycareDonationIntentStatus;
    amount: number;
    itemId?: string;
    donorName: string;
    phone: string;
    email: string;
    dedication?: string;
    ambassadorId?: unknown;
    externalTransactionId?: string;
    providerMessage?: string;
    expiresAt: Date;
    confirmedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
};

export type DaycareDonationAuditDocument = {
    campaignSlug: string;
    action: string;
    entityType:
        | "campaign"
        | "category"
        | "item"
        | "record"
        | "intent"
        | "ambassador";
    entityId: string;
    actor: "admin" | "nedarim" | "system";
    actorId?: string;
    actorLabel?: string;
    reason?: string;
    before?: unknown;
    after?: unknown;
    createdAt?: Date;
    updatedAt?: Date;
};
