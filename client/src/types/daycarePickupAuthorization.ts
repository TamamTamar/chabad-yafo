export type DaycarePickupAuthorizationStatus = "pendingReview" | "completed" | "requiresCorrection";
import type { DaycareCorrectionDisposition } from "./daycareAgreement";
export type DaycarePickupSigningMethod = "online" | "uploadedFile";
export type DaycarePickupSignerRole = "mother" | "father" | "guardian";
export interface DaycarePickupGuardian { fullName: string; role: string; roleDetails?: string; phone: string; }
export interface DaycareAuthorizedCollector { fullName: string; relationship: string; relationshipType?: "father" | "other"; phone: string; israeliId: string; }
export interface DaycarePickupAuthorizationPayload { guardians: DaycarePickupGuardian[]; collectors: DaycareAuthorizedCollector[]; informationConfirmed: true; signedBy: string; signerRole: DaycarePickupSignerRole; }
export interface DaycarePickupAuthorizationSubmission { id: string; documentId: string; revision: number; formVersion: string; status: DaycarePickupAuthorizationStatus; signingMethod: DaycarePickupSigningMethod; submittedAt: string; parentMessage?: string; correctionDisposition?: DaycareCorrectionDisposition; hasSignedPdf: boolean; payload?: DaycarePickupAuthorizationPayload; }
export type PublicDaycarePickupAuthorization = { available: false; reason: "previousStepsIncomplete" } | { available: true; canSubmit: boolean; guardians: DaycarePickupGuardian[]; declaration: DaycarePickupAuthorizationSubmission | null };
