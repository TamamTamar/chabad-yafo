import type { Types } from "mongoose";

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

export const onboardingOriginTypes = [
    "daycareRegistration",
    "daycareLead",
    "daycareEnrollment",
    "manual",
] as const;

export type OnboardingOriginType = (typeof onboardingOriginTypes)[number];

export interface IDaycareOnboardingOrigin {
    type: OnboardingOriginType;
    recordId?: Types.ObjectId;
}

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

export interface IOnboardingRelatedRecord {
    type?: string;
    recordId?: Types.ObjectId;
    formKey?: string;
    documentKey?: string;
}

export interface IOnboardingStep {
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
    completedAt?: Date;
    updatedAt: Date;
    updatedBy?: string;
    internalNote?: string;
    parentMessage?: string;
    relatedRecord?: IOnboardingRelatedRecord;
}

export interface IDaycareOnboarding {
    familyId?: Types.ObjectId;
    childId?: Types.ObjectId;
    schoolYear: string;
    origin?: IDaycareOnboardingOrigin;
    temporaryParentName?: string;
    temporaryParentPhone?: string;
    temporaryChildAge?: string;
    profileStatus: "incomplete" | "complete";
    internalNote?: string;
    overallStatus: OnboardingOverallStatus;
    overallStatusOverride?: OnboardingOverallStatus;
    parentSubmissionRequired?: boolean;
    parentSubmittedAt?: Date;
    steps: IOnboardingStep[];
    parentAccessTokenHash: string;
    parentAccessTokenCreatedAt: Date;
    parentAccessTokenExpiresAt?: Date;
    parentAccessEnabled: boolean;
    lastParentAccessAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface OnboardingProgress {
    completedSteps: number;
    totalSteps: number;
    percentage: number;
}

export interface PublicOnboardingStep {
    key: OnboardingStepKey;
    title: string;
    description?: string;
    status: OnboardingStepStatus;
    order: number;
    completedAt?: Date;
    updatedAt: Date;
    parentMessage?: string;
}

export interface DaycareGuardianProfileDto {
    fullName: string;
    role: string;
    roleDetails?: string;
    phone: string;
    email?: string;
}

export interface DaycareFamilyAddressDto {
    city: string;
    street: string;
    houseNumber: string;
    apartment?: string;
}

export interface DaycareIdentityProfileDto {
    child: {
        firstName: string;
        lastName: string;
        birthDate: Date;
    };
    guardians: DaycareGuardianProfileDto[];
    address: DaycareFamilyAddressDto;
}

export interface SubmitPublicDaycareProfileDto {
    child: {
        firstName: string;
        lastName: string;
        birthDate: Date;
    };
    guardians: DaycareGuardianProfileDto[];
    address: DaycareFamilyAddressDto;
}

export interface PublicDaycareOnboardingDto {
    childName: string;
    schoolYear: string;
    profileStatus: "incomplete" | "complete";
    overallStatus: OnboardingOverallStatus;
    progress: OnboardingProgress;
    parentSubmission: {
        submittedAt?: Date;
        isSubmitted: boolean;
        canSubmit: boolean;
    };
    missingStepTitle?: string;
    canEditProfile: boolean;
    profilePrefill?: {
        guardianFullName?: string;
        guardianPhone?: string;
    };
    profile?: DaycareIdentityProfileDto;
    steps: PublicOnboardingStep[];
}

export interface AdminOnboardingListItemDto {
    id: string;
    legacyEnrollmentId?: string;
    origin?: {
        type: OnboardingOriginType;
        recordId?: string;
    };
    familyId?: string;
    childId?: string;
    profileStatus: "incomplete" | "complete";
    schoolYear: string;
    childName: string;
    guardians: Array<{
        fullName: string;
        role: string;
        roleDetails?: string;
        phone: string;
        email?: string;
    }>;
    address?: DaycareFamilyAddressDto;
    overallStatus: OnboardingOverallStatus;
    parentSubmittedAt?: Date;
    parentSubmissionComplete: boolean;
    progress: OnboardingProgress;
    missingStepTitle?: string;
    hasPendingReview: boolean;
    parentAccessEnabled: boolean;
    updatedAt?: Date;
}

export interface AdminOnboardingDetailDto {
    id: string;
    familyId?: string;
    childId?: string;
    profileStatus: "incomplete" | "complete";
    internalNote?: string;
    legacyEnrollmentId?: string;
    origin?: {
        type: OnboardingOriginType;
        recordId?: string;
    };
    schoolYear: string;
    child: {
        firstName?: string;
        lastName?: string;
        birthDate?: Date;
    };
    guardians: Array<{
        fullName: string;
        role: string;
        roleDetails?: string;
        phone: string;
        email?: string;
    }>;
    address?: DaycareFamilyAddressDto;
    overallStatus: OnboardingOverallStatus;
    parentSubmittedAt?: Date;
    parentSubmissionComplete: boolean;
    calculatedOverallStatus: OnboardingOverallStatus;
    overallStatusOverride?: OnboardingOverallStatus;
    steps: IOnboardingStep[];
    progress: OnboardingProgress;
    access: {
        enabled: boolean;
        createdAt: Date;
        expiresAt?: Date;
        lastAccessAt?: Date;
    };
    createdAt?: Date;
    updatedAt?: Date;
}

export interface AdminOnboardingStepPatchDto {
    status?: OnboardingStepStatus;
    source?: OnboardingStepSource;
    responsibleParty?: OnboardingResponsibleParty;
    isVisibleToParent?: boolean;
    completedAt?: Date | null;
    internalNote?: string | null;
    parentMessage?: string | null;
}
