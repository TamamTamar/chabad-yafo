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
export type DaycareDonationLeadStatus =
    | "new"
    | "contacted"
    | "waiting"
    | "pledged"
    | "completed"
    | "closed";
export type DaycareDonationContactMethod =
    | "phone"
    | "whatsapp"
    | "meeting"
    | "other";
export type DaycareDonationIntentStatus =
    | "created"
    | "submitted"
    | "confirmed"
    | "failed"
    | "expired";
export type DaycareDonationIntentMode = "live" | "diagnostic";
export type DaycareDonationPaymentType = "HK" | "Ragil";

export type DaycareDonationAmbassadorDocument = {
    name: string;
    linkSlug?: string;
    linkAliases?: string[];
    refCode: string;
    goal: number;
    active: boolean;
    ownerLabel?: string;
    notes?: string;
    createdAt?: Date;
    updatedAt?: Date;
};

export type DaycareDonationLeadDocument = {
    campaignSlug: string;
    donorName: string;
    phone?: string;
    ambassadorId?: unknown;
    targetAmount?: number;
    pledgedAmount?: number;
    contactMethod?: DaycareDonationContactMethod;
    status: DaycareDonationLeadStatus;
    lastContactAt?: Date;
    nextFollowUpAt?: Date;
    notes?: string;
    createdById?: string;
    createdByLabel?: string;
    createdAt?: Date;
    updatedAt?: Date;
};

export type DaycareDonationVisual = {
    src?: string;
    alt: string;
};

export type DaycareDonationFieldUpdateConfig = {
    id: string;
    title: string;
    description: string;
    itemId?: string;
    published: boolean;
    publishedAt?: Date;
    image: {
        src?: string;
        storageKey?: string;
        mimeType?: string;
        alt: string;
    };
    createdAt: Date;
    updatedAt: Date;
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
    recommendedChoiceIds: string[];
    categories: DaycareDonationCategoryConfig[];
    items: DaycareDonationItemConfig[];
    fieldUpdates: DaycareDonationFieldUpdateConfig[];
    createdAt?: Date;
    updatedAt?: Date;
};

export type DaycareDonationRecordDocument = {
    campaignSlug: string;
    source: DaycareDonationSource;
    status: DaycareDonationRecordStatus;
    amount: number;
    paymentType?: DaycareDonationPaymentType;
    installments?: number;
    itemId?: string;
    allocations?: Array<{
        itemId: string;
        amount: number;
    }>;
    donorName?: string;
    displayDonorName?: boolean;
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
    paymentType: DaycareDonationPaymentType;
    installments: number;
    itemId?: string;
    donorName: string;
    displayDonorName?: boolean;
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
        | "ambassador"
        | "fieldUpdate"
        | "lead";
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
