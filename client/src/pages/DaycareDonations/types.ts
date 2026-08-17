export type DonationItemStatus = "open" | "almost" | "complete" | "closed";

export type DonationVisual = {
    src?: string;
    alt: string;
    placeholderLabel: string;
    caption?: string;
    tone: "blue" | "gold" | "sage" | "sand" | "sky";
};

export type DonationItem = {
    id: string;
    categoryId: string;
    title: string;
    description: string;
    goal: number;
    raised: number;
    remaining?: number;
    overflow?: number;
    order?: number;
    openingPriority?: number;
    acceptingDonations: boolean;
    statusOverride?: "auto" | "open" | "closed";
    visual: DonationVisual;
};

export type DonationCategory = {
    id: string;
    title: string;
    description: string;
    goal: number;
    raised?: number;
    remaining?: number;
    overflow?: number;
    order?: number;
    shortTitle?: string;
    visual: DonationVisual;
};

export type DaycareDonationCampaignData = {
    slug: string;
    title: string;
    goal: number;
    active: boolean;
    recommendedChoiceIds: string[];
    publicVisible: boolean;
    paymentsEnabled: boolean;
    raised: number;
    remaining?: number;
    overflow?: number;
    generalRaised: number;
    donationCount: number;
    recentDonations: PublicDaycareDonation[];
    categories: DonationCategory[];
    items: DonationItem[];
    fieldUpdates: DaycareDonationFieldUpdate[];
    updatedAt?: string;
};

export type DaycareDonationFieldUpdate = {
    id: string;
    title: string;
    description: string;
    itemId?: string;
    published: boolean;
    publishedAt?: string;
    imageUrl?: string;
    imageAlt: string;
    createdAt: string;
    updatedAt: string;
};

export type PublicDaycareDonation = {
    id: string;
    donorName: string;
    amount: number;
    dedication?: string;
    receivedAt: string;
};

export type DaycareDonationRecord = {
    _id: string;
    campaignSlug: string;
    source: "manual" | "nedarim";
    status: "confirmed" | "refunded" | "cancelled";
    amount: number;
    paymentType?: "HK" | "Ragil";
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
    manualSource?: "bank_transfer" | "cash" | "check" | "other";
    reference?: string;
    enteredById?: string;
    enteredByLabel?: string;
    providerIntentId?: string;
    externalTransactionId?: string;
    ambassadorId?: {
        _id: string;
        name: string;
        refCode: string;
        active: boolean;
    };
    receivedAt: string;
    createdAt: string;
    updatedAt: string;
};

export type DaycareDonationAmbassador = {
    _id: string;
    name: string;
    linkSlug?: string;
    linkAliases?: string[];
    refCode: string;
    goal: number;
    active: boolean;
    raised: number;
    donationCount: number;
    ownerLabel?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
};

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

export type DaycareDonationLead = {
    _id: string;
    campaignSlug: string;
    donorName: string;
    phone?: string;
    ambassadorId?: {
        _id: string;
        name: string;
        refCode: string;
        active: boolean;
    };
    targetAmount?: number;
    pledgedAmount?: number;
    contactMethod?: DaycareDonationContactMethod;
    status: DaycareDonationLeadStatus;
    lastContactAt?: string;
    nextFollowUpAt?: string;
    notes?: string;
    createdById?: string;
    createdByLabel?: string;
    createdAt: string;
    updatedAt: string;
};

export type DaycareDonationAudit = {
    _id: string;
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
    createdAt: string;
};

export type DaycareDonationDiagnostic = {
    _id: string;
    intentPublicId: string;
    status: string;
    fields: string[];
    values: Record<string, string>;
    receivedAt: string;
    expiresAt: string;
};

export type DaycareDonationDiagnostics = {
    enabled: boolean;
    paymentTestEnabled: boolean;
    diagnostics: DaycareDonationDiagnostic[];
};

export type FieldGalleryItem = {
    id: string;
    title: string;
    caption: string;
    visual: DonationVisual;
};

export type DonationSelection =
    | { kind: "general"; id: "general"; title: string }
    | { kind: "item"; id: string; title: string };
