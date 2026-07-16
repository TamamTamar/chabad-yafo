export type DaycareHealthDeclarationStatus = "pendingReview" | "completed" | "requiresCorrection";
export type DaycareHealthSignerRole = "mother" | "father" | "guardian";
export type DaycareHealthSigningMethod = "online" | "uploadedFile";
import type { DaycareCorrectionDisposition } from "./daycareAgreement";

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

export interface DaycareHealthDeclarationSubmission {
    id: string;
    documentId: string;
    revision: number;
    formVersion: string;
    status: DaycareHealthDeclarationStatus;
    signingMethod: DaycareHealthSigningMethod;
    submittedAt: string;
    parentMessage?: string;
    correctionDisposition?: DaycareCorrectionDisposition;
    hasSignedPdf: boolean;
    payload?: DaycareHealthDeclarationPayload;
}

export type PublicDaycareHealthDeclaration =
    | { available: false; reason: "previousStepsIncomplete" }
    | { available: true; canSubmit: boolean; declaration: DaycareHealthDeclarationSubmission | null };
