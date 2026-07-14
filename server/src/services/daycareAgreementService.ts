import { createHash, randomUUID } from "node:crypto";
import { Types } from "mongoose";
import { DaycareAgreement } from "../models/DaycareAgreement";
import { DaycareAgreementVersion } from "../models/DaycareAgreementVersion";
import { DaycareOnboarding } from "../models/DaycareOnboarding";
import { DAYCARE_ONBOARDING_AUDIT_ACTIONS } from "../config/daycareOnboardingAuditActions";
import { createAuditEntries, getPublicOnboardingDocumentByToken, calculateOverallStatus, DaycareOnboardingServiceError, updateAdminOnboardingStep } from "./daycareOnboardingService";
import { getDaycareStorageProvider, isDaycareStorageConfigured } from "./daycareStorageService";
import { createAgreementPdf, createSignedAgreementPdf } from "./daycareAgreementPdfService";
import {
    encryptDaycarePrivateValue,
    fingerprintDaycareIsraeliId,
    isDaycarePiiEncryptionConfigured,
    isValidIsraeliId,
    normalizeIsraeliId,
} from "./daycarePiiEncryptionService";
import type { DaycareAgreementSignerRole, IDaycareStructuredDocument } from "../types/daycareAgreement";
import {
    DAYCARE_AGREEMENT_DRAFT_2026,
    DAYCARE_AGREEMENT_DRAFT_2026_SCHOOL_YEAR,
    DAYCARE_AGREEMENT_DRAFT_2026_VERSION,
} from "../config/daycareAgreementDraft2026";

export const ONLINE_AGREEMENT_ACCEPTANCE_STATEMENT = "קראתי את הסכם ההתקשרות במלואו, הבנתי את תוכנו, ניתנה לי אפשרות לשאול שאלות ולקבל הבהרות, ואני מסכים/ה לכל תנאיו. ידוע לי כי הזנת פרטיי, סימון תיבה זו ולחיצה על 'אישור וחתימה על ההסכם' מהווים את אישורי והסכמתי להתקשר בהסכם.";

const canonicalDocument = (document: IDaycareStructuredDocument) => JSON.stringify(document);
export const hashAgreementContent = (document: IDaycareStructuredDocument) =>
    createHash("sha256").update(canonicalDocument(document), "utf8").digest("hex");

export const hashSignedAgreementSnapshot = (input: { documentKey: "daycareAgreement"; version: string; schoolYear: string; document: IDaycareStructuredDocument }) =>
    createHash("sha256").update(JSON.stringify({
        documentKey: input.documentKey,
        version: input.version.trim(),
        schoolYear: input.schoolYear.trim(),
        document: input.document,
    }), "utf8").digest("hex");

const structuredDocumentFromVersion = (version: InstanceType<typeof DaycareAgreementVersion>): IDaycareStructuredDocument => ({
    format: "structured-v1",
    title: version.title,
    subtitle: version.subtitle,
    intro: version.toObject().intro,
    sections: version.toObject().sections,
});

const versionDto = (version: InstanceType<typeof DaycareAgreementVersion>) => ({
    id: version.id,
    version: version.version,
    schoolYear: version.schoolYear,
    format: version.format,
    title: version.title,
    subtitle: version.subtitle,
    intro: version.intro,
    sections: version.sections,
    contentHash: version.contentHash,
    status: version.status,
    effectiveFrom: version.effectiveFrom,
    publishedAt: version.publishedAt,
    createdAt: version.createdAt,
    updatedAt: version.updatedAt,
});

const publicVersionDto = (version: InstanceType<typeof DaycareAgreementVersion>) => ({
    version: version.version,
    schoolYear: version.schoolYear,
    format: version.format,
    title: version.title,
    subtitle: version.subtitle,
    intro: version.intro,
    sections: version.sections,
    contentHash: version.contentHash,
    status: version.status,
    publishedAt: version.publishedAt,
});

export const buildDefaultAgreementDraft = () => ({
    documentKey: "daycareAgreement" as const,
    version: DAYCARE_AGREEMENT_DRAFT_2026_VERSION,
    schoolYear: DAYCARE_AGREEMENT_DRAFT_2026_SCHOOL_YEAR,
    ...DAYCARE_AGREEMENT_DRAFT_2026,
    contentHash: hashAgreementContent(DAYCARE_AGREEMENT_DRAFT_2026),
    status: "draft" as const,
});

export const ensureDefaultAgreementDraft = async () => {
    const seed = buildDefaultAgreementDraft();
    const existingSchoolYearAgreement = await DaycareAgreementVersion.exists({
        documentKey: seed.documentKey,
        schoolYear: seed.schoolYear,
    });
    if (existingSchoolYearAgreement) return false;

    const hasStructuredVersion = await DaycareAgreementVersion.exists({ documentKey: "daycareAgreement", format: "structured-v1" });
    if (!hasStructuredVersion) {
        // The structured-v1 rollout was approved before any real signatures existed.
        // Refuse destructive cleanup if that assumption is ever no longer true.
        if (await DaycareAgreement.exists({ signedAt: { $exists: true } })) {
            throw new Error("Cannot replace legacy agreement versions after signatures exist");
        }
        await DaycareAgreementVersion.deleteMany({ documentKey: "daycareAgreement", format: { $ne: "structured-v1" } });
    }

    const result = await DaycareAgreementVersion.updateOne(
        {
            documentKey: seed.documentKey,
            schoolYear: seed.schoolYear,
        },
        { $setOnInsert: seed },
        { upsert: true }
    );
    return result.upsertedCount === 1;
};

export const listAgreementVersions = async () => {
    await ensureDefaultAgreementDraft();
    return (await DaycareAgreementVersion.find().sort({ schoolYear: -1, createdAt: -1 })).map(versionDto);
};

export const createAgreementDraft = async (input: { version: string; schoolYear: string; document: IDaycareStructuredDocument }) => {
    const existing = await DaycareAgreementVersion.exists({ documentKey: "daycareAgreement", schoolYear: input.schoolYear });
    if (existing) throw new DaycareOnboardingServiceError("An agreement already exists for this school year", 409, "AGREEMENT_SCHOOL_YEAR_EXISTS");
    try {
        const version = await DaycareAgreementVersion.create({
            documentKey: "daycareAgreement",
            version: input.version,
            schoolYear: input.schoolYear,
            ...input.document,
            contentHash: hashAgreementContent(input.document),
            status: "draft",
        });
        return versionDto(version);
    } catch (error) {
        if ((error as { code?: number }).code === 11000) {
            throw new DaycareOnboardingServiceError("An agreement already exists for this school year", 409, "AGREEMENT_SCHOOL_YEAR_EXISTS");
        }
        throw error;
    }
};

export const updateAgreementDraft = async (id: string, document: IDaycareStructuredDocument) => {
    if (!Types.ObjectId.isValid(id)) throw new DaycareOnboardingServiceError("Agreement version not found", 404, "AGREEMENT_VERSION_NOT_FOUND");
    const version = await DaycareAgreementVersion.findById(id);
    if (!version) throw new DaycareOnboardingServiceError("Agreement version not found", 404, "AGREEMENT_VERSION_NOT_FOUND");
    if (version.status !== "draft") throw new DaycareOnboardingServiceError("Published versions cannot be changed", 409, "AGREEMENT_VERSION_IMMUTABLE");
    version.title = document.title;
    version.subtitle = document.subtitle;
    version.intro = document.intro;
    version.sections = document.sections;
    version.contentHash = hashAgreementContent(document);
    await version.save();
    return versionDto(version);
};

export const publishAgreementDraft = async (id: string, legalReviewConfirmed: boolean, now = new Date()) => {
    if (!legalReviewConfirmed) throw new DaycareOnboardingServiceError("Legal review confirmation is required", 400, "LEGAL_REVIEW_REQUIRED");
    if (!Types.ObjectId.isValid(id)) throw new DaycareOnboardingServiceError("Agreement version not found", 404, "AGREEMENT_VERSION_NOT_FOUND");
    const version = await DaycareAgreementVersion.findById(id);
    if (!version) throw new DaycareOnboardingServiceError("Agreement version not found", 404, "AGREEMENT_VERSION_NOT_FOUND");
    if (version.status !== "draft") throw new DaycareOnboardingServiceError("Only draft versions can be published", 409, "AGREEMENT_VERSION_IMMUTABLE");
    version.status = "published";
    version.publishedAt = now;
    await version.save();
    return versionDto(version);
};

const agreementDto = (agreement: InstanceType<typeof DaycareAgreement> | null) => agreement ? ({
    id: agreement.id,
    status: agreement.status,
    signingMethod: agreement.signingMethod,
    signedBy: agreement.signedBy,
    signerRole: agreement.signerRole,
    signedAt: agreement.signedAt,
    documentId: agreement.documentId,
    version: agreement.version,
    parentMessage: agreement.parentMessage,
    hasSignature: Boolean(agreement.signatureFile),
    hasSignedPdf: Boolean(agreement.signedPdfFile),
}) : null;

const publicAgreementDto = (agreement: InstanceType<typeof DaycareAgreement> | null) => agreement ? ({
    status: agreement.status,
    signingMethod: agreement.signingMethod,
    signedBy: agreement.signedBy,
    signerRole: agreement.signerRole,
    signedAt: agreement.signedAt,
    documentId: agreement.documentId,
    version: agreement.version,
    parentMessage: agreement.parentMessage,
    hasSignature: Boolean(agreement.signatureFile),
    hasSignedPdf: Boolean(agreement.signedPdfFile),
}) : null;

export const getAgreementByOnboardingForAdmin = async (onboardingId: string) => {
    if (!Types.ObjectId.isValid(onboardingId)) {
        throw new DaycareOnboardingServiceError("Onboarding not found", 404, "ONBOARDING_NOT_FOUND");
    }
    const onboarding = await DaycareOnboarding.findById(onboardingId).select("schoolYear");
    if (!onboarding) {
        throw new DaycareOnboardingServiceError("Onboarding not found", 404, "ONBOARDING_NOT_FOUND");
    }
    const [agreement, publishedVersion] = await Promise.all([
        DaycareAgreement.findOne({ onboardingId }),
        DaycareAgreementVersion.findOne({
            documentKey: "daycareAgreement",
            schoolYear: onboarding.schoolYear,
            status: "published",
        }),
    ]);
    return {
        agreement: agreementDto(agreement),
        publishedVersion: publishedVersion ? versionDto(publishedVersion) : null,
    };
};

export const getPublicAgreement = async (token: string, now = new Date()) => {
    const onboarding = await getPublicOnboardingDocumentByToken(token, now);
    const profileStep = onboarding.steps.find(step => step.key === "childAndGuardianDetails");
    const agreementStep = onboarding.steps.find(step => step.key === "agreementSigned");
    if (!profileStep || profileStep.status !== "completed" || !agreementStep?.isVisibleToParent) {
        return { available: false, reason: "profileRequiresApproval", signingAvailable: isDaycareStorageConfigured() && isDaycarePiiEncryptionConfigured() };
    }
    const version = await DaycareAgreementVersion.findOne({ documentKey: "daycareAgreement", schoolYear: onboarding.schoolYear, status: "published" });
    if (!version) return { available: false, reason: "agreementNotPublished", signingAvailable: isDaycareStorageConfigured() && isDaycarePiiEncryptionConfigured() };
    const agreement = await DaycareAgreement.findOne({ onboardingId: onboarding._id });
    return { available: true, signingAvailable: isDaycareStorageConfigured() && isDaycarePiiEncryptionConfigured(), acceptanceStatement: ONLINE_AGREEMENT_ACCEPTANCE_STATEMENT, version: publicVersionDto(version), agreement: publicAgreementDto(agreement) };
};

const getSignableContext = async (token: string, now: Date) => {
    const onboarding = await getPublicOnboardingDocumentByToken(token, now);
    const profileStep = onboarding.steps.find(step => step.key === "childAndGuardianDetails");
    const stepIndex = onboarding.steps.findIndex(step => step.key === "agreementSigned");
    if (profileStep?.status !== "completed" || stepIndex < 0) throw new DaycareOnboardingServiceError("Agreement is not available", 409, "AGREEMENT_NOT_AVAILABLE");
    const version = await DaycareAgreementVersion.findOne({ documentKey: "daycareAgreement", schoolYear: onboarding.schoolYear, status: "published" });
    if (!version) throw new DaycareOnboardingServiceError("Agreement is not published", 409, "AGREEMENT_NOT_AVAILABLE");
    return { onboarding, version, stepIndex };
};

export const downloadAgreementPdfForParent = async (token: string, now = new Date()) => {
    const { version } = await getSignableContext(token, now);
    const bytes = await createAgreementPdf({
        version: version.version,
        schoolYear: version.schoolYear,
        contentSnapshot: structuredDocumentFromVersion(version),
    });
    return {
        bytes,
        mimeType: "application/pdf",
        filename: `daycare-agreement-${version.schoolYear}-${version.version}.pdf`,
    };
};

const markPendingReview = async (onboarding: InstanceType<typeof DaycareOnboarding>, stepIndex: number, agreementId: Types.ObjectId, source: "online" | "uploadedFile", action: "agreementSignedOnline" | "agreementPdfUploaded", now: Date) => {
    const previousStatus = onboarding.steps[stepIndex].status;
    onboarding.steps[stepIndex].status = "pendingReview";
    onboarding.steps[stepIndex].source = source;
    onboarding.steps[stepIndex].updatedAt = now;
    onboarding.steps[stepIndex].updatedBy = "parent";
    onboarding.steps[stepIndex].relatedRecord = { type: "daycareAgreement", recordId: agreementId, documentKey: "daycareAgreement" };
    onboarding.markModified("steps");
    onboarding.overallStatus = calculateOverallStatus(onboarding.steps);
    await onboarding.save();
    await createAuditEntries([
        { onboardingId: onboarding._id, actorType: "parent", actorLabel: "parent-link", action: DAYCARE_ONBOARDING_AUDIT_ACTIONS.stepStatusChanged, stepKey: "agreementSigned", previousValue: previousStatus, newValue: "pendingReview", createdAt: now },
        { onboardingId: onboarding._id, actorType: "parent", actorLabel: "parent-link", action, stepKey: "agreementSigned", newValue: { agreementId, source }, createdAt: now },
    ]);
};

export const submitOnlineAgreement = async (token: string, input: { signedBy: string; signerRole: string; signerIsraeliId: string; acceptedTerms: boolean; ipAddress: string; userAgent: string; signature: Express.Multer.File }, now = new Date()) => {
    const signedBy = input.signedBy.trim();
    const signerRole = input.signerRole as DaycareAgreementSignerRole;
    const signerIsraeliId = normalizeIsraeliId(input.signerIsraeliId);
    if (!input.acceptedTerms || signedBy.length < 2 || signedBy.length > 160 || !(["mother", "father", "guardian"] as string[]).includes(signerRole) || !isValidIsraeliId(signerIsraeliId)) {
        throw new DaycareOnboardingServiceError("יש למלא שם מלא, תפקיד ותעודת זהות תקינה ולאשר את נוסח ההסכמה.", 400, "INVALID_SIGNATURE");
    }
    if (input.signature.mimetype !== "image/png" || !input.signature.buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
        throw new DaycareOnboardingServiceError("Signature drawing is invalid", 400, "INVALID_SIGNATURE_FILE");
    }
    const { onboarding, version, stepIndex } = await getSignableContext(token, now);
    if (await DaycareAgreement.exists({ onboardingId: onboarding._id })) {
        throw new DaycareOnboardingServiceError("ההסכם כבר אושר וננעל.", 409, "AGREEMENT_ALREADY_SIGNED");
    }
    const documentId = randomUUID();
    const contentSnapshot = structuredDocumentFromVersion(version);
    const signedContentHash = hashSignedAgreementSnapshot({ documentKey: "daycareAgreement", version: version.version, schoolYear: version.schoolYear, document: contentSnapshot });
    const pdf = await createSignedAgreementPdf({ documentId, documentKey: "daycareAgreement", version: version.version, schoolYear: version.schoolYear, contentHash: signedContentHash, contentSnapshot, signedBy, signerRole, signerIsraeliId, signatureImage: input.signature.buffer, acceptedStatement: ONLINE_AGREEMENT_ACCEPTANCE_STATEMENT, signedAt: now });
    const storage = getDaycareStorageProvider();
    const signatureFile = await storage.upload({ bytes: input.signature.buffer, mimeType: "image/png", originalName: `signature-${documentId}.png`, category: "signatures" });
    let signedPdfFile;
    try {
        signedPdfFile = await storage.upload({ bytes: pdf, mimeType: "application/pdf", originalName: `daycare-agreement-${documentId}.pdf`, category: "signed-agreements" });
    } catch (error) {
        await storage.delete(signatureFile.storageKey).catch(() => undefined);
        throw error;
    }
    let agreement: InstanceType<typeof DaycareAgreement>;
    try {
        agreement = await DaycareAgreement.create({
            onboardingId: onboarding._id,
            versionId: version._id,
            documentId,
            documentKey: "daycareAgreement",
            version: version.version,
            contentHash: signedContentHash,
            contentSnapshot,
            status: "pendingReview",
            signingMethod: "online",
            signedBy,
            signerRole,
            signerIsraeliId: encryptDaycarePrivateValue(signerIsraeliId),
            signerIsraeliIdFingerprint: fingerprintDaycareIsraeliId(signerIsraeliId),
            acceptedTerms: true,
            acceptedStatement: ONLINE_AGREEMENT_ACCEPTANCE_STATEMENT,
            signedAt: now,
            ipAddress: encryptDaycarePrivateValue(input.ipAddress || "unknown"),
            userAgent: input.userAgent.slice(0, 512),
            signatureFile,
            signedPdfFile,
        });
    } catch (error) {
        await storage.delete(signatureFile.storageKey).catch(() => undefined);
        await storage.delete(signedPdfFile.storageKey).catch(() => undefined);
        if ((error as { code?: number }).code === 11000) {
            throw new DaycareOnboardingServiceError("ההסכם כבר אושר וננעל.", 409, "AGREEMENT_ALREADY_SIGNED");
        }
        throw error;
    }
    await markPendingReview(
        onboarding,
        stepIndex,
        agreement._id,
        "online",
        "agreementSignedOnline",
        now
    );
    await createAuditEntries([
        {
            onboardingId: onboarding._id,
            actorType: "automatic",
            actorLabel: "system",
            action: DAYCARE_ONBOARDING_AUDIT_ACTIONS.agreementFinalPdfCreated,
            stepKey: "agreementSigned",
            newValue: { agreementId: agreement._id, documentId },
            createdAt: now,
        },
    ]);
    return publicAgreementDto(agreement);
};

export const downloadSignedAgreementForParent = async (token: string, now = new Date()) => {
    const onboarding = await getPublicOnboardingDocumentByToken(token, now);
    const agreement = await DaycareAgreement.findOne({ onboardingId: onboarding._id });
    if (!agreement?.signedPdfFile || agreement.signingMethod !== "online") {
        throw new DaycareOnboardingServiceError("Signed agreement was not found", 404, "AGREEMENT_FILE_NOT_FOUND");
    }
    const bytes = await getDaycareStorageProvider().download(agreement.signedPdfFile.storageKey);
    if (createHash("sha256").update(bytes).digest("hex") !== agreement.signedPdfFile.sha256) {
        throw new DaycareOnboardingServiceError("Stored agreement file failed integrity check", 409, "AGREEMENT_FILE_INTEGRITY_FAILED");
    }
    await createAuditEntries([{ onboardingId: onboarding._id, actorType: "parent", actorLabel: "parent-link", action: DAYCARE_ONBOARDING_AUDIT_ACTIONS.agreementCopyDownloaded, stepKey: "agreementSigned", newValue: { documentId: agreement.documentId }, createdAt: now }]);
    return { bytes, mimeType: "application/pdf", filename: `daycare-agreement-${agreement.documentId ?? "signed"}.pdf` };
};

export const submitSignedAgreementPdf = async (token: string, file: Express.Multer.File, now = new Date()) => {
    if (file.mimetype !== "application/pdf") throw new DaycareOnboardingServiceError("Only PDF files are allowed", 400, "INVALID_AGREEMENT_FILE");
    if (!file.originalname.toLowerCase().endsWith(".pdf") || file.buffer.subarray(0, 5).toString("ascii") !== "%PDF-") throw new DaycareOnboardingServiceError("PDF file is invalid", 400, "INVALID_AGREEMENT_FILE");
    const { onboarding, version, stepIndex } = await getSignableContext(token, now);
    const existingAgreement = await DaycareAgreement.findOne({ onboardingId: onboarding._id });
    if (existingAgreement && (existingAgreement.signingMethod === "online" || existingAgreement.status !== "requiresCorrection")) {
        throw new DaycareOnboardingServiceError("ההסכם כבר נשלח וננעל.", 409, "AGREEMENT_ALREADY_SIGNED");
    }
    const stored = await getDaycareStorageProvider().upload({ bytes: file.buffer, mimeType: "application/pdf", originalName: file.originalname, category: "signed-agreements" });
    const agreement = await DaycareAgreement.findOneAndUpdate(
        { onboardingId: onboarding._id },
        { $set: { versionId: version._id, status: "pendingReview", signingMethod: "uploadedPdf", signedAt: now, signedPdfFile: stored }, $unset: { signatureFile: 1, acceptedTerms: 1, signedBy: 1, signerRole: 1, signerRoleDetails: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    await markPendingReview(onboarding, stepIndex, agreement._id, "uploadedFile", "agreementPdfUploaded", now);
    return publicAgreementDto(agreement);
};

export const reviewAgreement = async (agreementId: string, input: { status: "completed" | "requiresCorrection"; parentMessage?: string }, now = new Date()) => {
    if (!Types.ObjectId.isValid(agreementId)) throw new DaycareOnboardingServiceError("Agreement not found", 404, "AGREEMENT_NOT_FOUND");
    const agreement = await DaycareAgreement.findById(agreementId);
    if (!agreement) throw new DaycareOnboardingServiceError("Agreement not found", 404, "AGREEMENT_NOT_FOUND");
    if (agreement.signingMethod === "online" && input.status === "requiresCorrection") {
        throw new DaycareOnboardingServiceError(
            "Online agreements can only be approved after signature review",
            409,
            "ONLINE_AGREEMENT_CORRECTION_NOT_SUPPORTED"
        );
    }
    if (input.status === "completed" && agreement.status === "completed") {
        return agreementDto(agreement);
    }
    agreement.status = input.status;
    agreement.parentMessage = input.parentMessage?.trim() || undefined;
    agreement.reviewedAt = now;
    agreement.reviewedBy = "shared-admin";
    await agreement.save();
    await updateAdminOnboardingStep(agreement.onboardingId.toString(), "agreementSigned", {
        status: input.status,
        parentMessage: input.parentMessage?.trim() || null,
    }, now);
    await createAuditEntries([{ onboardingId: agreement.onboardingId, actorType: "admin", actorLabel: "shared-admin", action: DAYCARE_ONBOARDING_AUDIT_ACTIONS.agreementReviewed, stepKey: "agreementSigned", newValue: { status: input.status }, createdAt: now }]);
    return agreementDto(agreement);
};

export const downloadAgreementFileForAdmin = async (agreementId: string, kind: "signature" | "signedPdf") => {
    if (!Types.ObjectId.isValid(agreementId)) throw new DaycareOnboardingServiceError("Agreement not found", 404, "AGREEMENT_NOT_FOUND");
    const agreement = await DaycareAgreement.findById(agreementId);
    if (!agreement) throw new DaycareOnboardingServiceError("Agreement not found", 404, "AGREEMENT_NOT_FOUND");
    const file = kind === "signature" ? agreement.signatureFile : agreement.signedPdfFile;
    if (!file) throw new DaycareOnboardingServiceError("Agreement file not found", 404, "AGREEMENT_FILE_NOT_FOUND");
    const bytes = await getDaycareStorageProvider().download(file.storageKey);
    if (createHash("sha256").update(bytes).digest("hex") !== file.sha256) {
        throw new DaycareOnboardingServiceError("Stored agreement file failed integrity check", 409, "AGREEMENT_FILE_INTEGRITY_FAILED");
    }
    return { bytes, mimeType: file.mimeType, filename: kind === "signature" ? "signature.png" : "signed-agreement.pdf" };
};
