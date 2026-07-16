import type { Types } from "mongoose";
import type { DaycareParentDocumentBundle } from "../config/daycareParentDocuments";

export type DaycareAgreementVersionStatus = "draft" | "published" | "archived";
export type DaycareAgreementStatus = "notStarted" | "pendingReview" | "completed" | "requiresCorrection";
export type DaycareAgreementSigningMethod = "online" | "uploadedPdf" | "physicalDocument";
export type DaycareAgreementSignerRole = "mother" | "father" | "guardian";
export type DaycareCorrectionDisposition = "preserveVersion" | "discardFileAfterReplacement";
export type DaycareDocumentBlockType = "paragraph" | "bulletList" | "numberedList";

export interface IDaycareDocumentListItem { id: string; text: string; }
export interface IDaycareDocumentParagraphBlock { id: string; type: "paragraph"; text: string; }
export interface IDaycareDocumentListBlock { id: string; type: "bulletList" | "numberedList"; items: IDaycareDocumentListItem[]; }
export type IDaycareDocumentBlock = IDaycareDocumentParagraphBlock | IDaycareDocumentListBlock;
export interface IDaycareDocumentSection { id: string; title: string; blocks: IDaycareDocumentBlock[]; }
export interface IDaycareStructuredDocument {
    format: "structured-v1";
    title: string;
    subtitle?: string;
    intro: IDaycareDocumentBlock[];
    sections: IDaycareDocumentSection[];
}

export interface IEncryptedPrivateValue {
    algorithm: "aes-256-gcm";
    keyVersion: string;
    iv: string;
    authTag: string;
    ciphertext: string;
}

export type IDaycareAgreementContentSnapshot = IDaycareStructuredDocument;

export interface IDaycareAgreementVersion {
    documentKey: "daycareAgreement";
    version: string;
    schoolYear: string;
    format: "structured-v1";
    title: string;
    subtitle?: string;
    intro: IDaycareDocumentBlock[];
    sections: IDaycareDocumentSection[];
    contentHash: string;
    status: DaycareAgreementVersionStatus;
    effectiveFrom?: Date;
    publishedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface IStoredPrivateFile {
    provider: "railway" | "local";
    storageKey: string;
    originalName?: string;
    mimeType: string;
    size: number;
    sha256: string;
    createdAt: Date;
}

export interface IDaycareAgreement {
    onboardingId: Types.ObjectId;
    revision: number;
    versionId: Types.ObjectId;
    documentId?: string;
    documentKey?: "daycareAgreement";
    version?: string;
    contentHash?: string;
    contentSnapshot?: IDaycareAgreementContentSnapshot;
    parentDocumentsVersion?: string;
    parentDocumentsHash?: string;
    parentDocumentsSnapshot?: DaycareParentDocumentBundle;
    parentDocumentsAccepted?: boolean;
    status: DaycareAgreementStatus;
    signingMethod?: DaycareAgreementSigningMethod;
    signedBy?: string;
    signerRole?: DaycareAgreementSignerRole | string;
    signerRoleDetails?: string;
    signerIsraeliId?: IEncryptedPrivateValue;
    signerIsraeliIdFingerprint?: string;
    acceptedTerms?: boolean;
    acceptedStatement?: string;
    signedAt?: Date;
    ipAddress?: IEncryptedPrivateValue;
    userAgent?: string;
    signatureFile?: IStoredPrivateFile;
    signedPdfFile?: IStoredPrivateFile;
    parentMessage?: string;
    correctionDisposition?: DaycareCorrectionDisposition;
    supersededAt?: Date;
    fileDiscardedAt?: Date;
    reviewedAt?: Date;
    reviewedBy?: string;
    createdAt: Date;
    updatedAt: Date;
}
