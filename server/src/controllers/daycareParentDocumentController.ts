import type { Request, Response } from "express";
import type { DaycareParentDocumentBundle, DaycareParentDocumentKey } from "../config/daycareParentDocuments";
import { DaycareOnboardingServiceError } from "../services/daycareOnboardingService";
import { createParentDocumentDownload, getCurrentParentDocumentBundle, getParentDocumentBundleForToken, listParentDocumentYearsForAdmin, saveParentDocumentYearForAdmin } from "../services/daycareParentDocumentService";
import { logger } from "../utils/logger";

const keyFrom = (value: string): DaycareParentDocumentKey | null =>
    value === "routine" || value === "holidays" || value === "menu" ? value : null;

const text = (value: unknown, max: number) => typeof value === "string" && value.trim().length > 0 && value.trim().length <= max ? value.trim() : null;
const optionalText = (value: unknown, max: number) => value === undefined || value === "" ? undefined : text(value, max);
const validSchoolYear = (value: string) => /^(\d{4})-(\d{4})$/.test(value) && Number(value.slice(5)) === Number(value.slice(0, 4)) + 1;
const parseDocuments = (value: unknown): DaycareParentDocumentBundle["documents"] | null => {
    if (!value || typeof value !== "object") return null;
    const raw = value as Record<string, unknown>;
    const routine = raw.routine as Record<string, unknown> | undefined;
    const holidays = raw.holidays as Record<string, unknown> | undefined;
    const menu = raw.menu as Record<string, unknown> | undefined;
    if (!routine || !holidays || !menu || !Array.isArray(routine.items) || !Array.isArray(holidays.items) || !Array.isArray(holidays.clarifications) || !Array.isArray(menu.items)) return null;
    const routineItems = routine.items.map((item) => item && typeof item === "object" ? { time: text((item as Record<string, unknown>).time, 40), activity: text((item as Record<string, unknown>).activity, 500) } : null);
    const holidayItems = holidays.items.map((item) => item && typeof item === "object" ? { occasion: text((item as Record<string, unknown>).occasion, 300), hebrewDate: text((item as Record<string, unknown>).hebrewDate, 200), vacationDates: text((item as Record<string, unknown>).vacationDates, 300) } : null);
    const menuItems = menu.items.map((item) => item && typeof item === "object" ? { meal: text((item as Record<string, unknown>).meal, 200), description: text((item as Record<string, unknown>).description, 1000) } : null);
    const clarifications = holidays.clarifications.map((item) => text(item, 1000));
    if (routineItems.length < 1 || routineItems.length > 50 || holidayItems.length < 1 || holidayItems.length > 100 || menuItems.length > 30 || clarifications.length > 20) return null;
    if (routineItems.some((item) => !item?.time || !item.activity) || holidayItems.some((item) => !item?.occasion || !item.hebrewDate || !item.vacationDates) || menuItems.some((item) => !item?.meal || !item.description) || clarifications.some((item) => !item)) return null;
    const routineTitle = text(routine.title, 200), routineSubtitle = text(routine.subtitle, 300), routineNote = text(routine.note, 1000);
    const holidaysTitle = text(holidays.title, 200), holidaysSubtitle = text(holidays.subtitle, 300);
    const menuTitle = text(menu.title, 200), menuSubtitle = text(menu.subtitle, 300), menuNote = optionalText(menu.note, 1000);
    if (!routineTitle || !routineSubtitle || !routineNote || !holidaysTitle || !holidaysSubtitle || !menuTitle || !menuSubtitle || menuNote === null) return null;
    return {
        routine: { key: "routine", title: routineTitle, subtitle: routineSubtitle, filename: "סדר יום מעון חבד יפו.pdf", items: routineItems as Array<{ time: string; activity: string }>, note: routineNote },
        holidays: { key: "holidays", title: holidaysTitle, subtitle: holidaysSubtitle, filename: "לוח חופשות מעון חבד יפו.pdf", items: holidayItems as Array<{ occasion: string; hebrewDate: string; vacationDates: string }>, clarifications: clarifications as string[] },
        menu: { key: "menu", title: menuTitle, subtitle: menuSubtitle, filename: "daycare-menu.pdf", items: menuItems as Array<{ meal: string; description: string }>, note: menuNote },
    };
};

const handleError = (res: Response, error: unknown) => {
    if (error instanceof DaycareOnboardingServiceError) {
        return res.status(error.statusCode).json({ success: false, code: error.code, message: error.message });
    }
    logger.error("Daycare parent document request failed", error);
    return res.status(500).json({ success: false, message: "לא הצלחנו להציג את המסמך." });
};

const sendPdf = async (res: Response, bundle: Awaited<ReturnType<typeof getParentDocumentBundleForToken>>, key: DaycareParentDocumentKey) => {
    const file = await createParentDocumentDownload(bundle, key);
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${file.filename}"`);
    res.setHeader("Cache-Control", "private, no-store");
    return res.send(file.bytes);
};

export const getCurrentParentDocuments = async (_req: Request, res: Response) => {
    try { return res.json({ success: true, data: await getCurrentParentDocumentBundle() }); }
    catch (error) { return handleError(res, error); }
};

export const downloadCurrentParentDocument = async (req: Request, res: Response) => {
    const key = keyFrom(req.params.key);
    if (!key) return res.status(404).end();
    try { return await sendPdf(res, await getCurrentParentDocumentBundle(), key); }
    catch (error) { return handleError(res, error); }
};

export const listAdminParentDocumentYears = async (_req: Request, res: Response) => {
    try { return res.json({ success: true, data: await listParentDocumentYearsForAdmin() }); }
    catch (error) { return handleError(res, error); }
};

export const saveAdminParentDocumentYear = async (req: Request, res: Response) => {
    const schoolYear = req.params.schoolYear;
    const documents = parseDocuments(req.body?.documents);
    if (!validSchoolYear(schoolYear) || !documents) return res.status(400).json({ success: false, message: "יש לבדוק את שנת הלימודים ואת תוכן המסמכים." });
    try { return res.json({ success: true, data: await saveParentDocumentYearForAdmin(schoolYear, documents) }); }
    catch (error) { return handleError(res, error); }
};

export const getParentDocumentsForToken = async (req: Request, res: Response) => {
    try { return res.json({ success: true, data: await getParentDocumentBundleForToken(req.params.token) }); }
    catch (error) { return handleError(res, error); }
};

export const downloadParentDocumentForToken = async (req: Request, res: Response) => {
    const key = keyFrom(req.params.key);
    if (!key) return res.status(404).end();
    try { return await sendPdf(res, await getParentDocumentBundleForToken(req.params.token), key); }
    catch (error) { return handleError(res, error); }
};
