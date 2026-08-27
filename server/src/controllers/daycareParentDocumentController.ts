import type { Request, Response } from "express";
import { DAYCARE_EQUIPMENT_DOCUMENT, DAYCARE_WELCOME_DOCUMENT, type DaycareParentDocumentBundle, type DaycareParentDocumentKey } from "../config/daycareParentDocuments";
import { DaycareOnboardingServiceError } from "../services/daycareOnboardingService";
import { createParentDocumentDownload, getCurrentParentDocumentBundle, getParentDocumentBundleForToken, getPublishedParentDocumentBundle, getSharedParentDocumentKeys, listParentDocumentYearsForAdmin, saveParentDocumentYearForAdmin, unlockParentDocumentYearForAdmin, updateParentDocumentSharingForAdmin } from "../services/daycareParentDocumentService";
import { logger } from "../utils/logger";

const keyFrom = (value: string): DaycareParentDocumentKey | null =>
    value === "welcome" || value === "routine" || value === "holidays" || value === "menu" || value === "equipment" ? value : null;

export const parentDocumentDownloadFilename = (
    key: DaycareParentDocumentKey,
    configuredFilename: string
) => key === "welcome"
    ? "ברוכים הבאים למעון חבד יפו.pdf"
    : key === "routine"
    ? "סדר יום מעון חבד יפו.pdf"
    : key === "holidays"
        ? "לוח חופשות מעון חבד יפו.pdf"
        : key === "equipment"
            ? "ציוד אישי מה להביא למעון חבד יפו.pdf"
        : configuredFilename;

export const inlinePdfContentDisposition = (
    filename: string,
    fallbackFilename: string
) => {
    const encodedFilename = encodeURIComponent(filename).replace(
        /[!'()*]/g,
        (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`
    );
    return `inline; filename="${fallbackFilename}"; filename*=UTF-8''${encodedFilename}`;
};

const text = (value: unknown, max: number) => typeof value === "string" && value.trim().length > 0 && value.trim().length <= max ? value.trim() : null;
const optionalText = (value: unknown, max: number) => value === undefined || value === "" ? undefined : text(value, max);
const validSchoolYear = (value: string) => /^(\d{4})-(\d{4})$/.test(value) && Number(value.slice(5)) === Number(value.slice(0, 4)) + 1;
const parseDocuments = (value: unknown): DaycareParentDocumentBundle["documents"] | null => {
    if (!value || typeof value !== "object") return null;
    const raw = value as Record<string, unknown>;
    const routine = raw.routine as Record<string, unknown> | undefined;
    const holidays = raw.holidays as Record<string, unknown> | undefined;
    const menu = raw.menu as Record<string, unknown> | undefined;
    const welcome = (raw.welcome ?? DAYCARE_WELCOME_DOCUMENT) as Record<string, unknown>;
    const equipment = (raw.equipment ?? DAYCARE_EQUIPMENT_DOCUMENT) as Record<string, unknown>;
    if (!routine || !holidays || !menu || !Array.isArray(welcome.intro) || !Array.isArray(welcome.day) || !Array.isArray(welcome.parents) || !Array.isArray(welcome.join) || !Array.isArray(routine.items) || !Array.isArray(holidays.items) || !Array.isArray(holidays.clarifications) || !Array.isArray(menu.items) || !Array.isArray(equipment.items)) return null;
    const routineItems = routine.items.map((item) => item && typeof item === "object" ? { time: text((item as Record<string, unknown>).time, 40), activity: text((item as Record<string, unknown>).activity, 500) } : null);
    const holidayItems = holidays.items.map((item) => item && typeof item === "object" ? { occasion: text((item as Record<string, unknown>).occasion, 300), hebrewDate: text((item as Record<string, unknown>).hebrewDate, 200), vacationDates: text((item as Record<string, unknown>).vacationDates, 300) } : null);
    const menuItems = menu.items.map((item) => {
        if (!item || typeof item !== "object") return null;
        const rawItem = item as Record<string, unknown>;
        const day = text(rawItem.day, 200);
        const breakfast = text(rawItem.breakfast, 1000);
        const lunch = optionalText(rawItem.lunch, 1000);
        const afternoon = optionalText(rawItem.afternoon, 1000);
        if (!day || !breakfast || lunch === null || afternoon === null) return null;
        return { day, breakfast, ...(lunch ? { lunch } : {}), ...(afternoon ? { afternoon } : {}) };
    });
    const clarifications = holidays.clarifications.map((item) => text(item, 1000));
    const welcomeIntro = welcome.intro.map((item) => text(item, 2000));
    const welcomeDay = welcome.day.map((item) => text(item, 2000));
    const welcomeParents = welcome.parents.map((item) => text(item, 2000));
    const welcomeJoin = welcome.join.map((item) => text(item, 2000));
    const equipmentItems = equipment.items.map((item) => text(item, 500));
    if (welcomeIntro.length < 1 || welcomeIntro.length > 10 || welcomeDay.length < 1 || welcomeDay.length > 10 || welcomeParents.length < 1 || welcomeParents.length > 10 || welcomeJoin.length < 1 || welcomeJoin.length > 10 || routineItems.length < 1 || routineItems.length > 50 || holidayItems.length < 1 || holidayItems.length > 100 || menuItems.length > 30 || clarifications.length > 20 || equipmentItems.length < 1 || equipmentItems.length > 40) return null;
    if (welcomeIntro.some((item) => !item) || welcomeDay.some((item) => !item) || welcomeParents.some((item) => !item) || welcomeJoin.some((item) => !item) || routineItems.some((item) => !item?.time || !item.activity) || holidayItems.some((item) => !item?.occasion || !item.hebrewDate || !item.vacationDates) || menuItems.some((item) => !item?.day || !item.breakfast) || clarifications.some((item) => !item) || equipmentItems.some((item) => !item)) return null;
    const welcomeTitle = text(welcome.title, 200), welcomeSubtitle = text(welcome.subtitle, 300);
    const welcomeHours = welcome.hours as Record<string, unknown> | undefined;
    const welcomeWeekdays = text(welcomeHours?.weekdays, 200), welcomeFriday = text(welcomeHours?.friday, 200), welcomeAddress = text(welcomeHours?.address, 300);
    const welcomeContactName = text(welcome.contactName, 120), welcomeContactPhone = text(welcome.contactPhone, 40);
    const routineTitle = text(routine.title, 200), routineSubtitle = text(routine.subtitle, 300), routineNote = text(routine.note, 1000);
    const holidaysTitle = text(holidays.title, 200), holidaysSubtitle = text(holidays.subtitle, 300);
    const menuTitle = text(menu.title, 200), menuSubtitle = text(menu.subtitle, 300), menuNote = optionalText(menu.note, 1000);
    const equipmentTitle = text(equipment.title, 200), equipmentSubtitle = text(equipment.subtitle, 300), equipmentImportant = text(equipment.important, 1000), equipmentNote = text(equipment.note, 2000);
    if (!welcomeTitle || !welcomeSubtitle || !welcomeWeekdays || !welcomeFriday || !welcomeAddress || !welcomeContactName || !welcomeContactPhone || !routineTitle || !routineSubtitle || !routineNote || !holidaysTitle || !holidaysSubtitle || !menuTitle || !menuSubtitle || menuNote === null || !equipmentTitle || !equipmentSubtitle || !equipmentImportant || !equipmentNote) return null;
    return {
        welcome: {
            key: "welcome",
            title: welcomeTitle,
            subtitle: welcomeSubtitle,
            filename: "ברוכים הבאים למעון חבד יפו.pdf",
            intro: welcomeIntro as string[],
            hours: { weekdays: welcomeWeekdays, friday: welcomeFriday, address: welcomeAddress },
            day: welcomeDay as string[],
            parents: welcomeParents as string[],
            join: welcomeJoin as string[],
            contactName: welcomeContactName,
            contactPhone: welcomeContactPhone,
        },
        routine: { key: "routine", title: routineTitle, subtitle: routineSubtitle, filename: "סדר יום מעון חבד יפו.pdf", items: routineItems as Array<{ time: string; activity: string }>, note: routineNote },
        holidays: { key: "holidays", title: holidaysTitle, subtitle: holidaysSubtitle, filename: "לוח חופשות מעון חבד יפו.pdf", items: holidayItems as Array<{ occasion: string; hebrewDate: string; vacationDates: string }>, clarifications: clarifications as string[] },
        menu: { key: "menu", title: menuTitle, subtitle: menuSubtitle, filename: "daycare-menu.pdf", items: menuItems as Array<{ day: string; breakfast: string; lunch?: string; afternoon?: string }>, note: menuNote },
        equipment: { key: "equipment", title: equipmentTitle, subtitle: equipmentSubtitle, filename: "ציוד אישי מה להביא למעון חבד יפו.pdf", items: equipmentItems as string[], important: equipmentImportant, note: equipmentNote },
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
    const downloadFilename = parentDocumentDownloadFilename(key, file.filename);
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader(
        "Content-Disposition",
        inlinePdfContentDisposition(downloadFilename, `daycare-${key}.pdf`)
    );
    res.setHeader("Cache-Control", "private, no-store");
    return res.send(file.bytes);
};

export const getCurrentParentDocuments = async (_req: Request, res: Response) => {
    try {
        const bundle = await getCurrentParentDocumentBundle();
        const sharedDocumentKeys = await getSharedParentDocumentKeys(bundle.schoolYear);
        const documents = Object.fromEntries(sharedDocumentKeys.map((key) => [key, bundle.documents[key]]));
        return res.json({ success: true, data: { version: bundle.version, schoolYear: bundle.schoolYear, sharedDocumentKeys, documents } });
    }
    catch (error) { return handleError(res, error); }
};

export const downloadCurrentParentDocument = async (req: Request, res: Response) => {
    const key = keyFrom(req.params.key);
    if (!key) return res.status(404).end();
    try {
        const bundle = await getCurrentParentDocumentBundle();
        const sharedKeys = await getSharedParentDocumentKeys(bundle.schoolYear);
        if (!sharedKeys.includes(key)) return res.status(404).json({ success: false, message: "המסמך אינו משותף להורים." });
        return await sendPdf(res, bundle, key);
    }
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

export const unlockAdminParentDocumentYear = async (req: Request, res: Response) => {
    const schoolYear = req.params.schoolYear;
    if (!validSchoolYear(schoolYear)) return res.status(400).json({ success: false, message: "שנת הלימודים אינה תקינה." });
    try { return res.json({ success: true, data: await unlockParentDocumentYearForAdmin(schoolYear) }); }
    catch (error) { return handleError(res, error); }
};

export const getParentDocumentsForToken = async (req: Request, res: Response) => {
    try {
        const bundle = await getParentDocumentBundleForToken(req.params.token);
        return res.json({ success: true, data: { version: bundle.version, schoolYear: bundle.schoolYear, sharedDocumentKeys: await getSharedParentDocumentKeys(bundle.schoolYear) } });
    }
    catch (error) { return handleError(res, error); }
};

export const downloadParentDocumentForToken = async (req: Request, res: Response) => {
    const key = keyFrom(req.params.key);
    if (!key) return res.status(404).end();
    try {
        const bundle = await getParentDocumentBundleForToken(req.params.token);
        const sharedKeys = await getSharedParentDocumentKeys(bundle.schoolYear);
        if (!sharedKeys.includes(key)) return res.status(404).json({ success: false, message: "המסמך אינו משותף להורים." });
        return await sendPdf(res, bundle, key);
    }
    catch (error) { return handleError(res, error); }
};

export const updateAdminParentDocumentSharing = async (req: Request, res: Response) => {
    const schoolYear = req.params.schoolYear;
    const key = keyFrom(req.params.key);
    if (!validSchoolYear(schoolYear) || !key || typeof req.body?.shared !== "boolean") return res.status(400).json({ success: false, message: "יש לבדוק את המסמך ואת הגדרת השיתוף." });
    try { return res.json({ success: true, data: await updateParentDocumentSharingForAdmin(schoolYear, key, req.body.shared) }); }
    catch (error) { return handleError(res, error); }
};

export const downloadAdminParentDocument = async (req: Request, res: Response) => {
    const schoolYear = req.params.schoolYear;
    const key = keyFrom(req.params.key);
    if (!validSchoolYear(schoolYear) || !key) return res.status(404).end();
    try { return await sendPdf(res, await getPublishedParentDocumentBundle(schoolYear), key); }
    catch (error) { return handleError(res, error); }
};
