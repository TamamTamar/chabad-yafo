import { createHash, randomUUID } from "node:crypto";
import { Types } from "mongoose";
import { DAYCARE_ONBOARDING_AUDIT_ACTIONS } from "../config/daycareOnboardingAuditActions";
import { DaycareChild } from "../models/DaycareChild";
import { DaycareFamily } from "../models/DaycareFamily";
import { DaycareOnboarding } from "../models/DaycareOnboarding";
import { DaycarePickupAuthorization } from "../models/DaycarePickupAuthorization";
import type { DaycareAuthorizedCollector, DaycarePickupAuthorizationPayload, DaycarePickupAuthorizationStatus, DaycarePickupSignerRole } from "../types/daycarePickupAuthorization";
import type { DaycareCorrectionDisposition } from "../types/daycareAgreement";
import { convertPickupImageUploadToPdf, createBlankPickupAuthorizationPdf, createSignedPickupAuthorizationPdf } from "./daycarePickupAuthorizationPdfService";
import { decryptDaycarePrivateValue, encryptDaycarePrivateValue, isDaycarePiiEncryptionConfigured, isValidIsraeliId, normalizeIsraeliId } from "./daycarePiiEncryptionService";
import { createAuditEntries, DaycareOnboardingServiceError, getPublicOnboardingDocumentByToken, isParentBundleSubmitted, updateAdminOnboardingStep } from "./daycareOnboardingService";
import { getDaycareStorageProvider, isDaycareStorageConfigured } from "./daycareStorageService";
import { logger } from "../utils/logger";

const formVersion = "pickup-2026-v1";
type SubmissionInput = { collectors: DaycareAuthorizedCollector[]; informationConfirmed: true; signedBy: string; signerRole: DaycarePickupSignerRole };
const canonicalPayload = (payload: DaycarePickupAuthorizationPayload) => JSON.stringify(payload);
const hashPayload = (payload: DaycarePickupAuthorizationPayload) => createHash("sha256").update(canonicalPayload(payload), "utf8").digest("hex");
const decryptPayload = (value: InstanceType<typeof DaycarePickupAuthorization>) => value.encryptedPayload ? JSON.parse(decryptDaycarePrivateValue(value.encryptedPayload)) as DaycarePickupAuthorizationPayload : undefined;
const dto = (value: InstanceType<typeof DaycarePickupAuthorization>, includePayload: boolean) => ({ id: value.id, documentId: value.documentId, revision: value.revision, formVersion: value.formVersion, status: value.status, signingMethod: value.signingMethod, submittedAt: value.submittedAt, parentMessage: value.parentMessage, correctionDisposition: value.correctionDisposition, hasSignedPdf: Boolean(value.signedPdfFile), ...(includePayload && value.encryptedPayload ? { payload: decryptPayload(value) } : {}) });
const latestFor = (onboardingId: Types.ObjectId | string, includePayload = false) => { const query = DaycarePickupAuthorization.findOne({ onboardingId }).sort({ revision: -1 }); if (includePayload) query.select("+encryptedPayload"); return query; };

const prerequisitesComplete = (onboarding: InstanceType<typeof DaycareOnboarding>) => {
    const health = onboarding.steps.find((step) => step.key === "healthDeclarationSubmitted");
    return Boolean(health && ["pendingReview", "completed", "notRequired"].includes(health.status));
};
const childNameFor = async (onboarding: InstanceType<typeof DaycareOnboarding>) => {
    if (onboarding.childId) { const child = await DaycareChild.findById(onboarding.childId).select("firstName lastName"); if (child) return `${child.firstName} ${child.lastName}`.trim(); }
    return "הילד/ה";
};
const guardiansFor = async (onboarding: InstanceType<typeof DaycareOnboarding>) => {
    if (!onboarding.familyId) return [];
    const family = await DaycareFamily.findById(onboarding.familyId).select("guardians");
    return family?.guardians.map((guardian) => ({ fullName: guardian.fullName, role: guardian.role, roleDetails: guardian.roleDetails, phone: guardian.phone })) ?? [];
};

export const getPublicPickupAuthorization = async (token: string, now = new Date()) => {
    const onboarding = await getPublicOnboardingDocumentByToken(token, now); const latest = await latestFor(onboarding._id, true);
    if (!latest && !prerequisitesComplete(onboarding)) return { available: false as const, reason: "previousStepsIncomplete" as const };
    return { available: true as const, canSubmit: !isParentBundleSubmitted(onboarding), guardians: await guardiansFor(onboarding), declaration: latest ? dto(latest, true) : null };
};

const markPending = async (onboarding: InstanceType<typeof DaycareOnboarding>, recordId: Types.ObjectId, source: "online" | "uploadedFile", now: Date) => {
    const index = onboarding.steps.findIndex((step) => step.key === "pickupAuthorizationSubmitted"); if (index < 0) throw new DaycareOnboardingServiceError("שלב מורשי האיסוף לא נמצא.", 409, "PICKUP_STEP_NOT_FOUND");
    const previousStatus = onboarding.steps[index].status; onboarding.steps[index].status = "pendingReview"; onboarding.steps[index].source = source; onboarding.steps[index].updatedAt = now; onboarding.steps[index].updatedBy = "parent"; onboarding.steps[index].parentMessage = undefined; onboarding.steps[index].relatedRecord = { type: "daycarePickupAuthorization", recordId, formKey: formVersion };
    onboarding.markModified("steps"); onboarding.parentSubmittedAt = undefined; onboarding.overallStatus = "waitingForParent"; await onboarding.save();
    await createAuditEntries([{ onboardingId: onboarding._id, actorType: "parent", actorLabel: "parent-link", action: DAYCARE_ONBOARDING_AUDIT_ACTIONS.stepStatusChanged, stepKey: "pickupAuthorizationSubmitted", previousValue: previousStatus, newValue: "pendingReview", createdAt: now }]);
};

const finalizeReplacedAuthorization = async (previous: InstanceType<typeof DaycarePickupAuthorization> | null, now: Date) => {
    if (!previous) return;
    previous.supersededAt = now;
    await previous.save();
    if (previous.correctionDisposition !== "discardFileAfterReplacement") return;

    const storage = getDaycareStorageProvider();
    const files = [previous.signatureFile, previous.signedPdfFile].filter(Boolean);
    try {
        await Promise.all(files.map((file) => storage.delete(file!.storageKey)));
        await DaycarePickupAuthorization.updateOne(
            { _id: previous._id },
            {
                $unset: { signatureFile: 1, signedPdfFile: 1, encryptedPayload: 1 },
                $set: { fileDiscardedAt: now },
            }
        );
    } catch (error) {
        logger.error("Failed to discard replaced pickup authorization files", error);
    }
};

const normalizeCollectors = (collectors: DaycareAuthorizedCollector[]) => collectors.map((collector) => ({ ...collector, fullName: collector.fullName.trim(), relationship: collector.relationship.trim(), phone: collector.phone.trim(), israeliId: normalizeIsraeliId(collector.israeliId) }));
const validateCollectors = (collectors: DaycareAuthorizedCollector[]) => collectors.length <= 10 && collectors.every((collector) => collector.fullName.length >= 2 && collector.fullName.length <= 160 && collector.relationship.length >= 2 && collector.relationship.length <= 100 && collector.phone.length >= 7 && collector.phone.length <= 30 && isValidIsraeliId(collector.israeliId));

export const submitPickupAuthorization = async (token: string, input: SubmissionInput, signature: Express.Multer.File, now = new Date()) => {
    if (!isDaycarePiiEncryptionConfigured() || !isDaycareStorageConfigured()) throw new DaycareOnboardingServiceError("שליחת מורשי האיסוף אינה זמינה כרגע.", 503, "PICKUP_NOT_CONFIGURED");
    if (signature.mimetype !== "image/png" || !signature.buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new DaycareOnboardingServiceError("החתימה אינה תקינה.", 400, "INVALID_PICKUP_SIGNATURE");
    const collectors = normalizeCollectors(input.collectors); if (!validateCollectors(collectors) || input.signedBy.trim().length < 2 || input.signedBy.trim().length > 160) throw new DaycareOnboardingServiceError("יש לבדוק את פרטי מורשי האיסוף והחותם/ת.", 400, "INVALID_PICKUP_DETAILS");
    const onboarding = await getPublicOnboardingDocumentByToken(token, now); const latest = await latestFor(onboarding._id);
    if (!latest && !prerequisitesComplete(onboarding)) throw new DaycareOnboardingServiceError("יש להשלים תחילה את הצהרת הבריאות.", 409, "PICKUP_PREREQUISITES_INCOMPLETE");
    if (isParentBundleSubmitted(onboarding)) throw new DaycareOnboardingServiceError("התיק כבר נשלח לצוות המעון ומורשי האיסוף ננעלו.", 409, "PICKUP_ALREADY_SUBMITTED");
    const payload: DaycarePickupAuthorizationPayload = { guardians: await guardiansFor(onboarding), collectors, informationConfirmed: true, signedBy: input.signedBy.trim(), signerRole: input.signerRole };
    const revision = (latest?.revision ?? 0) + 1; const documentId = randomUUID(); const contentHash = hashPayload(payload); const storage = getDaycareStorageProvider();
    const pdf = await createSignedPickupAuthorizationPdf({ documentId, revision, schoolYear: onboarding.schoolYear, childName: await childNameFor(onboarding), payload, contentHash, signatureImage: signature.buffer, submittedAt: now });
    const signatureFile = await storage.upload({ bytes: signature.buffer, mimeType: "image/png", originalName: `pickup-signature-${documentId}.png`, category: "pickup-signatures" }); let signedPdfFile;
    try { signedPdfFile = await storage.upload({ bytes: pdf, mimeType: "application/pdf", originalName: `pickup-authorization-${documentId}.pdf`, category: "pickup-authorizations" }); } catch (error) { await storage.delete(signatureFile.storageKey).catch(() => undefined); throw error; }
    let declaration: InstanceType<typeof DaycarePickupAuthorization>;
    try { declaration = await DaycarePickupAuthorization.create({ onboardingId: onboarding._id, documentId, revision, formVersion, status: "pendingReview", signingMethod: "online", encryptedPayload: encryptDaycarePrivateValue(canonicalPayload(payload)), contentHash, signatureFile, signedPdfFile, submittedAt: now }); }
    catch (error) { await Promise.all([storage.delete(signatureFile.storageKey).catch(() => undefined), storage.delete(signedPdfFile.storageKey).catch(() => undefined)]); throw error; }
    await markPending(onboarding, declaration._id, "online", now); await finalizeReplacedAuthorization(latest, now); return dto(declaration, false);
};

const isPdf = (file: Express.Multer.File) => file.mimetype === "application/pdf" && file.buffer.subarray(0, 5).toString("ascii") === "%PDF-";
const isPng = (file: Express.Multer.File) => file.mimetype === "image/png" && file.buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
const isJpeg = (file: Express.Multer.File) => file.mimetype === "image/jpeg" && file.buffer[0] === 0xff && file.buffer[1] === 0xd8 && file.buffer[file.buffer.length - 2] === 0xff && file.buffer[file.buffer.length - 1] === 0xd9;
export const downloadBlankPickupAuthorization = async (token: string, now = new Date()) => { const onboarding = await getPublicOnboardingDocumentByToken(token, now); if (!prerequisitesComplete(onboarding)) throw new DaycareOnboardingServiceError("יש להשלים תחילה את הצהרת הבריאות.", 409, "PICKUP_PREREQUISITES_INCOMPLETE"); return { bytes: await createBlankPickupAuthorizationPdf({ schoolYear: onboarding.schoolYear, childName: await childNameFor(onboarding), guardians: await guardiansFor(onboarding) }), mimeType: "application/pdf", filename: "pickup-authorization-blank.pdf" }; };
export const submitUploadedPickupAuthorization = async (token: string, file: Express.Multer.File, now = new Date()) => {
    if (!isDaycareStorageConfigured()) throw new DaycareOnboardingServiceError("העלאת מורשי האיסוף אינה זמינה כרגע.", 503, "PICKUP_NOT_CONFIGURED"); if (!isPdf(file) && !isPng(file) && !isJpeg(file)) throw new DaycareOnboardingServiceError("יש להעלות PDF, JPG או PNG תקינים.", 400, "INVALID_PICKUP_UPLOAD");
    const onboarding = await getPublicOnboardingDocumentByToken(token, now); const latest = await latestFor(onboarding._id); if (!latest && !prerequisitesComplete(onboarding)) throw new DaycareOnboardingServiceError("יש להשלים תחילה את הצהרת הבריאות.", 409, "PICKUP_PREREQUISITES_INCOMPLETE"); if (isParentBundleSubmitted(onboarding)) throw new DaycareOnboardingServiceError("התיק כבר נשלח לצוות המעון ומורשי האיסוף ננעלו.", 409, "PICKUP_ALREADY_SUBMITTED");
    const revision = (latest?.revision ?? 0) + 1; const documentId = randomUUID(); const pdf = isPdf(file) ? file.buffer : await convertPickupImageUploadToPdf(file.buffer); const contentHash = createHash("sha256").update(pdf).digest("hex"); const storage = getDaycareStorageProvider(); const signedPdfFile = await storage.upload({ bytes: pdf, mimeType: "application/pdf", originalName: `pickup-authorization-${documentId}.pdf`, category: "pickup-authorizations" }); let declaration: InstanceType<typeof DaycarePickupAuthorization>;
    try { declaration = await DaycarePickupAuthorization.create({ onboardingId: onboarding._id, documentId, revision, formVersion, status: "pendingReview", signingMethod: "uploadedFile", contentHash, signedPdfFile, submittedAt: now }); } catch (error) { await storage.delete(signedPdfFile.storageKey).catch(() => undefined); throw error; }
    await markPending(onboarding, declaration._id, "uploadedFile", now); await finalizeReplacedAuthorization(latest, now); return dto(declaration, false);
};

export const getAdminPickupAuthorization = async (onboardingId: string) => { if (!Types.ObjectId.isValid(onboardingId)) throw new DaycareOnboardingServiceError("תיק ההצטרפות לא נמצא.", 404, "ONBOARDING_NOT_FOUND"); const latest = await latestFor(onboardingId, true); return latest ? dto(latest, true) : null; };
export const reviewPickupAuthorization = async (id: string, status: Exclude<DaycarePickupAuthorizationStatus, "pendingReview">, parentMessage?: string, correctionDisposition?: DaycareCorrectionDisposition, now = new Date()) => { if (!Types.ObjectId.isValid(id)) throw new DaycareOnboardingServiceError("מסמך מורשי האיסוף לא נמצא.", 404, "PICKUP_NOT_FOUND"); const declaration = await DaycarePickupAuthorization.findById(id); if (!declaration) throw new DaycareOnboardingServiceError("מסמך מורשי האיסוף לא נמצא.", 404, "PICKUP_NOT_FOUND"); if (declaration.supersededAt) throw new DaycareOnboardingServiceError("גרסת מורשי האיסוף הוחלפה ואינה ניתנת לאישור.", 409, "PICKUP_SUPERSEDED"); if (status === "requiresCorrection" && !parentMessage?.trim()) throw new DaycareOnboardingServiceError("יש לכתוב להורה מה נדרש לתקן.", 400, "PICKUP_CORRECTION_MESSAGE_REQUIRED"); if (status === "requiresCorrection" && correctionDisposition === "discardFileAfterReplacement" && declaration.signingMethod !== "uploadedFile") throw new DaycareOnboardingServiceError("ניתן למחוק לאחר החלפה רק קובץ שהועלה ידנית.", 400, "PICKUP_CORRECTION_DISPOSITION_INVALID"); declaration.status = status; declaration.parentMessage = parentMessage?.trim() || undefined; declaration.correctionDisposition = status === "requiresCorrection" ? correctionDisposition ?? "preserveVersion" : undefined; declaration.reviewedAt = now; declaration.reviewedBy = "shared-admin"; await declaration.save(); await updateAdminOnboardingStep(declaration.onboardingId.toString(), "pickupAuthorizationSubmitted", { status, parentMessage: declaration.parentMessage ?? null }, now); return dto(declaration, false); };
const downloadStored = async (declaration: InstanceType<typeof DaycarePickupAuthorization>) => { if (!declaration.signedPdfFile) throw new DaycareOnboardingServiceError("קובץ מורשי האיסוף כבר הוחלף והוסר.", 404, "PICKUP_FILE_NOT_FOUND"); const bytes = await getDaycareStorageProvider().download(declaration.signedPdfFile.storageKey); if (createHash("sha256").update(bytes).digest("hex") !== declaration.signedPdfFile.sha256) throw new DaycareOnboardingServiceError("קובץ מורשי האיסוף נכשל בבדיקת תקינות.", 409, "PICKUP_FILE_INTEGRITY_FAILED"); return { bytes, mimeType: "application/pdf", filename: `pickup-authorization-${declaration.documentId}.pdf` }; };
export const downloadPickupAuthorizationForParent = async (token: string, now = new Date()) => { const onboarding = await getPublicOnboardingDocumentByToken(token, now); const latest = await latestFor(onboarding._id); if (!latest) throw new DaycareOnboardingServiceError("מסמך מורשי האיסוף לא נמצא.", 404, "PICKUP_NOT_FOUND"); return downloadStored(latest); };
export const downloadPickupAuthorizationForAdmin = async (id: string) => { if (!Types.ObjectId.isValid(id)) throw new DaycareOnboardingServiceError("מסמך מורשי האיסוף לא נמצא.", 404, "PICKUP_NOT_FOUND"); const declaration = await DaycarePickupAuthorization.findById(id); if (!declaration) throw new DaycareOnboardingServiceError("מסמך מורשי האיסוף לא נמצא.", 404, "PICKUP_NOT_FOUND"); return downloadStored(declaration); };
