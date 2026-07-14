import type { Request, Response } from "express";
import { DaycareOnboardingServiceError } from "../services/daycareOnboardingService";
import {
    createAgreementDraft,
    downloadAgreementFileForAdmin,
    downloadAgreementPdfForParent,
    downloadSignedAgreementForParent,
    getAgreementByOnboardingForAdmin,
    getPublicAgreement,
    listAgreementVersions,
    publishAgreementDraft,
    reviewAgreement,
    submitOnlineAgreement,
    submitSignedAgreementPdf,
    updateAgreementDraft,
} from "../services/daycareAgreementService";
import { logger } from "../utils/logger";
import type { IDaycareDocumentBlock, IDaycareDocumentSection, IDaycareStructuredDocument } from "../types/daycareAgreement";

const errorResponse = (res: Response, error: unknown) => {
    if (error instanceof DaycareOnboardingServiceError) {
        return res.status(error.statusCode).json({ success: false, code: error.code, message: error.message });
    }
    logger.error("Daycare agreement request failed", error);
    return res.status(500).json({ success: false, message: "לא הצלחנו לבצע את הפעולה." });
};

const validText = (value: unknown, max: number) => typeof value === "string" && value.trim().length > 0 && value.trim().length <= max;
const validSchoolYear = (value: unknown) => typeof value === "string" && /^(\d{4})-(\d{4})$/.test(value) && Number(value.slice(5)) === Number(value.slice(0, 4)) + 1;
const parseStructuredDocument = (value: unknown): IDaycareStructuredDocument | null => {
    if (!value || typeof value !== "object") return null;
    const raw = value as Record<string, unknown>;
    if (raw.format !== "structured-v1" || !validText(raw.title, 240) || (raw.subtitle !== undefined && typeof raw.subtitle !== "string")) return null;
    if (!Array.isArray(raw.intro) || !Array.isArray(raw.sections) || raw.sections.length < 1 || raw.sections.length > 100) return null;
    const ids = new Set<string>();
    const takeId = (id: unknown) => typeof id === "string" && /^[a-z0-9][a-z0-9-]{1,99}$/.test(id) && !ids.has(id) && Boolean(ids.add(id));
    const parseBlock = (block: unknown): IDaycareDocumentBlock | null => {
        if (!block || typeof block !== "object") return null;
        const item = block as Record<string, unknown>;
        if (!takeId(item.id) || !["paragraph", "bulletList", "numberedList"].includes(String(item.type))) return null;
        if (item.type === "paragraph") return validText(item.text, 50000) ? { id: String(item.id), type: "paragraph", text: String(item.text).trim() } : null;
        if (!Array.isArray(item.items) || item.items.length < 1 || item.items.length > 100) return null;
        const items = item.items.map(entry => {
            if (!entry || typeof entry !== "object") return null;
            const listItem = entry as Record<string, unknown>;
            return takeId(listItem.id) && validText(listItem.text, 5000) ? { id: String(listItem.id), text: String(listItem.text).trim() } : null;
        });
        if (items.some(entry => !entry)) return null;
        return { id: String(item.id), type: item.type as "bulletList" | "numberedList", items: items as Array<{ id: string; text: string }> };
    };
    const intro = raw.intro.map(parseBlock);
    if (intro.some(block => !block)) return null;
    const sections = raw.sections.map(sectionValue => {
        if (!sectionValue || typeof sectionValue !== "object") return null;
        const section = sectionValue as Record<string, unknown>;
        if (!takeId(section.id) || !validText(section.title, 500) || !Array.isArray(section.blocks) || section.blocks.length < 1) return null;
        const blocks = section.blocks.map(parseBlock);
        return blocks.some(block => !block) ? null : { id: String(section.id), title: String(section.title).trim(), blocks: blocks as IDaycareDocumentBlock[] };
    });
    if (sections.some(section => !section)) return null;
    return { format: "structured-v1", title: String(raw.title).trim(), subtitle: typeof raw.subtitle === "string" ? raw.subtitle.trim() || undefined : undefined, intro: intro as IDaycareDocumentBlock[], sections: sections as IDaycareDocumentSection[] };
};

export const listAdminAgreementVersions = async (_req: Request, res: Response) => {
    try { return res.json({ success: true, data: await listAgreementVersions() }); } catch (error) { return errorResponse(res, error); }
};

export const getAdminAgreementByOnboarding = async (req: Request, res: Response) => {
    try { return res.json({ success: true, data: await getAgreementByOnboardingForAdmin(req.params.onboardingId) }); } catch (error) { return errorResponse(res, error); }
};

export const createAdminAgreementDraft = async (req: Request, res: Response) => {
    const { version, schoolYear, document } = req.body as Record<string, unknown>;
    const parsed = parseStructuredDocument(document);
    if (!validText(version, 60) || !validSchoolYear(schoolYear) || !parsed) return res.status(400).json({ success: false, message: "מבנה ההסכם אינו תקין." });
    try { return res.status(201).json({ success: true, data: await createAgreementDraft({ version: String(version).trim(), schoolYear: String(schoolYear).trim(), document: parsed }) }); } catch (error) { return errorResponse(res, error); }
};

export const patchAdminAgreementDraft = async (req: Request, res: Response) => {
    const parsed = parseStructuredDocument(req.body?.document);
    if (!parsed) return res.status(400).json({ success: false, message: "מבנה ההסכם אינו תקין." });
    try { return res.json({ success: true, data: await updateAgreementDraft(req.params.id, parsed) }); } catch (error) { return errorResponse(res, error); }
};

export const publishAdminAgreementDraft = async (req: Request, res: Response) => {
    try { return res.json({ success: true, data: await publishAgreementDraft(req.params.id, req.body?.legalReviewConfirmed === true) }); } catch (error) { return errorResponse(res, error); }
};

export const getPublicDaycareAgreement = async (req: Request, res: Response) => {
    try { return res.json({ success: true, data: await getPublicAgreement(req.params.token) }); } catch (error) { return errorResponse(res, error); }
};

export const downloadPublicDaycareAgreementPdf = async (req: Request, res: Response) => {
    try {
        const file = await downloadAgreementPdfForParent(req.params.token);
        res.setHeader("Content-Type", file.mimeType);
        res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
        res.setHeader("Cache-Control", "no-store, private");
        return res.send(file.bytes);
    } catch (error) { return errorResponse(res, error); }
};

export const signPublicDaycareAgreement = async (req: Request, res: Response) => {
    if (!req.file) return res.status(400).json({ success: false, message: "נדרשת חתימה מצוירת." });
    try {
        const data = await submitOnlineAgreement(req.params.token, {
            signedBy: String(req.body.signedBy ?? ""),
            signerRole: String(req.body.signerRole ?? ""),
            signerIsraeliId: String(req.body.signerIsraeliId ?? ""),
            acceptedTerms: req.body.acceptedTerms === "true",
            ipAddress: req.ip || req.socket.remoteAddress || "unknown",
            userAgent: String(req.get("user-agent") ?? "unknown"),
            signature: req.file,
        });
        return res.json({ success: true, data });
    } catch (error) { return errorResponse(res, error); }
};

export const downloadPublicSignedAgreement = async (req: Request, res: Response) => {
    try {
        const file = await downloadSignedAgreementForParent(req.params.token);
        res.setHeader("Content-Type", file.mimeType);
        res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
        res.setHeader("Cache-Control", "no-store, private");
        return res.send(file.bytes);
    } catch (error) { return errorResponse(res, error); }
};

export const uploadPublicSignedAgreement = async (req: Request, res: Response) => {
    if (!req.file) return res.status(400).json({ success: false, message: "יש לבחור קובץ PDF חתום." });
    try { return res.json({ success: true, data: await submitSignedAgreementPdf(req.params.token, req.file) }); } catch (error) { return errorResponse(res, error); }
};

export const reviewAdminAgreement = async (req: Request, res: Response) => {
    const status = req.body?.status;
    if (status !== "completed" && status !== "requiresCorrection") return res.status(400).json({ success: false, message: "סטטוס הבדיקה אינו תקין." });
    try { return res.json({ success: true, data: await reviewAgreement(req.params.id, { status, parentMessage: typeof req.body.parentMessage === "string" ? req.body.parentMessage : undefined }) }); } catch (error) { return errorResponse(res, error); }
};

export const downloadAdminAgreementFile = async (req: Request, res: Response) => {
    const kind = req.params.kind === "signature" ? "signature" : req.params.kind === "signedPdf" ? "signedPdf" : null;
    if (!kind) return res.status(404).end();
    try {
        const file = await downloadAgreementFileForAdmin(req.params.id, kind);
        res.setHeader("Content-Type", file.mimeType);
        res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
        res.setHeader("Cache-Control", "no-store");
        return res.send(file.bytes);
    } catch (error) { return errorResponse(res, error); }
};
