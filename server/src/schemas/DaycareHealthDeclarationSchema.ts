import { Schema } from "mongoose";
import type { IDaycareHealthDeclaration } from "../types/daycareHealthDeclaration";

const encryptedValueSchema = new Schema({
    algorithm: { type: String, enum: ["aes-256-gcm"], required: true, immutable: true },
    keyVersion: { type: String, required: true, maxlength: 40, immutable: true },
    iv: { type: String, required: true, maxlength: 40, immutable: true },
    authTag: { type: String, required: true, maxlength: 64, immutable: true },
    ciphertext: { type: String, required: true, maxlength: 20000, immutable: true },
}, { _id: false });

const storedFileSchema = new Schema({
    provider: { type: String, enum: ["railway", "local"], required: true },
    storageKey: { type: String, required: true, immutable: true },
    originalName: { type: String, maxlength: 255 },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true, min: 1, max: 10 * 1024 * 1024 },
    sha256: { type: String, required: true, match: /^[a-f0-9]{64}$/ },
    createdAt: { type: Date, required: true },
}, { _id: false });

export const daycareHealthDeclarationSchema = new Schema<IDaycareHealthDeclaration>({
    onboardingId: { type: Schema.Types.ObjectId, ref: "DaycareOnboarding", required: true, immutable: true, index: true },
    documentId: { type: String, required: true, unique: true, maxlength: 80, immutable: true },
    revision: { type: Number, required: true, min: 1, immutable: true },
    formVersion: { type: String, required: true, maxlength: 40, immutable: true },
    status: { type: String, enum: ["pendingReview", "completed", "requiresCorrection"], required: true, index: true },
    signingMethod: { type: String, enum: ["online", "uploadedFile"], required: true, default: "online", immutable: true },
    encryptedPayload: { type: encryptedValueSchema, select: false },
    contentHash: { type: String, required: true, match: /^[a-f0-9]{64}$/, immutable: true },
    signatureFile: storedFileSchema,
    signedPdfFile: storedFileSchema,
    submittedAt: { type: Date, required: true, immutable: true },
    parentMessage: { type: String, trim: true, maxlength: 1000 },
    correctionDisposition: { type: String, enum: ["preserveVersion", "discardFileAfterReplacement"] },
    supersededAt: Date,
    fileDiscardedAt: Date,
    reviewedAt: Date,
    reviewedBy: { type: String, maxlength: 120 },
}, { timestamps: true });

daycareHealthDeclarationSchema.index({ onboardingId: 1, revision: 1 }, { unique: true });
