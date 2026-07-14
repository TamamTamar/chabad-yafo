export type DaycareAgreementVersionStatus = "draft" | "published" | "archived";
export interface DaycareDocumentListItem { id: string; text: string; }
export type DaycareDocumentBlock = { id: string; type: "paragraph"; text: string } | { id: string; type: "bulletList" | "numberedList"; items: DaycareDocumentListItem[] };
export interface DaycareDocumentSection { id: string; title: string; blocks: DaycareDocumentBlock[]; }
export interface DaycareStructuredDocument { format: "structured-v1"; title: string; subtitle?: string; intro: DaycareDocumentBlock[]; sections: DaycareDocumentSection[]; }

export interface DaycareAgreementVersion extends DaycareStructuredDocument {
    id: string;
    version: string;
    schoolYear: string;
    contentHash: string;
    status: DaycareAgreementVersionStatus;
    publishedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface DaycareAgreementSubmission {
    id: string;
    status: "pendingReview" | "completed" | "requiresCorrection";
    signingMethod?: "online" | "uploadedPdf";
    signedBy?: string;
    signerRole?: string;
    signedAt?: string;
    documentId?: string;
    version?: string;
    parentMessage?: string;
    hasSignature: boolean;
    hasSignedPdf: boolean;
}

export type PublicDaycareAgreement =
    | {
          available: false;
          reason: "profileRequiresApproval" | "agreementNotPublished";
          signingAvailable: boolean;
      }
    | {
          available: true;
          signingAvailable: boolean;
          acceptanceStatement: string;
          version: Omit<DaycareAgreementVersion, "id" | "createdAt" | "updatedAt">;
          agreement: Omit<DaycareAgreementSubmission, "id"> | null;
      };

export interface AdminAgreementByOnboarding {
    agreement: DaycareAgreementSubmission | null;
    publishedVersion: DaycareAgreementVersion | null;
}
