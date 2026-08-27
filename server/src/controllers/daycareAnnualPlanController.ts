import type { Request, Response } from "express";
import type { DaycareAnnualPlanDocument } from "../config/daycareAnnualPlan";
import { DaycareOnboardingServiceError } from "../services/daycareOnboardingService";
import { createDaycareAnnualPlanDownload, createSharedDaycareAnnualPlanDownload, deleteDaycareAnnualPlan, listDaycareAnnualPlans, saveDaycareAnnualPlan, syncAnnualPlanWithHolidays, updateAnnualPlanSharingForAdmin } from "../services/daycareAnnualPlanService";
import { getPublicOnboardingDocumentByToken } from "../services/daycareOnboardingService";
import { createDaycareAnnualPlanPdf } from "../services/daycareAnnualPlanPdfService";
import { getPublishedParentDocumentBundle } from "../services/daycareParentDocumentService";
import { inlinePdfContentDisposition } from "./daycareParentDocumentController";
import { logger } from "../utils/logger";

const text = (value: unknown, max: number) => typeof value === "string" && value.trim().length > 0 && value.trim().length <= max ? value.trim() : null;
const optionalText = (value: unknown, max: number) => value === undefined || value === "" ? undefined : text(value, max);
const dateText = (value: unknown) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`)) ? value : null;
const validSchoolYear = (value: string) => /^(\d{4})-(\d{4})$/.test(value) && Number(value.slice(5)) === Number(value.slice(0, 4)) + 1;

const parsePlan = (value: unknown): DaycareAnnualPlanDocument | null => {
    if (!value || typeof value !== "object") return null;
    const raw = value as Record<string, unknown>;
    if (!Array.isArray(raw.items) || raw.items.length < 1 || raw.items.length > 100) return null;
    const title = text(raw.title, 200), schoolYearLabel = text(raw.schoolYearLabel, 120), startDate = dateText(raw.startDate), endDate = dateText(raw.endDate);
    const calendar = raw.calendar as Record<string, unknown> | undefined;
    if (!calendar || !Array.isArray(calendar.vacations) || !Array.isArray(calendar.anchors) || !Array.isArray(calendar.specialEvents)) return null;
    const items = raw.items.map((item) => {
        if (!item || typeof item !== "object") return null;
        const row = item as Record<string, unknown>;
        const month = text(row.month, 40), dateRange = text(row.dateRange, 80), topic = text(row.topic, 500), specialEvent = optionalText(row.specialEvent, 300);
        if (!month || !dateRange || !topic || specialEvent === null) return null;
        return { month, dateRange, topic, ...(specialEvent ? { specialEvent } : {}) };
    });
    if (!title || !schoolYearLabel || !startDate || !endDate || items.some((item) => !item)) return null;
    const vacations = calendar.vacations.map((item) => {
        if (!item || typeof item !== "object") return null;
        const row = item as Record<string, unknown>;
        const name = text(row.name, 200), vacationStart = dateText(row.startDate), vacationEnd = dateText(row.endDate);
        return name && vacationStart && vacationEnd ? { name, startDate: vacationStart, endDate: vacationEnd } : null;
    });
    const anchors = calendar.anchors.map((item) => {
        if (!item || typeof item !== "object") return null;
        const row = item as Record<string, unknown>;
        const name = text(row.name, 200), date = dateText(row.date);
        const topics = Array.isArray(row.topics) ? row.topics.map((topic) => text(topic, 500)) : [];
        return name && date && topics.length && topics.every(Boolean) ? { name, date, topics: topics as string[] } : null;
    });
    const specialEvents = calendar.specialEvents.map((item) => {
        if (!item || typeof item !== "object") return null;
        const row = item as Record<string, unknown>;
        const name = text(row.name, 200), date = dateText(row.date);
        return name && date ? { name, date } : null;
    });
    if (vacations.length > 40 || anchors.length > 30 || specialEvents.length > 40 || vacations.some((item) => !item) || anchors.some((item) => !item) || specialEvents.some((item) => !item)) return null;
    return { key: "annualPlan", title, schoolYearLabel, startDate, endDate, filename: "תוכנית נושאי לימוד שנתית מעון חבד יפו.pdf", calendar: { vacations: vacations as DaycareAnnualPlanDocument["calendar"]["vacations"], anchors: anchors as DaycareAnnualPlanDocument["calendar"]["anchors"], specialEvents: specialEvents as DaycareAnnualPlanDocument["calendar"]["specialEvents"] }, items: items as DaycareAnnualPlanDocument["items"] };
};

const handleError = (res: Response, error: unknown) => {
    if (error instanceof DaycareOnboardingServiceError) return res.status(error.statusCode).json({ success: false, code: error.code, message: error.message });
    logger.error("Daycare annual plan request failed", error);
    return res.status(500).json({ success: false, message: "לא הצלחנו לעבד את תוכנית הלימודים." });
};

export const listAdminDaycareAnnualPlans = async (_req: Request, res: Response) => {
    try { return res.json({ success: true, data: await listDaycareAnnualPlans() }); }
    catch (error) { return handleError(res, error); }
};

export const saveAdminDaycareAnnualPlan = async (req: Request, res: Response) => {
    const schoolYear = req.params.schoolYear;
    const plan = parsePlan(req.body?.plan);
    if (!validSchoolYear(schoolYear) || !plan) return res.status(400).json({ success: false, message: "יש לבדוק את שנת הלימודים ואת תוכן התוכנית." });
    try { return res.json({ success: true, data: await saveDaycareAnnualPlan(schoolYear, plan) }); }
    catch (error) { return handleError(res, error); }
};

export const downloadAdminDaycareAnnualPlan = async (req: Request, res: Response) => {
    const schoolYear = req.params.schoolYear;
    if (!validSchoolYear(schoolYear)) return res.status(404).end();
    try {
        const file = await createDaycareAnnualPlanDownload(schoolYear);
        res.setHeader("Content-Type", file.mimeType);
        res.setHeader("Content-Disposition", inlinePdfContentDisposition(file.filename, `daycare-annual-plan-${schoolYear}.pdf`));
        res.setHeader("Cache-Control", "private, no-store");
        return res.send(file.bytes);
    } catch (error) { return handleError(res, error); }
};

export const previewAdminDaycareAnnualPlan = async (req: Request, res: Response) => {
    const plan = parsePlan(req.body?.plan);
    if (!plan) return res.status(400).json({ success: false, message: "יש לבדוק את תוכן התוכנית לפני הפקת התצוגה המקדימה." });
    try {
        const bytes = await createDaycareAnnualPlanPdf(plan);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", inlinePdfContentDisposition(plan.filename, "daycare-annual-plan-preview.pdf"));
        res.setHeader("Cache-Control", "private, no-store");
        return res.send(bytes);
    } catch (error) { return handleError(res, error); }
};

export const deleteAdminDaycareAnnualPlan = async (req: Request, res: Response) => {
    const schoolYear = req.params.schoolYear;
    if (!validSchoolYear(schoolYear)) return res.status(400).json({ success: false, message: "שנת הלימודים אינה תקינה." });
    try { return res.json({ success: true, data: await deleteDaycareAnnualPlan(schoolYear) }); }
    catch (error) { return handleError(res, error); }
};

export const syncAdminDaycareAnnualPlanHolidays = async (req: Request, res: Response) => {
    const schoolYear = req.params.schoolYear;
    if (!validSchoolYear(schoolYear)) return res.status(400).json({ success: false, message: "שנת הלימודים אינה תקינה." });
    try {
        const bundle = await getPublishedParentDocumentBundle(schoolYear);
        return res.json({ success: true, data: await syncAnnualPlanWithHolidays(schoolYear, bundle.documents.holidays) });
    } catch (error) { return handleError(res, error); }
};

export const updateAdminDaycareAnnualPlanSharing = async (req: Request, res: Response) => {
    const schoolYear = req.params.schoolYear;
    if (!validSchoolYear(schoolYear) || typeof req.body?.shared !== "boolean") return res.status(400).json({ success: false, message: "יש לבדוק את שנת הלימודים ואת הגדרת השיתוף." });
    try { return res.json({ success: true, data: await updateAnnualPlanSharingForAdmin(schoolYear, req.body.shared) }); }
    catch (error) { return handleError(res, error); }
};

export const downloadSharedDaycareAnnualPlanForToken = async (req: Request, res: Response) => {
    try {
        const onboarding = await getPublicOnboardingDocumentByToken(req.params.token, new Date());
        const file = await createSharedDaycareAnnualPlanDownload(onboarding.schoolYear);
        res.setHeader("Content-Type", file.mimeType);
        res.setHeader("Content-Disposition", inlinePdfContentDisposition(file.filename, "daycare-annual-plan.pdf"));
        res.setHeader("Cache-Control", "private, no-store");
        return res.send(file.bytes);
    } catch (error) { return handleError(res, error); }
};
