import { DAYCARE_ANNUAL_PLAN_2026_2027, type DaycareAnnualPlanDocument } from "../config/daycareAnnualPlan";
import type { DaycareHolidaysDocument } from "../config/daycareParentDocuments";
import { DaycareAnnualPlan } from "../models/DaycareAnnualPlan";
import { DaycareOnboardingServiceError } from "./daycareOnboardingService";
import { createDaycareAnnualPlanPdf } from "./daycareAnnualPlanPdfService";

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const isoDate = (value: string) => {
    const match = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    return match ? `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}` : value;
};

const dto = (record: InstanceType<typeof DaycareAnnualPlan>) => ({
    schoolYear: record.schoolYear,
    key: record.key,
    title: record.title,
    schoolYearLabel: record.schoolYearLabel,
    startDate: isoDate(record.startDate),
    endDate: isoDate(record.endDate),
    filename: record.filename,
    calendar: record.calendar ? clone(record.calendar) : clone(DAYCARE_ANNUAL_PLAN_2026_2027.calendar),
    items: clone(record.items),
    sharedWithParents: Boolean(record.sharedWithParents),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
});

export const ensureDefaultDaycareAnnualPlan = async () => {
    const seed = { schoolYear: "2026-2027", ...clone(DAYCARE_ANNUAL_PLAN_2026_2027) };
    const result = await DaycareAnnualPlan.updateOne({ schoolYear: seed.schoolYear }, { $setOnInsert: seed }, { upsert: true });
    return result.upsertedCount === 1;
};

export const listDaycareAnnualPlans = async () => {
    await ensureDefaultDaycareAnnualPlan();
    return (await DaycareAnnualPlan.find().sort({ schoolYear: -1 })).map(dto);
};

export const getDaycareAnnualPlan = async (schoolYear: string) => {
    await ensureDefaultDaycareAnnualPlan();
    const record = await DaycareAnnualPlan.findOne({ schoolYear });
    if (!record) throw new DaycareOnboardingServiceError("תוכנית הלימודים לשנה המבוקשת לא נמצאה.", 404, "ANNUAL_PLAN_NOT_FOUND");
    return dto(record);
};

export const saveDaycareAnnualPlan = async (schoolYear: string, plan: DaycareAnnualPlanDocument) => {
    const record = await DaycareAnnualPlan.findOneAndUpdate(
        { schoolYear },
        { $set: plan, $setOnInsert: { schoolYear } },
        { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
    );
    return dto(record);
};

export const updateAnnualPlanSharingForAdmin = async (schoolYear: string, shared: boolean) => {
    const record = await DaycareAnnualPlan.findOneAndUpdate({ schoolYear }, { $set: { sharedWithParents: shared } }, { new: true });
    if (!record) throw new DaycareOnboardingServiceError("תוכנית הלימודים לשנה המבוקשת לא נמצאה.", 404, "ANNUAL_PLAN_NOT_FOUND");
    return dto(record);
};

export const createSharedDaycareAnnualPlanDownload = async (schoolYear: string) => {
    const record = await DaycareAnnualPlan.findOne({ schoolYear });
    if (!record || !record.sharedWithParents) throw new DaycareOnboardingServiceError("המסמך אינו משותף להורים.", 404, "ANNUAL_PLAN_NOT_SHARED");
    const plan = dto(record);
    return { bytes: await createDaycareAnnualPlanPdf(plan), mimeType: "application/pdf", filename: plan.filename };
};

export const deleteDaycareAnnualPlan = async (schoolYear: string) => {
    if (await DaycareAnnualPlan.countDocuments() <= 1) {
        throw new DaycareOnboardingServiceError("לא ניתן למחוק את התבנית היחידה. צרי תחילה שנת לימודים נוספת.", 409, "ANNUAL_PLAN_LAST_TEMPLATE");
    }
    const deleted = await DaycareAnnualPlan.findOneAndDelete({ schoolYear });
    if (!deleted) throw new DaycareOnboardingServiceError("תוכנית הלימודים לשנה המבוקשת לא נמצאה.", 404, "ANNUAL_PLAN_NOT_FOUND");
    return { schoolYear };
};

const canonicalHolidayName = (name: string) => {
    const normalized = name.replace(/[״׳'",]/g, "").trim();
    if (normalized.includes("ראש השנה")) return "ראש השנה";
    if (normalized.includes("כיפור")) return "יום הכיפורים";
    if (normalized.includes("סוכות")) return "סוכות ושמחת תורה";
    if (normalized.includes("חנוכה")) return "חנוכה";
    if (normalized.includes("פורים")) return "פורים";
    if (normalized.includes("פסח")) return "פסח";
    if (normalized.includes("עצמאות")) return "יום העצמאות";
    if (normalized.includes("לג בעומר")) return "ל״ג בעומר";
    if (normalized.includes("שבועות")) return "שבועות";
    return name.trim();
};

export const parseVacationDatesForAnnualPlan = (value: string) => {
    const datePart = value.includes(",") ? value.slice(value.lastIndexOf(",") + 1).trim() : value.trim();
    const tokens = datePart.split("-").map((token) => token.trim()).filter(Boolean);
    const end = tokens.at(-1)?.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (!end) return null;
    const endDay = Number(end[1]), endMonth = Number(end[2]), endYear = Number(end[3]);
    let startDay = endDay, startMonth = endMonth, startYear = endYear;
    if (tokens.length > 1) {
        const startParts = tokens[0].split(".").map(Number);
        if (!startParts[0]) return null;
        startDay = startParts[0];
        startMonth = startParts[1] || endMonth;
        startYear = startParts[2] || (startMonth > endMonth ? endYear - 1 : endYear);
    }
    const format = (year: number, month: number, day: number) => `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const startDate = format(startYear, startMonth, startDay), endDate = format(endYear, endMonth, endDay);
    if (Number.isNaN(Date.parse(`${startDate}T12:00:00Z`)) || Number.isNaN(Date.parse(`${endDate}T12:00:00Z`))) return null;
    return { startDate, endDate };
};

export const syncAnnualPlanWithHolidays = async (schoolYear: string, holidays: DaycareHolidaysDocument) => {
    const existing = await DaycareAnnualPlan.findOne({ schoolYear });
    if (!existing) throw new DaycareOnboardingServiceError("יש ליצור תחילה תוכנית לימודים לשנת הלימודים הזו.", 404, "ANNUAL_PLAN_NOT_FOUND");
    const vacations = holidays.items.flatMap((item) => {
        const range = parseVacationDatesForAnnualPlan(item.vacationDates);
        return range ? [{ name: canonicalHolidayName(item.occasion), ...range }] : [];
    });
    if (!vacations.length) throw new DaycareOnboardingServiceError("לא נמצאו בלוח החופשות תאריכים שניתן לסנכרן.", 400, "HOLIDAY_DATES_NOT_PARSEABLE");
    const vacationByName = new Map(vacations.map((vacation) => [vacation.name, vacation.startDate]));
    const anchors = existing.calendar.anchors.map((anchor) => ({ name: anchor.name, topics: [...anchor.topics], date: vacationByName.get(canonicalHolidayName(anchor.name)) ?? anchor.date }));
    existing.calendar.vacations = vacations;
    existing.calendar.anchors = anchors;
    await existing.save();
    return dto(existing);
};

export const createDaycareAnnualPlanDownload = async (schoolYear: string) => {
    const plan = await getDaycareAnnualPlan(schoolYear);
    return { bytes: await createDaycareAnnualPlanPdf(plan), mimeType: "application/pdf", filename: plan.filename };
};
