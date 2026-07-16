import type { Types } from "mongoose";
import type { DaycareCorrectionDisposition, IEncryptedPrivateValue, IStoredPrivateFile } from "./daycareAgreement";

export type DaycareHealthDeclarationStatus = "pendingReview" | "completed" | "requiresCorrection";
export type DaycareHealthSignerRole = "mother" | "father" | "guardian";
export type DaycareHealthSigningMethod = "online" | "uploadedFile";

export interface DaycareHealthDeclarationPayload {
    healthCondition: string;
    medicationSensitivities: string;
    healthFund: string;
    hasAllergies: boolean;
    allergyDetails?: string;
    exposureInstructions?: string;
    informationConfirmed: true;
    allergyResponsibilityAccepted: true;
    signedBy: string;
    signerRole: DaycareHealthSignerRole;
}

export interface IDaycareHealthDeclaration {
    onboardingId: Types.ObjectId;
    documentId: string;
    revision: number;
    formVersion: string;
    status: DaycareHealthDeclarationStatus;
    signingMethod: DaycareHealthSigningMethod;
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
