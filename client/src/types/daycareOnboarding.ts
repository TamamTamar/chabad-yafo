export const onboardingStepStatuses = [
    "notStarted",
    "inProgress",
    "pendingReview",
    "completed",
    "requiresCorrection",
    "notRequired",
] as const;

export type OnboardingStepStatus = (typeof onboardingStepStatuses)[number];

export const onboardingStepSources = [
    "online",
    "admin",
    "uploadedFile",
    "physicalDocument",
    "automatic",
] as const;

export type OnboardingStepSource = (typeof onboardingStepSources)[number];

export const onboardingOverallStatuses = [
    "new",
    "inProgress",
    "waitingForParent",
    "waitingForAdmin",
    "completed",
    "cancelled",
] as const;

export type OnboardingOverallStatus =
    (typeof onboardingOverallStatuses)[number];

export const onboardingActionTypes = [
    "openForm",
    "openAgreement",
    "uploadFile",
    "downloadPdf",
    "externalLink",
    "noAction",
] as const;

export type OnboardingActionType = (typeof onboardingActionTypes)[number];

export const onboardingResponsibleParties = [
    "parent",
    "admin",
    "both",
    "automatic",
] as const;

export type OnboardingResponsibleParty =
    (typeof onboardingResponsibleParties)[number];

export type OnboardingOriginType =
    | "daycareRegistration"
    | "daycareLead"
    | "daycareEnrollment"
    | "manual";

export type OnboardingOrigin = {
    type: OnboardingOriginType;
    recordId?: string;
};

export const legacyOnboardingStepKeys = [
    "initialRegistrationReceived",
    "introCall",
    "familyDetails",
    "agreement",
    "healthDeclaration",
    "parentPermissions",
    "firstPayment",
    "groupPlacement",
    "adaptationDay",
    "finalApproval",
] as const;

export const onboardingStepKeys = [
    "onboardingOpened",
    "childAndGuardianDetails",
    "agreementSigned",
    "registrationFeeReceived",
    "healthDeclarationSubmitted",
    "pickupAuthorizationSubmitted",
    "parentPermissionsSubmitted",
    "groupAssigned",
    "adjustmentDayScheduled",
    "registrationApproved",
] as const;

export type OnboardingStepKey =
    | (typeof onboardingStepKeys)[number]
    | (typeof legacyOnboardingStepKeys)[number];

export type OnboardingProgress = {
    completedSteps: number;
    totalSteps: number;
    percentage: number;
};

export type OnboardingRelatedRecord = {
    type?: string;
    recordId?: string;
    formKey?: string;
    documentKey?: string;
};

export type PublicOnboardingStep = {
    key: OnboardingStepKey;
    title: string;
    description?: string;
    status: OnboardingStepStatus;
    completedAt?: string;
    updatedAt: string;
    parentMessage?: string;
    order: number;
};

export type PublicDaycareOnboarding = {
    childName: string;
    schoolYear: string;
    profileStatus: "incomplete" | "complete";
    overallStatus: OnboardingOverallStatus;
    progress: OnboardingProgress;
    parentSubmission: {
        submittedAt?: string;
        isSubmitted: boolean;
        canSubmit: boolean;
    };
    missingStepTitle?: string;
    canEditProfile: boolean;
    profilePrefill?: {
        guardianFullName?: string;
        guardianPhone?: string;
    };
    profile?: DaycareIdentityProfile;
    steps: PublicOnboardingStep[];
};

export type DaycareGuardianSummary = {
    fullName: string;
    role: string;
    roleDetails?: string;
    phone: string;
    email?: string;
};

export type DaycareFamilyAddress = {
    city: string;
    street: string;
    houseNumber: string;
    apartment?: string;
};

export type DaycareIdentityProfile = {
    child: {
        firstName: string;
        lastName: string;
        birthDate: string;
    };
    guardians: DaycareGuardianSummary[];
    address: DaycareFamilyAddress;
};

export type SubmitDaycareIdentityProfilePayload = DaycareIdentityProfile;

export type AdminOnboardingStep = {
    key: OnboardingStepKey;
    title: string;
    description?: string;
    status: OnboardingStepStatus;
    source?: OnboardingStepSource;
    responsibleParty: OnboardingResponsibleParty;
    actionType: OnboardingActionType;
    actionUrl?: string;
    isAvailable: boolean;
    requiresAdminApproval: boolean;
    isVisibleToParent: boolean;
    order: number;
    completedAt?: string;
    updatedAt: string;
    updatedBy?: string;
    internalNote?: string;
    parentMessage?: string;
    relatedRecord?: OnboardingRelatedRecord;
};

export type AdminDaycareOnboardingListItem = {
    id: string;
    legacyEnrollmentId?: string;
    origin?: OnboardingOrigin;
    familyId?: string;
    childId?: string;
    schoolYear: string;
    profileStatus: "incomplete" | "complete";
    childName: string;
    guardians: DaycareGuardianSummary[];
    overallStatus: OnboardingOverallStatus;
    parentSubmittedAt?: string;
    parentSubmissionComplete: boolean;
    progress: OnboardingProgress;
    missingStepTitle?: string;
    hasPendingReview: boolean;
    parentAccessEnabled: boolean;
    updatedAt?: string;
};

export type AdminDaycareOnboarding = {
    id: string;
    familyId?: string;
    childId?: string;
    legacyEnrollmentId?: string;
    origin?: OnboardingOrigin;
    schoolYear: string;
    profileStatus: "incomplete" | "complete";
    internalNote?: string;
    child: {
        firstName?: string;
        lastName?: string;
        birthDate?: string;
    };
    guardians: DaycareGuardianSummary[];
    address?: DaycareFamilyAddress;
    overallStatus: OnboardingOverallStatus;
    parentSubmittedAt?: string;
    parentSubmissionComplete: boolean;
    calculatedOverallStatus: OnboardingOverallStatus;
    overallStatusOverride?: OnboardingOverallStatus | null;
    steps: AdminOnboardingStep[];
    progress: OnboardingProgress;
    access: {
        enabled: boolean;
        createdAt: string;
        expiresAt?: string;
        lastAccessAt?: string;
    };
    createdAt?: string;
    updatedAt?: string;
};

export type UpdateAdminOnboardingStepPayload = Partial<{
    status: OnboardingStepStatus;
    source: OnboardingStepSource;
    responsibleParty: OnboardingResponsibleParty;
    isVisibleToParent: boolean;
    completedAt: string | null;
    internalNote: string;
    parentMessage: string;
}>;

export type ImportLegacyOnboardingPayload = {
    schoolYear: string;
    existingFamilyId?: string;
};

export type CreateOnboardingFromInquiryPayload = {
    schoolYear: string;
    internalNote?: string;
};

export type AdminOnboardingLinkResponse = {
    success: boolean;
    data: AdminDaycareOnboarding;
    parentAccessUrl?: string;
};

export type AdminDaycareFamilyOption = {
    id: string;
    guardians: DaycareGuardianSummary[];
    childNames: string[];
    children: Array<{
        id: string;
        firstName: string;
        lastName: string;
        birthDate?: string;
    }>;
    updatedAt: string;
};

export type OnboardingAuditActorType = "admin" | "automatic" | "parent";

export type AdminOnboardingAuditEntry = {
    id: string;
    actorType: OnboardingAuditActorType;
    actorId?: string;
    actorLabel?: string;
    action: string;
    stepKey?: string;
    previousValue?: unknown;
    newValue?: unknown;
    createdAt: string;
};

export const onboardingStepStatusLabels: Record<
    OnboardingStepStatus,
    string
> = {
    notStarted: "טרם התחיל",
    inProgress: "בתהליך",
    pendingReview: "ממתין לבדיקה",
    completed: "הושלם",
    requiresCorrection: "דורש תיקון",
    notRequired: "לא נדרש",
};

export const onboardingStepSourceLabels: Record<
    OnboardingStepSource,
    string
> = {
    online: "מולא באתר",
    admin: "עודכן על ידי צוות המעון",
    uploadedFile: "קובץ שהועלה",
    physicalDocument: "מסמך שנמסר פיזית",
    automatic: "עודכן אוטומטית",
};

export const onboardingResponsiblePartyLabels: Record<
    OnboardingResponsibleParty,
    string
> = {
    parent: "באחריות ההורה",
    admin: "באחריות צוות המעון",
    both: "באחריות משותפת",
    automatic: "מתעדכן אוטומטית",
};

export const onboardingOverallStatusLabels: Record<
    OnboardingOverallStatus,
    string
> = {
    new: "חדש",
    inProgress: "בתהליך",
    waitingForParent: "ממתין להורה",
    waitingForAdmin: "ממתין לצוות המעון",
    completed: "ההרשמה הושלמה",
    cancelled: "ההרשמה בוטלה",
};

export const onboardingAuditActionLabels: Record<string, string> = {
    familyCreated: "נוצרה משפחה",
    childCreated: "נוצרה רשומת ילד",
    identityProfileSubmitted: "פרטי הילד וההורים נשמרו",
    identityProfileUpdated: "פרטי הילד וההורים עודכנו",
    parentBundleSubmitted: "התיק נשלח לצוות המעון לבדיקה",
    onboardingCreated: "נוצר תיק הצטרפות",
    legacyImported: "בוצע ייבוא מרשומת Legacy",
    registrationSourceLinked: "התיק קושר לרשומת רישום",
    manualOnboardingCreated: "התיק נוצר ידנית באדמין",
    stepStatusChanged: "סטטוס שלב השתנה",
    stepSourceChanged: "מקור העדכון השתנה",
    responsiblePartyChanged: "האחריות על השלב השתנתה",
    internalNoteChanged: "הערה פנימית השתנתה",
    parentMessageChanged: "הודעה להורה השתנתה",
    stepVisibilityChanged: "נראות השלב השתנתה",
    completedAtChanged: "תאריך השלמת השלב השתנה",
    parentLinkCreated: "נוצר קישור אישי",
    parentLinkRevoked: "הקישור האישי בוטל",
    parentLinkRegenerated: "נוצר קישור אישי חדש",
    overallStatusOverrideChanged: "הסטטוס הכללי הידני השתנה",
    agreementSignedOnline: "הסכם נחתם באופן מקוון",
    agreementPdfUploaded: "הועלה הסכם חתום כ־PDF",
    agreementReviewed: "הסכם נבדק על ידי צוות המעון",
};
