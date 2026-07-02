import { Router } from "express";
import { DaycareDocument } from "../models/DaycareDocument";
import { DaycareFinanceSettings } from "../models/DaycareFinanceSettings";
import { DaycareLead } from "../models/DaycareLead";
import { DaycareRegistration } from "../models/DaycareRegistration";
import { DaycareTask } from "../models/DaycareTask";
import { Family } from "../models/Family";
import { FinanceEntryModel } from "../models/FinanceEntry";
import { requireAdmin } from "../middleware/adminAuth";
import {
    getAllPayments,
    getAllRebbeLetters,
    isValidRebbeLetterStatus,
    updateRebbeLetterStatus,
} from "../services/adminService";
import type {
    IDaycareDocument,
    IDaycareFinanceSettings,
    IDaycareTask,
} from "../types/daycareAdmin";
import type { FinanceEntry } from "../types/financeEntry";

const router = Router();

const openingTargetChildren = 6;
const laborDaycareSearchUrl =
    "https://www.gov.il/he/search?query=%D7%9E%D7%A2%D7%95%D7%A0%D7%95%D7%AA%20%D7%99%D7%95%D7%9D%20%D7%9C%D7%A4%D7%A2%D7%95%D7%98%D7%95%D7%AA%20%D7%A8%D7%99%D7%A9%D7%99%D7%95%D7%9F";
const fireSafetySearchUrl =
    "https://www.gov.il/he/search?query=%D7%90%D7%99%D7%A9%D7%95%D7%A8%20%D7%9B%D7%91%D7%90%D7%95%D7%AA%20%D7%9C%D7%A2%D7%A1%D7%A7";
const telAvivPlanningUrl = "https://www.tel-aviv.gov.il/";
const nationalFormsSearchUrl =
    "https://www.gov.il/he/search?query=%D7%9E%D7%A2%D7%95%D7%9F%20%D7%99%D7%95%D7%9D%20%D7%98%D7%95%D7%A4%D7%A1";

const defaultDaycareTasks: IDaycareTask[] = [
    { title: "בירור מסגרת חוקית לפתיחה קטנה עם 6 ילדים", category: "אישורים", status: "לא התחיל", priority: "דחופה", stage: "עכשיו", notes: "חובה לפתיחה | לוודא מה מותר ומה צריך לבדוק לפני פרסום", resourceLabel: "חיפוש רישוי מעונות", resourceUrl: laborDaycareSearchUrl },
    { title: "סגירת חוזה / אישור שימוש במבנה", category: "אישורים", status: "בטיפול", priority: "דחופה", stage: "עכשיו", notes: "חובה לפתיחה | לבדוק שהשימוש כמעון קטן אפשרי מול בעל המקום/העירייה", resourceLabel: "עיריית תל אביב-יפו", resourceUrl: telAvivPlanningUrl },
    { title: "בדיקת התאמת המבנה לפתיחה עם 6 ילדים", category: "תכנון", status: "לא התחיל", priority: "דחופה", stage: "השבוע", notes: "חובה לפתיחה | חלל, מטבח, שירותים, חצר וגישה בטוחה", resourceLabel: "חיפוש הנחיות רישוי", resourceUrl: laborDaycareSearchUrl },
    { title: "קביעת שעות פעילות ומחיר להורים", category: "תכנון", status: "לא התחיל", priority: "דחופה", stage: "עכשיו", notes: "חובה לפני הרשמות | בסיס להצעה להורים ולמצב הכספי בפועל" },
    { title: "מטבח - המשך עבודה מול הנגר לאחר מדידות", category: "שיפוץ", status: "בטיפול", priority: "דחופה", stage: "השבוע", notes: "חובה לפתיחה | השבוע" },
    { title: "חיפוי קרמיקות למטבח", category: "שיפוץ", status: "לא התחיל", priority: "דחופה", stage: "השבוע", notes: "חובה לפתיחה | לפני סגירת המטבח" },
    { title: "גבס לתקרה", category: "שיפוץ", status: "לא התחיל", priority: "דחופה", stage: "השבוע", notes: "חובה לפתיחה | לפני צבע" },
    { title: "צבע לחלל המעון", category: "שיפוץ", status: "לא התחיל", priority: "רגילה", stage: "לפני פתיחה", notes: "חשוב לפני פתיחה | אחרי גבס וקירות" },
    { title: "בניית קיר בין המטבח לחלל הגדול", category: "שיפוץ", status: "לא התחיל", priority: "דחופה", stage: "השבוע", notes: "חובה לפתיחה | הפרדה בין אזור מטבח לילדים" },
    { title: "לסדר חצרות", category: "שיפוץ", status: "לא התחיל", priority: "דחופה", stage: "השבוע", notes: "חובה לפתיחה | ניקיון, מפגעים, הצללה ומשחק בטוח" },
    { title: "בדיקת מפגעים בקירות ובחלל המעון", category: "בטיחות", status: "לא התחיל", priority: "דחופה", stage: "לפני פתיחה", notes: "חובה לפתיחה | שקעים, פינות חדות, קירות, רצפה, דלתות וחלונות" },
    { title: "בדיקת חצר: גידור, שער ומפגעים", category: "בטיחות", status: "לא התחיל", priority: "דחופה", stage: "לפני פתיחה", notes: "חובה לפתיחה | לפני שמזמינים משפחות לראות", resourceLabel: "חיפוש הנחיות בטיחות", resourceUrl: nationalFormsSearchUrl },
    { title: "בירור צורך באישור כיבוי אש", category: "בטיחות", status: "לא התחיל", priority: "רגילה", stage: "לפני פתיחה", notes: "חשוב לפני פתיחה | קודם לברר אם נדרש במסגרת קטנה", resourceLabel: "חיפוש אישור כבאות", resourceUrl: fireSafetySearchUrl },
    { title: "סגירת ביטוח צד ג׳ ואחריות מקצועית", category: "אישורים", status: "לא התחיל", priority: "דחופה", stage: "לפני פתיחה", notes: "חובה לפתיחה | לפני כניסת ילדים" },
    { title: "גיוס / סגירת מטפלת לפתיחה", category: "כוח אדם", status: "לא התחיל", priority: "דחופה", stage: "עכשיו", notes: "חובה לפתיחה | את מנהלת את המעון, צריך לסגור מטפלת נוספת" },
    { title: "הכנת רשימת ציוד מינימלית לפתיחה", category: "ציוד", status: "לא התחיל", priority: "רגילה", stage: "לפני פתיחה", notes: "חשוב לפני קניות | להפריד חובה לפתיחה מול אפשר אחרי פתיחה" },
    { title: "רכישת ציוד חובה: מזרנים / לולים / משחקים בסיסיים", category: "ציוד", status: "לא התחיל", priority: "רגילה", stage: "לפני פתיחה", notes: "חשוב לפני פתיחה | לבצע אחרי רשימת ציוד" },
    { title: "הכנת דף מידע להורים", category: "שיווק", status: "לא התחיל", priority: "דחופה", stage: "עכשיו", notes: "חובה לפני פרסום | מחיר, שעות, גילאים, תאריך יעד ויצירת קשר" },
    { title: "פרסום ראשון ואיסוף מתעניינים", category: "שיווק", status: "לא התחיל", priority: "דחופה", stage: "עכשיו", notes: "חובה עכשיו | אין עדיין משפחות, זו משימה מרכזית" },
    { title: "הכנת יום פתוח / ביקור הורים", category: "שיווק", status: "לא התחיל", priority: "רגילה", stage: "לפני פתיחה", notes: "חשוב אחרי שיש חלל מסודר ואפשר להראות מקום" },
    { title: "מעקב אחרי משפחות מתעניינות", category: "הרשמות", status: "לא התחיל", priority: "דחופה", stage: "עכשיו", notes: "חובה עכשיו | לתעד כל פנייה ולחזור בזמן" },
    { title: "הכנת טופס הרשמה וחוזה הורים לפתיחה", category: "הרשמות", status: "לא התחיל", priority: "דחופה", stage: "לפני פתיחה", notes: "חובה לפני הרשמה סופית | לא חוזה הרחבה", resourceLabel: "חיפוש טפסים", resourceUrl: nationalFormsSearchUrl },
    { title: "הגדרת תהליך גביית תשלום חודשי", category: "הרשמות", status: "לא התחיל", priority: "רגילה", stage: "לפני פתיחה", notes: "חשוב לפני הרשמה סופית | אמצעי תשלום, מועד חיוב וביטול" },
    { title: "מעקב התרחבות מעל 6 ילדים - בירור דרישות", category: "אישורים", status: "לא התחיל", priority: "נמוכה", stage: "התרחבות", notes: "מעקב בלבד | לא דחוף לפני שיש כיוון ל־6 ילדים", resourceLabel: "חיפוש רישוי מעונות", resourceUrl: laborDaycareSearchUrl },
];

const obsoleteDefaultTaskTitles = [
    "מדידת שטח המבנה והחצר",
    "הכנת שרטוט בסיסי",
    "בירור דרישות להגדלה מעל 7 ילדים",
    "בדיקת צורך ברישוי / שימוש חורג",
    "סיום שיפוץ החצר",
    "סידור קירות והסרת מפגעים",
    "גידור ושער בטיחות",
    "בדיקת כיבוי אש",
    "בדיקת בטיחות",
    "ביטוח צד ג׳ ואחריות מקצועית",
    "גיוס מנהלת",
    "גיוס מטפלת",
    "הכנת רשימת ציוד",
    "רכישת מזרנים / לולים / משחקים",
    "הכנת יום פתוח",
    "בדיקת מוכנות לרישוי מעל 6 ילדים",
    "אישור תקן כוח אדם להתרחבות",
    "עדכון ביטוחים להגדלת מספר הילדים",
    "הכנת חוזי הורים למספר ילדים מוגדל",
    "הגדרת מעקב תשלומים חודשי",
];

const defaultDaycareDocuments: IDaycareDocument[] = [
    { name: "רישוי / בדיקת צורך ברישוי", status: "חסר", fileUrl: laborDaycareSearchUrl },
    { name: "בטיחות", status: "חסר", fileUrl: nationalFormsSearchUrl },
    { name: "כיבוי אש", status: "חסר", fileUrl: fireSafetySearchUrl },
    { name: "ביטוח", status: "חסר" },
    { name: "חוזה שכירות", status: "חסר" },
    { name: "חוזה הורים", status: "חסר" },
    { name: "טופס הרשמה", status: "חסר", fileUrl: nationalFormsSearchUrl },
    { name: "אישורי צוות", status: "חסר" },
    { name: "עזרה ראשונה", status: "חסר" },
    { name: "תיק התרחבות מעל 6 ילדים", status: "חסר", fileUrl: laborDaycareSearchUrl },
    { name: "מעקב תשלומים", status: "חסר" },
];

const defaultFinanceSettings: IDaycareFinanceSettings = {
    pricePerChild: 4500,
    currentChildren: 6,
    targetChildren: 10,
    rent: 0,
    directorSalary: 0,
    staffSalaries: 0,
    food: 0,
    supplies: 0,
    insuranceAndPermits: 0,
    extraExpenses: 0,
};

const getTaskDefaultUpdatePayload = (task: IDaycareTask) => {
    const payload: Partial<IDaycareTask> = {};

    if (task.resourceLabel) {
        payload.resourceLabel = task.resourceLabel;
    }

    if (task.resourceUrl) {
        payload.resourceUrl = task.resourceUrl;
    }

    if (task.notes) {
        payload.notes = task.notes;
    }

    if (task.stage) {
        payload.stage = task.stage;
    }

    return payload;
};

const ensureDefaultTasks = async () => {
    await DaycareTask.deleteMany({
        title: { $in: obsoleteDefaultTaskTitles },
        status: "לא התחיל",
    });

    const existingTasks = await DaycareTask.find().select("title");
    const existingTitles = new Set(existingTasks.map((task) => task.title));
    const missingTasks = defaultDaycareTasks.filter(
        (task) => !existingTitles.has(task.title)
    );

    if (missingTasks.length > 0) {
        await DaycareTask.insertMany(missingTasks);
    }

    await Promise.all(
        defaultDaycareTasks
            .filter((task) => task.resourceUrl || task.notes)
            .map((task) =>
                DaycareTask.updateOne(
                    {
                        title: task.title,
                        $or: [
                            { resourceUrl: { $exists: false } },
                            { resourceUrl: "" },
                            { notes: { $exists: false } },
                            { notes: "" },
                            { stage: { $exists: false } },
                        ],
                    },
                    {
                        $set: getTaskDefaultUpdatePayload(task),
                    }
                )
            )
    );
};

const ensureDefaultDocuments = async () => {
    const existingDocuments = await DaycareDocument.find().select("name");
    const existingNames = new Set(
        existingDocuments.map((document) => document.name)
    );
    const missingDocuments = defaultDaycareDocuments.filter(
        (document) => !existingNames.has(document.name)
    );

    if (missingDocuments.length > 0) {
        await DaycareDocument.insertMany(missingDocuments);
    }

    await Promise.all(
        defaultDaycareDocuments
            .filter((document) => document.fileUrl)
            .map((document) =>
                DaycareDocument.updateOne(
                    {
                        name: document.name,
                        $or: [
                            { fileUrl: { $exists: false } },
                            { fileUrl: "" },
                        ],
                    },
                    {
                        $set: {
                            fileUrl: document.fileUrl,
                        },
                    }
                )
            )
    );
};

const getFinanceSettings = async () => {
    const existingSettings = await DaycareFinanceSettings.findOne();

    if (existingSettings) {
        return existingSettings;
    }

    return DaycareFinanceSettings.create(defaultFinanceSettings);
};

const getUpcomingSeptemberLabel = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const september = new Date(currentYear, 8, 1);
    const openingYear = now <= september ? currentYear : currentYear + 1;

    return `ספטמבר ${openingYear}`;
};

const getGeneralStatus = (
    actualRegistrations: number,
    openTasks: number,
    urgentOpenTasks: number
) => {
    if (actualRegistrations >= openingTargetChildren && openTasks === 0) {
        return "מוכן לפתיחה";
    }

    if (urgentOpenTasks > 0 || actualRegistrations < openingTargetChildren) {
        return "דורש טיפול";
    }

    return "בהכנה";
};

const getDocumentReady = (
    documents: Array<{ name: string; status: string }>,
    patterns: string[]
) => {
    return documents.some((document) => {
        const matchesName = patterns.some((pattern) =>
            document.name.includes(pattern)
        );

        return matchesName && document.status === "קיים";
    });
};

const getTaskReady = (
    tasks: Array<{ title: string; category: string; status: string }>,
    patterns: string[],
    categories: string[] = []
) => {
    return tasks.some((task) => {
        const matchesTitle = patterns.some((pattern) =>
            task.title.includes(pattern)
        );
        const matchesCategory =
            categories.length === 0 || categories.includes(task.category);

        return matchesCategory && matchesTitle && task.status === "הושלם";
    });
};

const getFinanceUpdatePayload = (body: Partial<IDaycareFinanceSettings>) => ({
    pricePerChild: body.pricePerChild,
    currentChildren: body.currentChildren,
    targetChildren: body.targetChildren,
    rent: body.rent,
    directorSalary: body.directorSalary,
    staffSalaries: body.staffSalaries,
    food: body.food,
    supplies: body.supplies,
    insuranceAndPermits: body.insuranceAndPermits,
    extraExpenses: body.extraExpenses,
});

const getFinanceEntryPayload = (body: Record<string, unknown>): FinanceEntry => ({
    type: body.type === "income" ? "income" : "expense",
    source:
        typeof body.source === "string" &&
        ["cash", "bit", "credit", "bank"].includes(body.source)
            ? (body.source as "cash" | "bit" | "credit" | "bank")
            : "cash",
    category: String(body.category || "כללי"),
    title: String(body.title || ""),
    amount: Number(body.amount),
    occurredAt: new Date(),
    donorName: String(body.donorName || ""),
    notes: String(body.notes || ""),
});

const getMonthRange = (month?: unknown) => {
    if (typeof month !== "string" || !/^\d{4}-\d{2}$/.test(month)) {
        return null;
    }

    const [year, monthNumber] = month.split("-").map(Number);
    const start = new Date(year, monthNumber - 1, 1);
    const end = new Date(year, monthNumber, 1);

    return { start, end };
};

const getWebsitePaymentTitle = (payment: {
    FirstName?: string;
    LastName?: string;
    PaymentType?: string;
}) => {
    const donorName = [payment.FirstName, payment.LastName]
        .filter(Boolean)
        .join(" ");
    const paymentType =
        payment.PaymentType === "HK" ? "הוראת קבע באתר" : "תרומה באתר";

    return donorName ? `${paymentType} - ${donorName}` : paymentType;
};

const getFinanceSummary = (
    entries: Array<{ type: "income" | "expense"; amount: number }>
) => {
    const income = entries
        .filter((entry) => entry.type === "income")
        .reduce((total, entry) => total + entry.amount, 0);
    const expenses = entries
        .filter((entry) => entry.type === "expense")
        .reduce((total, entry) => total + entry.amount, 0);

    return {
        income,
        expenses,
        balance: income - expenses,
    };
};

const getCategorySummary = (
    entries: Array<{
        type: "income" | "expense";
        category?: string;
        amount: number;
    }>
) => {
    const summaryByCategory = new Map<
        string,
        { category: string; income: number; expenses: number; balance: number }
    >();

    entries.forEach((entry) => {
        const category = entry.category || "כללי";
        const current = summaryByCategory.get(category) || {
            category,
            income: 0,
            expenses: 0,
            balance: 0,
        };

        if (entry.type === "income") {
            current.income += entry.amount;
        } else {
            current.expenses += entry.amount;
        }

        current.balance = current.income - current.expenses;
        summaryByCategory.set(category, current);
    });

    return Array.from(summaryByCategory.values()).sort(
        (categoryA, categoryB) =>
            categoryB.income +
            categoryB.expenses -
            (categoryA.income + categoryA.expenses)
    );
};

router.get("/families", requireAdmin, async (_req, res) => {
    try {
        const families = await Family.find().sort({ createdAt: -1 });

        return res.json({
            success: true,
            data: families,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to get families",
        });
    }
});

router.get("/daycare-registrations", requireAdmin, async (_req, res) => {
    try {
        const registrations = await DaycareRegistration.find().sort({
            createdAt: -1,
        });

        return res.json({
            success: true,
            data: registrations,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to get daycare registrations",
        });
    }
});

router.get("/daycare/overview", requireAdmin, async (_req, res) => {
    try {
        await Promise.all([ensureDefaultTasks(), ensureDefaultDocuments()]);

        const [
            publicRegisteredCount,
            publicInterestedCount,
            registeredLeadCount,
            interestedLeadCount,
            openTasks,
            completedTasks,
            urgentOpenTasks,
            tasks,
            documents,
            financeSettings,
        ] = await Promise.all([
            DaycareRegistration.countDocuments({ status: "נרשם" }),
            DaycareRegistration.countDocuments({
                $or: [{ status: { $ne: "נרשם" } }, { status: { $exists: false } }],
            }),
            DaycareLead.countDocuments({ status: "נרשם" }),
            DaycareLead.countDocuments({ status: { $ne: "נרשם" } }),
            DaycareTask.countDocuments({ status: { $ne: "הושלם" } }),
            DaycareTask.countDocuments({ status: "הושלם" }),
            DaycareTask.countDocuments({
                status: { $ne: "הושלם" },
                priority: "דחופה",
            }),
            DaycareTask.find().select("title category status"),
            DaycareDocument.find().select("name status"),
            getFinanceSettings(),
        ]);

        const actualRegistrations = publicRegisteredCount + registeredLeadCount;
        const interestedCount = publicInterestedCount + interestedLeadCount;
        const trackedChildren = Math.max(
            actualRegistrations,
            financeSettings.currentChildren
        );
        const expansionAlertActive = trackedChildren >= 7;
        const expansionItems = [
            {
                key: "licensing",
                label: "מוכנות לרישוי",
                ready:
                    getDocumentReady(documents, ["רישוי", "תיק התרחבות"]) ||
                    getTaskReady(tasks, ["רישוי", "מעל 6", "מעל 7"], ["אישורים"]),
            },
            {
                key: "staffing",
                label: "כוח אדם",
                ready: getTaskReady(tasks, ["גיוס", "תקן", "כוח אדם"], [
                    "כוח אדם",
                ]),
            },
            {
                key: "insurance",
                label: "ביטוחים",
                ready: getDocumentReady(documents, ["ביטוח"]),
            },
            {
                key: "documents",
                label: "מסמכים",
                ready:
                    getDocumentReady(documents, ["טופס הרשמה", "אישורי צוות"]) &&
                    getDocumentReady(documents, ["בטיחות", "כיבוי אש"]),
            },
            {
                key: "parentContracts",
                label: "חוזי הורים",
                ready: getDocumentReady(documents, ["חוזה הורים"]),
            },
            {
                key: "payments",
                label: "תשלומים",
                ready:
                    financeSettings.pricePerChild > 0 &&
                    getDocumentReady(documents, ["מעקב תשלומים"]),
            },
        ];
        const readyExpansionItems = expansionItems.filter((item) => item.ready)
            .length;

        return res.json({
            success: true,
            data: {
                openingTargetChildren,
                actualRegistrations,
                interestedCount,
                openTasks,
                completedTasks,
                generalStatus: getGeneralStatus(
                    actualRegistrations,
                    openTasks,
                    urgentOpenTasks
                ),
                targetOpeningDate: getUpcomingSeptemberLabel(),
                linkedPublicRegistrations:
                    publicRegisteredCount + publicInterestedCount,
                expansion: {
                    thresholdChildren: 7,
                    trackedChildren,
                    alertActive: expansionAlertActive,
                    status:
                        readyExpansionItems === expansionItems.length
                            ? "מוכן להתרחבות"
                            : expansionAlertActive
                              ? "דורש טיפול לפני הרחבה"
                              : "במעקב",
                    readyItems: readyExpansionItems,
                    totalItems: expansionItems.length,
                    items: expansionItems,
                },
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to get daycare overview",
        });
    }
});

router.get("/daycare/tasks", requireAdmin, async (_req, res) => {
    try {
        await ensureDefaultTasks();
        const tasks = await DaycareTask.find().sort({ createdAt: 1 });

        return res.json({
            success: true,
            data: tasks,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to get daycare tasks",
        });
    }
});

router.post("/daycare/tasks", requireAdmin, async (req, res) => {
    try {
        const task = await DaycareTask.create(req.body);

        return res.status(201).json({
            success: true,
            data: task,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: "Failed to create daycare task",
        });
    }
});

router.patch("/daycare/tasks/:id", requireAdmin, async (req, res) => {
    try {
        const task = await DaycareTask.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found",
            });
        }

        return res.json({
            success: true,
            data: task,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: "Failed to update daycare task",
        });
    }
});

router.delete("/daycare/tasks/:id", requireAdmin, async (req, res) => {
    try {
        await DaycareTask.findByIdAndDelete(req.params.id);

        return res.json({
            success: true,
            data: { id: req.params.id },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to delete daycare task",
        });
    }
});

router.get("/daycare/registrations", requireAdmin, async (_req, res) => {
    try {
        const [leads, publicRegistrations] = await Promise.all([
            DaycareLead.find().sort({ createdAt: -1 }),
            DaycareRegistration.find().sort({ createdAt: -1 }),
        ]);

        return res.json({
            success: true,
            data: {
                leads,
                publicRegistrations,
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to get daycare registrations",
        });
    }
});

router.patch("/daycare/public-registrations/:id", requireAdmin, async (req, res) => {
    try {
        const registration = await DaycareRegistration.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true,
            }
        );

        if (!registration) {
            return res.status(404).json({
                success: false,
                message: "Registration not found",
            });
        }

        return res.json({
            success: true,
            data: registration,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: "Failed to update daycare registration",
        });
    }
});

router.post("/daycare/registrations", requireAdmin, async (req, res) => {
    try {
        const lead = await DaycareLead.create(req.body);

        return res.status(201).json({
            success: true,
            data: lead,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: "Failed to create daycare registration",
        });
    }
});

router.patch("/daycare/registrations/:id", requireAdmin, async (req, res) => {
    try {
        const lead = await DaycareLead.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: "Registration not found",
            });
        }

        return res.json({
            success: true,
            data: lead,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: "Failed to update daycare registration",
        });
    }
});

router.delete("/daycare/registrations/:id", requireAdmin, async (req, res) => {
    try {
        await DaycareLead.findByIdAndDelete(req.params.id);

        return res.json({
            success: true,
            data: { id: req.params.id },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to delete daycare registration",
        });
    }
});

router.get("/daycare/documents", requireAdmin, async (_req, res) => {
    try {
        await ensureDefaultDocuments();
        const documents = await DaycareDocument.find().sort({ createdAt: 1 });

        return res.json({
            success: true,
            data: documents,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to get daycare documents",
        });
    }
});

router.post("/daycare/documents", requireAdmin, async (req, res) => {
    try {
        const document = await DaycareDocument.create(req.body);

        return res.status(201).json({
            success: true,
            data: document,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: "Failed to create daycare document",
        });
    }
});

router.patch("/daycare/documents/:id", requireAdmin, async (req, res) => {
    try {
        const document = await DaycareDocument.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true,
            }
        );

        if (!document) {
            return res.status(404).json({
                success: false,
                message: "Document not found",
            });
        }

        return res.json({
            success: true,
            data: document,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: "Failed to update daycare document",
        });
    }
});

router.delete("/daycare/documents/:id", requireAdmin, async (req, res) => {
    try {
        await DaycareDocument.findByIdAndDelete(req.params.id);

        return res.json({
            success: true,
            data: { id: req.params.id },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to delete daycare document",
        });
    }
});

router.get("/daycare/finance", requireAdmin, async (_req, res) => {
    try {
        const settings = await getFinanceSettings();

        return res.json({
            success: true,
            data: settings,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to get daycare finance settings",
        });
    }
});

router.patch("/daycare/finance", requireAdmin, async (req, res) => {
    try {
        const currentSettings = await getFinanceSettings();
        const settings = await DaycareFinanceSettings.findByIdAndUpdate(
            currentSettings._id,
            getFinanceUpdatePayload(req.body),
            {
                new: true,
                runValidators: true,
            }
        );

        return res.json({
            success: true,
            data: settings,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: "Failed to update daycare finance settings",
        });
    }
});

router.get("/rebbe-letters", requireAdmin, async (_req, res) => {
    try {
        const letters = await getAllRebbeLetters();

        return res.json({
            success: true,
            data: letters,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to get rebbe letters",
        });
    }
});

router.get("/payments", requireAdmin, async (_req, res) => {
    try {
        const payments = await getAllPayments();

        return res.json({
            success: true,
            data: payments,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to get payments",
        });
    }
});

router.get("/finance", requireAdmin, async (req, res) => {
    try {
        const monthRange = getMonthRange(req.query.month);
        const dateFilter = monthRange
            ? {
                  createdAt: {
                      $gte: monthRange.start,
                      $lt: monthRange.end,
                  },
              }
            : {};
        const occurredAtFilter = monthRange
            ? {
                  occurredAt: {
                      $gte: monthRange.start,
                      $lt: monthRange.end,
                  },
              }
            : {};

        const [payments, manualEntries] = await Promise.all([
            getAllPayments(dateFilter),
            FinanceEntryModel.find(occurredAtFilter).sort({
                occurredAt: -1,
                createdAt: -1,
            }),
        ]);

        const websiteEntries = payments.map((payment) => {
            const paymentWithDates = payment as typeof payment & {
                createdAt?: Date;
                updatedAt?: Date;
            };

            return {
                _id: `payment-${payment._id}`,
                type: "income" as const,
                source: "website",
                category: "תרומות מהאתר",
                title: getWebsitePaymentTitle(payment),
                amount: payment.NormalizedTotal,
                occurredAt: paymentWithDates.createdAt || new Date(),
                donorName: [payment.FirstName, payment.LastName]
                    .filter(Boolean)
                    .join(" "),
                phone: payment.Phone,
                email: payment.Mail,
                notes: payment.lizchut,
                linkedPaymentId: payment._id,
                createdAt: paymentWithDates.createdAt,
                updatedAt: paymentWithDates.updatedAt,
            };
        });

        const allEntries = [...websiteEntries, ...manualEntries].sort(
            (entryA, entryB) =>
                new Date(entryB.occurredAt).getTime() -
                new Date(entryA.occurredAt).getTime()
        );

        return res.json({
            success: true,
            data: {
                summary: getFinanceSummary(allEntries),
                categorySummary: getCategorySummary(allEntries),
                entries: allEntries,
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to get finance overview",
        });
    }
});

router.post("/finance-entries", requireAdmin, async (req, res) => {
    try {
        const payload = getFinanceEntryPayload(req.body);
        const entry = await FinanceEntryModel.create(payload);

        return res.status(201).json({
            success: true,
            data: entry,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: "Failed to create finance entry",
        });
    }
});

router.patch("/rebbe-letters/:id/status", requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!isValidRebbeLetterStatus(status)) {
            return res.status(400).json({
                success: false,
                message: "סטטוס לא תקין",
            });
        }

        const updatedLetter = await updateRebbeLetterStatus(id, status);

        if (!updatedLetter) {
            return res.status(404).json({
                success: false,
                message: "המכתב לא נמצא",
            });
        }

        return res.json({
            success: true,
            data: updatedLetter,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "שגיאה בעדכון סטטוס",
        });
    }
});

export { router as adminRoutes };
