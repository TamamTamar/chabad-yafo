import { createHash, randomUUID } from "node:crypto";
import { Types } from "mongoose";
import { DAYCARE_ONBOARDING_AUDIT_ACTIONS } from "../config/daycareOnboardingAuditActions";
import { DaycareChild } from "../models/DaycareChild";
import { DaycareHealthDeclaration } from "../models/DaycareHealthDeclaration";
import { DaycareOnboarding } from "../models/DaycareOnboarding";
import type { DaycareHealthDeclarationPayload, DaycareHealthDeclarationStatus } from "../types/daycareHealthDeclaration";
import type { DaycareCorrectionDisposition } from "../types/daycareAgreement";
import { convertHealthImageUploadToPdf, createBlankHealthDeclarationPdf, createSignedHealthDeclarationPdf } from "./daycareHealthDeclarationPdfService";
import { decryptDaycarePrivateValue, encryptDaycarePrivateValue, isDaycarePiiEncryptionConfigured } from "./daycarePiiEncryptionService";
import { createAuditEntries, DaycareOnboardingServiceError, getPublicOnboardingDocumentByToken, isParentBundleSubmitted, updateAdminOnboardingStep } from "./daycareOnboardingService";
import { getDaycareStorageProvider, isDaycareStorageConfigured } from "./daycareStorageService";
import { logger } from "../utils/logger";

const formVersion = "health-2026-v1";
const canonicalPayload = (payload: DaycareHealthDeclarationPayload) => JSON.stringify(payload);
const hashPayload = (payload: DaycareHealthDeclarationPayload) => createHash("sha256").update(canonicalPayload(payload), "utf8").digest("hex");
const decryptPayload = (value: InstanceType<typeof DaycareHealthDeclaration>) =>
    value.encryptedPayload
        ? JSON.parse(decryptDaycarePrivateValue(value.encryptedPayload)) as DaycareHealthDeclarationPayload
        : undefined;

const declarationDto = (value: InstanceType<typeof DaycareHealthDeclaration>, includePayload: boolean) => ({
    id: value.id,
    documentId: value.documentId,
    revision: value.revision,
    formVersion: value.formVersion,
    status: value.status,
    signingMethod: value.signingMethod,
    submittedAt: value.submittedAt,
    parentMessage: value.parentMessage,
    correctionDisposition: value.correctionDisposition,
    hasSignedPdf: Boolean(value.signedPdfFile),
    ...(includePayload && value.encryptedPayload ? { payload: decryptPayload(value) } : {}),
});

const latestForOnboarding = (onboardingId: Types.ObjectId | string, includePayload = false) => {
    const query = DaycareHealthDeclaration.findOne({ onboardingId }).sort({ revision: -1 });
    if (includePayload) query.select("+encryptedPayload");
    return query;
};

const prerequisitesComplete = (onboarding: InstanceType<typeof DaycareOnboarding>) => {
    const prerequisiteKeys = new Set(["onboardingOpened", "childAndGuardianDetails", "agreementSigned"]);
    return onboarding.steps
        .filter((step) => prerequisiteKeys.has(step.key))
        .every((step) => ["pendingReview", "completed", "notRequired"].includes(step.status));
};

const childNameFor = async (onboarding: InstanceType<typeof DaycareOnboarding>) => {
    if (onboarding.childId) {
        const child = await DaycareChild.findById(onboarding.childId).select("firstName lastName");
        if (child) return `${child.firstName} ${child.lastName}`.trim();
    }
    return onboarding.temporaryChildAge ? "הילד/ה" : "הילד/ה";
};

export const getPublicHealthDeclaration = async (token: string, now = new Date()) => {
    const onboarding = await getPublicOnboardingDocumentByToken(token, now);
    const latest = await latestForOnboarding(onboarding._id, true);
    if (!latest && !prerequisitesComplete(onboarding)) {
        return { available: false as const, reason: "previousStepsIncomplete" as const };
    }
    return {
        available: true as const,
        canSubmit: !isParentBundleSubmitted(onboarding),
        declaration: latest ? declarationDto(latest, true) : null,
    };
};

const markHealthStepPendingReview = async (onboarding: InstanceType<typeof DaycareOnboarding>, recordId: Types.ObjectId, source: "online" | "uploadedFile", now: Date) => {
    const stepIndex = onboarding.steps.findIndex((step) => step.key === "healthDeclarationSubmitted");
    if (stepIndex < 0) throw new DaycareOnboardingServiceError("שלב הצהרת הבריאות לא נמצא.", 409, "HEALTH_STEP_NOT_FOUND");
    const previousStatus = onboarding.steps[stepIndex].status;
    onboarding.steps[stepIndex].status = "pendingReview";
    onboarding.steps[stepIndex].source = source;
    onboarding.steps[stepIndex].updatedAt = now;
    onboarding.steps[stepIndex].updatedBy = "parent";
    onboarding.steps[stepIndex].parentMessage = undefined;
    onboarding.steps[stepIndex].relatedRecord = { type: "daycareHealthDeclaration", recordId, formKey: formVersion };
    onboarding.markModified("steps");
    onboarding.parentSubmittedAt = undefined;
    onboarding.overallStatus = "waitingForParent";
    await onboarding.save();
    await createAuditEntries([{ onboardingId: onboarding._id, actorType: "parent", actorLabel: "parent-link", action: DAYCARE_ONBOARDING_AUDIT_ACTIONS.stepStatusChanged, stepKey: "healthDeclarationSubmitted", previousValue: previousStatus, newValue: "pendingReview", createdAt: now }]);
};

const finalizeReplacedDeclaration = async (previous: InstanceType<typeof DaycareHealthDeclaration> | null, now: Date) => {
    if (!previous) return;
    previous.supersededAt = now;
    await previous.save();
    if (previous.correctionDisposition !== "discardFileAfterReplacement") return;

    const storage = getDaycareStorageProvider();
    const files = [previous.signatureFile, previous.signedPdfFile].filter(Boolean);
    try {
        await Promise.all(files.map((file) => storage.delete(file!.storageKey)));
        await DaycareHealthDeclaration.updateOne(
            { _id: previous._id },
            {
                $unset: { signatureFile: 1, signedPdfFile: 1, encryptedPayload: 1 },
                $set: { fileDiscardedAt: now },
            }
        );
    } catch (error) {
        logger.error("Failed to discard replaced health declaration files", error);
    }
};

export const submitHealthDeclaration = async (token: string, payload: DaycareHealthDeclarationPayload, signature: Express.Multer.File, now = new Date()) => {
    if (!isDaycarePiiEncryptionConfigured() || !isDaycareStorageConfigured()) {
        throw new DaycareOnboardingServiceError("שליחת הצהרת הבריאות אינה זמינה כרגע.", 503, "HEALTH_DECLARATION_NOT_CONFIGURED");
    }
    if (signature.mimetype !== "image/png" || !signature.buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
        throw new DaycareOnboardingServiceError("החתימה אינה תקינה.", 400, "INVALID_HEALTH_SIGNATURE");
    }
    const onboarding = await getPublicOnboardingDocumentByToken(token, now);
    const latest = await latestForOnboarding(onboarding._id);
    if (!latest && !prerequisitesComplete(onboarding)) {
        throw new DaycareOnboardingServiceError("יש להשלים תחילה את השלבים הקודמים.", 409, "HEALTH_PREREQUISITES_INCOMPLETE");
    }
    if (isParentBundleSubmitted(onboarding)) {
        throw new DaycareOnboardingServiceError("התיק כבר נשלח לצוות המעון והצהרת הבריאות ננעלה.", 409, "HEALTH_DECLARATION_ALREADY_SUBMITTED");
    }

    const revision = (latest?.revision ?? 0) + 1;
    const documentId = randomUUID();
    const contentHash = hashPayload(payload);
    const childName = await childNameFor(onboarding);
    const pdf = await createSignedHealthDeclarationPdf({ documentId, revision, schoolYear: onboarding.schoolYear, childName, payload, contentHash, signatureImage: signature.buffer, submittedAt: now });
    const storage = getDaycareStorageProvider();
    const signatureFile = await storage.upload({ bytes: signature.buffer, mimeType: "image/png", originalName: `health-signature-${documentId}.png`, category: "health-signatures" });
    let signedPdfFile;
    try {
        signedPdfFile = await storage.upload({ bytes: pdf, mimeType: "application/pdf", originalName: `health-declaration-${documentId}.pdf`, category: "health-declarations" });
    } catch (error) {
        await storage.delete(signatureFile.storageKey).catch(() => undefined);
        throw error;
    }

    let declaration: InstanceType<typeof DaycareHealthDeclaration>;
    try {
        declaration = await DaycareHealthDeclaration.create({
            onboardingId: onboarding._id,
            documentId,
            revision,
            formVersion,
            status: "pendingReview",
            signingMethod: "online",
            encryptedPayload: encryptDaycarePrivateValue(canonicalPayload(payload)),
            contentHash,
            signatureFile,
            signedPdfFile,
            submittedAt: now,
        });
    } catch (error) {
        await Promise.all([storage.delete(signatureFile.storageKey).catch(() => undefined), storage.delete(signedPdfFile.storageKey).catch(() => undefined)]);
        throw error;
    }
    await markHealthStepPendingReview(onboarding, declaration._id, "online", now);
    await finalizeReplacedDeclaration(latest, now);
    return declarationDto(declaration, false);
};

const isPdf = (file: Express.Multer.File) =>
    file.mimetype === "application/pdf" && file.buffer.subarray(0, 5).toString("ascii") === "%PDF-";
const isPng = (file: Express.Multer.File) =>
    file.mimetype === "image/png" && file.buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
const isJpeg = (file: Express.Multer.File) =>
    file.mimetype === "image/jpeg" && file.buffer[0] === 0xff && file.buffer[1] === 0xd8 && file.buffer.at(-2) === 0xff && file.buffer.at(-1) === 0xd9;

export const downloadBlankHealthDeclarationForParent = async (token: string, now = new Date()) => {
    const onboarding = await getPublicOnboardingDocumentByToken(token, now);
    if (!prerequisitesComplete(onboarding)) throw new DaycareOnboardingServiceError("יש להשלים תחילה את השלבים הקודמים.", 409, "HEALTH_PREREQUISITES_INCOMPLETE");
    const bytes = await createBlankHealthDeclarationPdf({ schoolYear: onboarding.schoolYear, childName: await childNameFor(onboarding) });
    return { bytes, mimeType: "application/pdf", filename: "health-declaration-blank.pdf" };
};

export const submitUploadedHealthDeclaration = async (token: string, file: Express.Multer.File, now = new Date()) => {
    if (!isDaycareStorageConfigured()) throw new DaycareOnboardingServiceError("העלאת הצהרת הבריאות אינה זמינה כרגע.", 503, "HEALTH_DECLARATION_NOT_CONFIGURED");
    if (!isPdf(file) && !isPng(file) && !isJpeg(file)) throw new DaycareOnboardingServiceError("יש להעלות PDF, JPG או PNG תקינים.", 400, "INVALID_HEALTH_UPLOAD");
    const onboarding = await getPublicOnboardingDocumentByToken(token, now);
    const latest = await latestForOnboarding(onboarding._id);
    if (!latest && !prerequisitesComplete(onboarding)) throw new DaycareOnboardingServiceError("יש להשלים תחילה את השלבים הקודמים.", 409, "HEALTH_PREREQUISITES_INCOMPLETE");
    if (isParentBundleSubmitted(onboarding)) throw new DaycareOnboardingServiceError("התיק כבר נשלח לצוות המעון והצהרת הבריאות ננעלה.", 409, "HEALTH_DECLARATION_ALREADY_SUBMITTED");

    const revision = (latest?.revision ?? 0) + 1;
    const documentId = randomUUID();
    const pdf = isPdf(file) ? file.buffer : await convertHealthImageUploadToPdf(file.buffer, isPng(file) ? "image/png" : "image/jpeg");
    const contentHash = createHash("sha256").update(pdf).digest("hex");
    const storage = getDaycareStorageProvider();
    const signedPdfFile = await storage.upload({ bytes: pdf, mimeType: "application/pdf", originalName: `health-declaration-${documentId}.pdf`, category: "health-declarations" });
    let declaration: InstanceType<typeof DaycareHealthDeclaration>;
    try {
        declaration = await DaycareHealthDeclaration.create({ onboardingId: onboarding._id, documentId, revision, formVersion, status: "pendingReview", signingMethod: "uploadedFile", contentHash, signedPdfFile, submittedAt: now });
    } catch (error) {
        await storage.delete(signedPdfFile.storageKey).catch(() => undefined);
        throw error;
    }
    await markHealthStepPendingReview(onboarding, declaration._id, "uploadedFile", now);
    await finalizeReplacedDeclaration(latest, now);
    return declarationDto(declaration, false);
};

export const getAdminHealthDeclaration = async (onboardingId: string) => {
    if (!Types.ObjectId.isValid(onboardingId)) throw new DaycareOnboardingServiceError("תיק ההצטרפות לא נמצא.", 404, "ONBOARDING_NOT_FOUND");
    const latest = await latestForOnboarding(onboardingId, true);
    return latest ? declarationDto(latest, true) : null;
};

export const reviewHealthDeclaration = async (id: string, status: Exclude<DaycareHealthDeclarationStatus, "pendingReview">, parentMessage: string | undefined, correctionDisposition?: DaycareCorrectionDisposition, now = new Date()) => {
    if (!Types.ObjectId.isValid(id)) throw new DaycareOnboardingServiceError("הצהרת הבריאות לא נמצאה.", 404, "HEALTH_DECLARATION_NOT_FOUND");
    const declaration = await DaycareHealthDeclaration.findById(id);
    if (!declaration) throw new DaycareOnboardingServiceError("הצהרת הבריאות לא נמצאה.", 404, "HEALTH_DECLARATION_NOT_FOUND");
    if (declaration.supersededAt) throw new DaycareOnboardingServiceError("גרסת ההצהרה הוחלפה ואינה ניתנת לאישור.", 409, "HEALTH_DECLARATION_SUPERSEDED");
    if (status === "requiresCorrection" && !parentMessage?.trim()) throw new DaycareOnboardingServiceError("יש לכתוב להורה מה נדרש לתקן.", 400, "HEALTH_CORRECTION_MESSAGE_REQUIRED");
    if (status === "requiresCorrection" && correctionDisposition === "discardFileAfterReplacement" && declaration.signingMethod !== "uploadedFile") throw new DaycareOnboardingServiceError("ניתן למחוק לאחר החלפה רק קובץ שהועלה ידנית.", 400, "HEALTH_CORRECTION_DISPOSITION_INVALID");
    declaration.status = status;
    declaration.parentMessage = parentMessage?.trim() || undefined;
    declaration.correctionDisposition = status === "requiresCorrection" ? correctionDisposition ?? "preserveVersion" : undefined;
    declaration.reviewedAt = now;
    declaration.reviewedBy = "shared-admin";
    await declaration.save();
    await updateAdminOnboardingStep(declaration.onboardingId.toString(), "healthDeclarationSubmitted", { status, parentMessage: declaration.parentMessage ?? null }, now);
    return declarationDto(declaration, false);
};

const downloadStoredPdf = async (declaration: InstanceType<typeof DaycareHealthDeclaration>) => {
    if (!declaration.signedPdfFile) throw new DaycareOnboardingServiceError("קובץ ההצהרה כבר הוחלף והוסר.", 404, "HEALTH_FILE_NOT_FOUND");
    const bytes = await getDaycareStorageProvider().download(declaration.signedPdfFile.storageKey);
    if (createHash("sha256").update(bytes).digest("hex") !== declaration.signedPdfFile.sha256) throw new DaycareOnboardingServiceError("קובץ ההצהרה נכשל בבדיקת תקינות.", 409, "HEALTH_FILE_INTEGRITY_FAILED");
    return { bytes, mimeType: "application/pdf", filename: `health-declaration-${declaration.documentId}.pdf` };
};

export const downloadHealthDeclarationForParent = async (token: string, now = new Date()) => {
    const onboarding = await getPublicOnboardingDocumentByToken(token, now);
    const latest = await latestForOnboarding(onboarding._id);
    if (!latest) throw new DaycareOnboardingServiceError("הצהרת הבריאות לא נמצאה.", 404, "HEALTH_DECLARATION_NOT_FOUND");
    return downloadStoredPdf(latest);
};

export const downloadHealthDeclarationForAdmin = async (id: string) => {
    if (!Types.ObjectId.isValid(id)) throw new DaycareOnboardingServiceError("הצהרת הבריאות לא נמצאה.", 404, "HEALTH_DECLARATION_NOT_FOUND");
    const declaration = await DaycareHealthDeclaration.findById(id);
    if (!declaration) throw new DaycareOnboardingServiceError("הצהרת הבריאות לא נמצאה.", 404, "HEALTH_DECLARATION_NOT_FOUND");
    return downloadStoredPdf(declaration);
};
