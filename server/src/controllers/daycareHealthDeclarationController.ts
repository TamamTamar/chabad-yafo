import type { Request, Response } from "express";
import type { DaycareHealthDeclarationPayload } from "../types/daycareHealthDeclaration";
import { downloadBlankHealthDeclarationForParent, downloadHealthDeclarationForAdmin, downloadHealthDeclarationForParent, getAdminHealthDeclaration, getPublicHealthDeclaration, reviewHealthDeclaration, submitHealthDeclaration, submitUploadedHealthDeclaration } from "../services/daycareHealthDeclarationService";
import { DaycareOnboardingServiceError } from "../services/daycareOnboardingService";
import { logger } from "../utils/logger";

const errorResponse = (res: Response, error: unknown) => {
    if (error instanceof DaycareOnboardingServiceError) return res.status(error.statusCode).json({ success: false, code: error.code, message: error.message });
    logger.error("Daycare health declaration request failed", error);
    return res.status(500).json({ success: false, message: "לא הצלחנו לבצע את הפעולה." });
};

const text = (value: unknown, max: number) => typeof value === "string" && value.trim().length > 0 && value.trim().length <= max ? value.trim() : null;
const optionalText = (value: unknown, max: number) => value === undefined || value === "" ? undefined : text(value, max);
const parsePayload = (value: unknown): DaycareHealthDeclarationPayload | null => {
    if (!value || typeof value !== "object") return null;
    const raw = value as Record<string, unknown>;
    const healthCondition = text(raw.healthCondition, 3000);
    const medicationSensitivities = text(raw.medicationSensitivities, 2000);
    const healthFund = text(raw.healthFund, 100);
    const signedBy = text(raw.signedBy, 160);
    const signerRole = raw.signerRole;
    const hasAllergies = raw.hasAllergies;
    const allergyDetails = optionalText(raw.allergyDetails, 3000);
    const exposureInstructions = optionalText(raw.exposureInstructions, 3000);
    if (!healthCondition || !medicationSensitivities || !healthFund || !signedBy || !["mother", "father", "guardian"].includes(String(signerRole)) || typeof hasAllergies !== "boolean") return null;
    if (hasAllergies && (!allergyDetails || !exposureInstructions)) return null;
    if (raw.informationConfirmed !== true || raw.allergyResponsibilityAccepted !== true) return null;
    return {
        healthCondition,
        medicationSensitivities,
        healthFund,
        hasAllergies,
        allergyDetails: hasAllergies ? allergyDetails ?? undefined : undefined,
        exposureInstructions: hasAllergies ? exposureInstructions ?? undefined : undefined,
        informationConfirmed: true,
        allergyResponsibilityAccepted: true,
        signedBy,
        signerRole: signerRole as DaycareHealthDeclarationPayload["signerRole"],
    };
};

const sendPdf = (res: Response, file: Awaited<ReturnType<typeof downloadHealthDeclarationForParent>>) => {
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
    res.setHeader("Cache-Control", "private, no-store");
    return res.send(file.bytes);
};

export const getPublicDaycareHealthDeclaration = async (req: Request, res: Response) => {
    try { return res.json({ success: true, data: await getPublicHealthDeclaration(req.params.token) }); }
    catch (error) { return errorResponse(res, error); }
};

export const submitPublicDaycareHealthDeclaration = async (req: Request, res: Response) => {
    if (!req.file) return res.status(400).json({ success: false, message: "נדרשת חתימה מצוירת." });
    let raw: unknown;
    try { raw = JSON.parse(String(req.body.payload ?? "")); } catch { return res.status(400).json({ success: false, message: "פרטי הצהרת הבריאות אינם תקינים." }); }
    const payload = parsePayload(raw);
    if (!payload) return res.status(400).json({ success: false, message: "יש להשלים את כל שדות החובה בהצהרת הבריאות." });
    try { return res.json({ success: true, data: await submitHealthDeclaration(req.params.token, payload, req.file) }); }
    catch (error) { return errorResponse(res, error); }
};

export const downloadBlankPublicDaycareHealthDeclaration = async (req: Request, res: Response) => {
    try { return sendPdf(res, await downloadBlankHealthDeclarationForParent(req.params.token)); }
    catch (error) { return errorResponse(res, error); }
};

export const uploadPublicDaycareHealthDeclaration = async (req: Request, res: Response) => {
    if (!req.file) return res.status(400).json({ success: false, message: "יש לבחור PDF או צילום של ההצהרה החתומה." });
    try { return res.json({ success: true, data: await submitUploadedHealthDeclaration(req.params.token, req.file) }); }
    catch (error) { return errorResponse(res, error); }
};

export const downloadPublicDaycareHealthDeclaration = async (req: Request, res: Response) => {
    try { return sendPdf(res, await downloadHealthDeclarationForParent(req.params.token)); }
    catch (error) { return errorResponse(res, error); }
};

export const getAdminDaycareHealthDeclaration = async (req: Request, res: Response) => {
    try { return res.json({ success: true, data: await getAdminHealthDeclaration(req.params.onboardingId) }); }
    catch (error) { return errorResponse(res, error); }
};

export const reviewAdminDaycareHealthDeclaration = async (req: Request, res: Response) => {
    const status = req.body?.status;
    if (status !== "completed" && status !== "requiresCorrection") return res.status(400).json({ success: false, message: "סטטוס הבדיקה אינו תקין." });
    const correctionDisposition = req.body?.correctionDisposition;
    if (correctionDisposition !== undefined && correctionDisposition !== "preserveVersion" && correctionDisposition !== "discardFileAfterReplacement") return res.status(400).json({ success: false, message: "אופן שמירת הגרסה הקודמת אינו תקין." });
    try { return res.json({ success: true, data: await reviewHealthDeclaration(req.params.id, status, typeof req.body.parentMessage === "string" ? req.body.parentMessage : undefined, correctionDisposition) }); }
    catch (error) { return errorResponse(res, error); }
};

export const downloadAdminDaycareHealthDeclaration = async (req: Request, res: Response) => {
    try { return sendPdf(res, await downloadHealthDeclarationForAdmin(req.params.id)); }
    catch (error) { return errorResponse(res, error); }
};
