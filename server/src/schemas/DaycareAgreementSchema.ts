import { Schema } from "mongoose";
import type { IDaycareAgreement, IEncryptedPrivateValue, IStoredPrivateFile } from "../types/daycareAgreement";

const storedFileSchema = new Schema<IStoredPrivateFile>({
    provider: { type: String, enum: ["railway", "local"], required: true },
    storageKey: { type: String, required: true, immutable: true },
    originalName: { type: String, maxlength: 255 },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true, min: 1, max: 10 * 1024 * 1024 },
    sha256: { type: String, required: true, match: /^[a-f0-9]{64}$/ },
    createdAt: { type: Date, required: true },
}, { _id: false });

const encryptedPrivateValueSchema = new Schema<IEncryptedPrivateValue>({
    algorithm: { type: String, enum: ["aes-256-gcm"], required: true, immutable: true },
    keyVersion: { type: String, required: true, maxlength: 40, immutable: true },
    iv: { type: String, required: true, maxlength: 40, immutable: true },
    authTag: { type: String, required: true, maxlength: 64, immutable: true },
    ciphertext: { type: String, required: true, maxlength: 2048, immutable: true },
}, { _id: false });

const snapshotListItemSchema = new Schema({ id: String, text: String }, { _id: false });
const snapshotBlockSchema = new Schema({ id: String, type: { type: String, enum: ["paragraph", "bulletList", "numberedList"] }, text: String, items: [snapshotListItemSchema] }, { _id: false });
const snapshotSectionSchema = new Schema({ id: String, title: String, blocks: [snapshotBlockSchema] }, { _id: false });
const contentSnapshotSchema = new Schema({
    format: { type: String, enum: ["structured-v1"], required: true, immutable: true },
    title: { type: String, required: true, maxlength: 240, immutable: true },
    subtitle: String,
    intro: [snapshotBlockSchema],
    sections: [snapshotSectionSchema],
}, { _id: false });

export const daycareAgreementSchema = new Schema<IDaycareAgreement>({
    onboardingId: { type: Schema.Types.ObjectId, ref: "DaycareOnboarding", required: true, unique: true, immutable: true },
    versionId: { type: Schema.Types.ObjectId, ref: "DaycareAgreementVersion", required: true, immutable: true },
    documentId: { type: String, maxlength: 80, unique: true, sparse: true, immutable: true },
    documentKey: { type: String, enum: ["daycareAgreement"], immutable: true },
    version: { type: String, maxlength: 60, immutable: true },
    contentHash: { type: String, match: /^[a-f0-9]{64}$/, immutable: true },
    contentSnapshot: { type: contentSnapshotSchema, select: false },
    status: { type: String, enum: ["notStarted", "pendingReview", "completed", "requiresCorrection"], default: "notStarted", index: true },
    signingMethod: { type: String, enum: ["online", "uploadedPdf", "physicalDocument"] },
    signedBy: { type: String, trim: true, maxlength: 160 },
    signerRole: { type: String, trim: true, maxlength: 80 },
    signerRoleDetails: { type: String, trim: true, maxlength: 100 },
    signerIsraeliId: { type: encryptedPrivateValueSchema, select: false },
    signerIsraeliIdFingerprint: { type: String, match: /^[a-f0-9]{64}$/, select: false, immutable: true },
    acceptedTerms: Boolean,
    acceptedStatement: { type: String, maxlength: 2000, immutable: true },
    signedAt: Date,
    ipAddress: { type: encryptedPrivateValueSchema, select: false },
    userAgent: { type: String, maxlength: 512, immutable: true },
    signatureFile: storedFileSchema,
    signedPdfFile: storedFileSchema,
    parentMessage: { type: String, trim: true, maxlength: 1000 },
    reviewedAt: Date,
    reviewedBy: { type: String, maxlength: 120 },
}, { timestamps: true });
