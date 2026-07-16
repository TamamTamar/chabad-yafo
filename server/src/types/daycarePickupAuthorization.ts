import type { Types } from "mongoose";
import type { DaycareCorrectionDisposition, IEncryptedPrivateValue, IStoredPrivateFile } from "./daycareAgreement";

export type DaycarePickupAuthorizationStatus = "pendingReview" | "completed" | "requiresCorrection";
export type DaycarePickupSigningMethod = "online" | "uploadedFile";
export type DaycarePickupSignerRole = "mother" | "father" | "guardian";

export interface DaycarePickupGuardianSnapshot {
    fullName: string;
    role: string;
    roleDetails?: string;
    phone: string;
}

export interface DaycareAuthorizedCollector {
    fullName: string;
    relationship: string;
    phone: string;
    israeliId: string;
}

export interface DaycarePickupAuthorizationPayload {
    guardians: DaycarePickupGuardianSnapshot[];
    collectors: DaycareAuthorizedCollector[];
    informationConfirmed: true;
    signedBy: string;
    signerRole: DaycarePickupSignerRole;
}

export interface IDaycarePickupAuthorization {
    onboardingId: Types.ObjectId;
    documentId: string;
    revision: number;
    formVersion: string;
    status: DaycarePickupAuthorizationStatus;
    signingMethod: DaycarePickupSigningMethod;
    encryptedPayload?: IEncryptedPrivateValue;
    contentHash: string;
    signatureFile?: IStoredPrivateFile;
    signedPdfFile?: IStoredPrivateFile;
    submittedAt: Date;
    parentMessage?: string;
    correctionDisposition?: DaycareCorrectionDisposition;
    supersededAt?: Date;
    fileDiscardedAt?: Date;
    reviewedAt?: Date;
    reviewedBy?: string;
    createdAt: Date;
    updatedAt: Date;
}
