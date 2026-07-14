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
    DAYCARE_MONTHLY_COST,
    DAYCARE_OPENING_CHILDREN,
    DAYCARE_TARGET_CHILDREN,
} from "../config/daycareDefaults";
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
import { listAdminOnboardings } from "../services/daycareOnboardingService";

const router = Router();

const openingTargetChildren = DAYCARE_OPENING_CHILDREN;
const laborDaycareSearchUrl =
    "https://www.gov.il/he/search?query=%D7%9E%D7%A2%D7%95%D7%A0%D7%95%D7%AA%20%D7%99%D7%95%D7%9D%20%D7%9C%D7%A4%D7%A2%D7%95%D7%98%D7%95%D7%AA%20%D7%A8%D7%99%D7%A9%D7%99%D7%95%D7%9F";
const fireSafetySearchUrl =
    "https://www.gov.il/he/search?query=%D7%90%D7%99%D7%A9%D7%95%D7%A8%20%D7%9B%D7%91%D7%90%D7%95%D7%AA%20%D7%9C%D7%A2%D7%A1%D7%A7";
const telAvivPlanningUrl = "https://www.tel-aviv.gov.il/";
const nationalFormsSearchUrl =
    "https://www.gov.il/he/search?query=%D7%9E%D7%A2%D7%95%D7%9F%20%D7%99%D7%95%D7%9D%20%D7%98%D7%95%D7%A4%D7%A1";

const createSubtasks = (titles: string[]) =>
    titles.map((title) => ({ title, completed: false }));

const createFallbackSubtasks = (status: IDaycareTask["status"]) => {
    if (status === "הושלם") {
        return [{ title: "ביצוע המשימה", completed: true }];
    }

    if (status === "בטיפול") {
        return [
            { title: "התחלת טיפול", completed: true },
            { title: "סיום המשימה", completed: false },
        ];
    }

    return [{ title: "ביצוע המשימה", completed: false }];
};

const getTaskStatusFromSubtasks = (
    subtasks: IDaycareTask["subtasks"],
    fallbackStatus: IDaycareTask["status"] = "לא התחיל"
): IDaycareTask["status"] => {
    if (!subtasks || subtasks.length === 0) {
        return fallbackStatus;
    }

    const completedCount = subtasks.filter((subtask) => subtask.completed).length;
    const hasStartedSubtask = subtasks.some(
        (subtask) =>
            subtask.completed ||
            subtask.ordered ||
            subtask.installed ||
            (subtask.actualCost ?? 0) > 0
    );

    if (completedCount === subtasks.length) {
        return "הושלם";
    }

    if (hasStartedSubtask) {
        return "בטיפול";
    }

    return "לא התחיל";
};

const normalizeTaskStatusBySubtasks = (
    task: Partial<IDaycareTask>,
    fallbackStatus: IDaycareTask["status"] = "לא התחיל"
) => {
    const normalizedTask = { ...task };
    const statusForFallback = normalizedTask.status ?? fallbackStatus;

    if (!normalizedTask.subtasks || normalizedTask.subtasks.length === 0) {
        normalizedTask.subtasks = createFallbackSubtasks(statusForFallback);
    }

    normalizedTask.status = getTaskStatusFromSubtasks(
        normalizedTask.subtasks,
        statusForFallback
    );

    return normalizedTask;
};

const openingEquipmentSubtasks = [
    "ריהוט - שולחן פעילות",
    "ריהוט - כיסאות ילדים",
    "ריהוט - כיסא לצוות",
    "ריהוט - ארון אחסון",
    "ריהוט - כוורת/מדפים",
    "ריהוט - שטיח פעילות",
    "ריהוט - מזרנים לשינה",
    "ריהוט - מצעים",
    "פינת החתלה - שידת החתלה",
    "פינת החתלה - משטח החתלה",
    "פינת החתלה - פח טיטולים",
    "פינת החתלה - מגבונים",
    "פינת החתלה - כפפות חד-פעמיות",
    "פינת החתלה - קרם החתלה",
    "פינת החתלה - חומר חיטוי",
    "ציוד לארוחות - סינרים",
    "עזרה ראשונה - ערכת עזרה ראשונה מלאה",
    "עזרה ראשונה - מדחום דיגיטלי",
    "עזרה ראשונה - שקיות קירור חד-פעמיות",
    "ניקיון - שואב אבק",
    "ניקיון - מטאטא",
    "ניקיון - יעה",
    "ניקיון - מגב",
    "ניקיון - דלי",
    "ניקיון - חומרי ניקוי",
    "ניקיון - שקיות אשפה",
    "ניקיון - מטליות ניקוי",
].map((title) => ({ title, completed: false }));

const defaultTaskSubtasksByTitle: Record<
    string,
    Array<{ title: string; completed: boolean }>
> = {
    "בירור מסגרת חוקית לפתיחה קטנה עם 6 ילדים": createSubtasks([
        "לבדוק האם 6 ילדים נחשב מסגרת קטנה ללא רישוי מלא",
        "לרשום מי הגורם הרשמי שנותן תשובה",
        "לשמור קישור / צילום מסך של ההנחיה",
        "להחליט האם יש מגבלה לפני פרסום",
    ]),
    "סגירת חוזה / אישור שימוש במבנה": createSubtasks([
        "לקבל טיוטת חוזה / אישור שימוש",
        "לוודא שהשימוש כמעון קטן מותר",
        "לבדוק עלויות ותנאי יציאה",
        "לשמור עותק חתום במערכת המסמכים",
    ]),
    "בדיקת התאמת המבנה לפתיחה עם 6 ילדים": createSubtasks([
        "לבדוק חלל פעילות",
        "לבדוק מטבח",
        "לבדוק שירותים / החתלה",
        "לבדוק חצר וגישה בטוחה",
        "לרשום מה חסר לפני פתיחה",
    ]),
    "קביעת שעות פעילות ומחיר להורים": createSubtasks([
        "לקבוע שעות פעילות בסיסיות",
        "לקבוע מחיר חודשי",
        "להחליט האם יש תשלום רישום / מקדמה",
        "לעדכן את דף המידע להורים",
    ]),
    "מטבח - המשך עבודה מול הנגר לאחר מדידות": createSubtasks([
        "לקבל הצעת מחיר מהנגר",
        "לאשר תכנון ארונות / משטח",
        "לקבוע מועד ביצוע",
        "לבדוק שהמטבח מוכן לשימוש בטוח",
    ]),
    "חיפוי קרמיקות למטבח": createSubtasks([
        "לבחור קרמיקה",
        "לקבל מחיר עבודה וחומרים",
        "לקבוע מועד התקנה",
        "לבדוק סיום וניקיון",
    ]),
    "גבס לתקרה": createSubtasks([
        "להגדיר אזורי גבס",
        "לקבל הצעת מחיר",
        "לקבוע ביצוע",
        "לבדוק תיקונים לפני צבע",
    ]),
    "צבע לחלל המעון": createSubtasks([
        "לבחור צבעים",
        "להכין קירות לצביעה",
        "לבצע צבע",
        "לעשות סבב תיקונים",
    ]),
    "בניית קיר בין המטבח לחלל הגדול": createSubtasks([
        "להחליט מיקום וגובה הקיר",
        "לקבל הצעת מחיר",
        "לבצע בנייה",
        "לוודא שהמעבר והבטיחות תקינים",
    ]),
    "לסדר חצרות": createSubtasks([
        "לפנות פסולת ומפגעים",
        "לבדוק הצללה",
        "לבדוק משחק בטוח",
        "לבדוק שער / סגירה",
        "לצלם מצב אחרי סידור",
    ]),
    "בדיקת מפגעים בקירות ובחלל המעון": createSubtasks([
        "לעבור על שקעים וחשמל",
        "לבדוק פינות חדות",
        "לבדוק רצפה וקירות",
        "לבדוק דלתות וחלונות",
        "לתקן כל מפגע שנמצא",
    ]),
    "בדיקת חצר: גידור, שער ומפגעים": createSubtasks([
        "לבדוק גידור מלא",
        "לבדוק נעילת שער",
        "לבדוק נפילות / מדרגות / בורות",
        "לבדוק חפצים מסוכנים",
        "לרשום תיקונים נדרשים",
    ]),
    "בירור צורך באישור כיבוי אש": createSubtasks([
        "לברר האם נדרש אישור במסגרת קטנה",
        "לבדוק צורך במטפים / גלאים",
        "לקבל הצעת מחיר אם צריך בדיקה",
        "לשמור אישור / תשובה",
    ]),
    "סגירת ביטוח צד ג׳ ואחריות מקצועית": createSubtasks([
        "לקבל הצעת ביטוח צד ג׳",
        "לקבל הצעת אחריות מקצועית",
        "לוודא כיסוי לילדים וצוות",
        "לשלם ולשמור פוליסה",
    ]),
    "גיוס / סגירת מטפלת לפתיחה": createSubtasks([
        "להגדיר שעות ותפקיד",
        "למצוא מועמדת מתאימה",
        "לקיים שיחה / ראיון",
        "לסגור שכר ותאריך התחלה",
        "לאסוף פרטי קשר ומסמכים",
    ]),
    "הכנת דף מידע להורים": createSubtasks([
        "לכתוב מחיר ושעות",
        "לכתוב גילאים ותאריך פתיחה",
        "לכתוב מה כולל המעון",
        "להוסיף פרטי קשר",
        "להכין נוסח לשליחה בוואטסאפ",
    ]),
    "פרסום ראשון ואיסוף מתעניינים": createSubtasks([
        "לנסח הודעת פרסום קצרה",
        "להכין תמונה / מודעה",
        "לשלוח בקבוצות רלוונטיות",
        "לרשום כל פנייה בטבלת הפניות",
        "לקבוע חזרה למתעניינים",
    ]),
    "הכנת יום פתוח / ביקור הורים": createSubtasks([
        "לקבוע תאריך ושעות",
        "להכין את המקום לביקור",
        "להכין דף מידע להורים",
        "להכין רשימת שאלות ותשובות",
        "לתעד מי הגיע ומה הסטטוס",
    ]),
    "מעקב אחרי משפחות מתעניינות": createSubtasks([
        "להכניס כל משפחה למעקב",
        "לסמן רמת עניין אחרי שיחה",
        "לתעד מחיר / שעות / מה חשוב להם",
        "לקבוע תאריך חזרה",
        "לעדכן סטטוס אחרי כל שיחה",
    ]),
    "הכנת טופס הרשמה וחוזה הורים לפתיחה": createSubtasks([
        "להכין טופס פרטי ילד והורים",
        "להכין חוזה הורים",
        "להוסיף סעיף תשלום וביטול",
        "להוסיף אישורי בריאות / אלרגיות",
        "לשמור קובץ סופי במסמכים",
    ]),
    "הגדרת תהליך גביית תשלום חודשי": createSubtasks([
        "להחליט אמצעי תשלום",
        "לקבוע תאריך חיוב חודשי",
        "להגדיר מקדמה / דמי רישום אם צריך",
        "להחליט איך מתעדים תשלומים",
    ]),
    "מעקב התרחבות מעל 6 ילדים - בירור דרישות": createSubtasks([
        "לבדוק דרישות רישוי מעל 6 ילדים",
        "לבדוק יחס כוח אדם לילדים",
        "לבדוק עדכון ביטוח",
        "לבדוק מסמכים וחוזים להרחבה",
        "להפעיל רק כשיש כיוון ל־7 ילדים ומעלה",
    ]),
};

const fullSetupChecklistTasks: IDaycareTask[] = [
    {
        title: "הקמה מלאה - עבודות בנייה וגמר",
        category: "שיפוץ",
        status: "לא התחיל",
        priority: "דחופה",
        stage: "לפני פתיחה",
        notes: "שלב 1 חובה לפתיחה | כולל עבודות גמר וניקיון לפני אכלוס",
        subtasks: createSubtasks([
            "התקנת דשא סינטטי",
            "התקנת רשת חצר צל",
            "התקנת גדרות במבוק",
            "סתימת חורים בקירות ובחצר",
            "חיפוי קירות",
            "תקרת גבס",
            "סידור פנלים וגמרי גבס",
            "שכבת צבע נוספת",
            "תיקוני צבע לאחר ההתקנות",
            "סיליקון וגימורים",
            "ניקיון יסודי לפני אכלוס",
        ]),
    },
    {
        title: "הקמה מלאה - כניסה וחצר",
        category: "שיפוץ",
        status: "לא התחיל",
        priority: "דחופה",
        stage: "לפני פתיחה",
        notes: "שלב 1 חובה לפתיחה | חצר, שערים, כניסה והצללה",
        subtasks: createSubtasks([
            "פרגולה + סנטף",
            "שער כניסה לחצר - ריתוך ותיקון צירים",
            "שער כניסה לדירה - ריתוך ותיקון צירים",
            "צביעת שערי כניסה",
            "שער יציאה לחצר - צביעה",
            "שער יציאה לחצר - התקנת פרספקט",
            "יישור הכניסה בבטון",
            "אדניות + צמחייה",
            "פחי אשפה חיצוניים",
            "תאורת חוץ",
            "מספר בית ושילוט",
        ]),
    },
    {
        title: "הקמה מלאה - מטבח",
        category: "שיפוץ",
        status: "לא התחיל",
        priority: "דחופה",
        stage: "לפני פתיחה",
        notes: "שלב 1 חובה לפתיחה | תנור וכיריים אפשר לדחות אם לא נדרשים בתחילת הפעילות",
        subtasks: createSubtasks([
            "סגירת המטבח",
            "מחיצת בטיחות",
            "שער בטיחות",
            "ארונות אחסון",
            "שיוף כיור אלומיניום",
            "מטבח + שיש",
            "מקרר",
            "מיקרוגל / תנור",
            "כיריים",
            "מטף",
            "תאורה",
            "שקעים",
            "קומקום",
        ]),
    },
    {
        title: "הקמה מלאה - שירותים ופינת החתלה",
        category: "שיפוץ",
        status: "לא התחיל",
        priority: "דחופה",
        stage: "לפני פתיחה",
        notes: "שלב 1 חובה לפתיחה | שירותים, אינסטלציה והחתלה",
        subtasks: createSubtasks([
            "תאי שירותים HPL",
            "אסלות ילדים",
            "כיורי ילדים",
            "כיור צוות",
            "ברזים",
            "סיפונים",
            "מתקן סבון",
            "מתקן נייר",
            "ביטול מקלחת",
            "סידור צנרת",
            "שידת החתלה",
            "משטח החתלה",
            "ארון לטיטולים",
            "פח טיטולים",
        ]),
    },
    {
        title: "הקמה מלאה - חשמל ומיזוג",
        category: "בטיחות",
        status: "לא התחיל",
        priority: "דחופה",
        stage: "לפני פתיחה",
        notes: "שלב 1 חובה לפתיחה | חשמל תקין, תאורה, מיזוג ואמצעי התרעה",
        subtasks: createSubtasks([
            "לוח חשמל",
            "בדיקת חשמלאי",
            "שקעים",
            "מפסקים",
            "תאורת פנים",
            "תאורת חוץ",
            "תאורת חירום",
            "גלאי עשן",
            "כבלי רשת",
            "נקודות אינטרנט",
            "מצלמות",
            "מערכת אזעקה אם תהיה",
            "התקנת מזגנים",
            "ניקוז מזגנים",
            "חיבורי חשמל למזגנים",
            "שלטים למזגנים",
            "בדיקת תקינות מיזוג",
        ]),
    },
    {
        title: "הקמה מלאה - ריהוט וציוד שינה",
        category: "ציוד",
        status: "לא התחיל",
        priority: "דחופה",
        stage: "לפני פתיחה",
        notes: "שלב 1 חובה לפתיחה | חלק מהפריטים אפשר לקבל כתרומה",
        subtasks: createSubtasks([
            "שולחנות",
            "כיסאות",
            "כיסא אוכל",
            "לולים",
            "מזרנים",
            "מיטות",
            "לוקרים",
            "ארונות",
            "ספרייה",
            "מדפי משחקים",
            "פינת קריאה",
            "פינת רוגע",
            "מצעים",
        ]),
    },
    {
        title: "הקמה מלאה - ציוד מטבח ותינוקות",
        category: "ציוד",
        status: "לא התחיל",
        priority: "רגילה",
        stage: "לפני פתיחה",
        notes: "שלב 1 בסיסי לפתיחה | השלמות לפי מספר הילדים בפועל",
        subtasks: createSubtasks([
            "צלחות",
            "קערות",
            "כוסות",
            "סכו\"ם ילדים",
            "סכו\"ם צוות",
            "מגשים",
            "סירים",
            "מחבתות",
            "קרשי חיתוך",
            "סכינים",
            "כלי אחסון",
            "פח אשפה",
            "מתקן מים",
            "סדינים",
            "שמיכות",
            "מגבות",
            "סינרים",
            "טיטולים",
            "מגבונים",
            "כפפות",
            "חומרי חיטוי",
        ]),
    },
    {
        title: "הקמה מלאה - משחקים ופעילות",
        category: "ציוד",
        status: "לא התחיל",
        priority: "רגילה",
        stage: "לפני פתיחה",
        notes: "חלק בסיסי לפתיחה, הרחבה בחודשים הראשונים",
        subtasks: createSubtasks([
            "קוביות",
            "מגדלים",
            "השחלות",
            "פאזלים",
            "מטבח משחק",
            "בובות",
            "עגלות",
            "כלי עבודה",
            "תופים",
            "קסילופון",
            "רעשנים",
            "ספרי פעוטות",
            "ספרי בד",
            "צבעים",
            "דפים",
            "פלסטלינה",
            "טושים",
            "מדבקות",
            "בימבות",
            "כדורים",
            "מנהרות",
            "מתקני טיפוס",
            "ארגז אחסון לחצר",
        ]),
    },
    {
        title: "הקמה מלאה - בטיחות וניקיון",
        category: "בטיחות",
        status: "לא התחיל",
        priority: "דחופה",
        stage: "לפני פתיחה",
        notes: "שלב 1 חובה לפתיחה | בטיחות ילדים וניקיון שוטף",
        subtasks: createSubtasks([
            "מטפים",
            "גלאי עשן",
            "גלאי גז",
            "ערכת עזרה ראשונה",
            "מגני פינות",
            "מגני שקעים",
            "שערי בטיחות",
            "מגני אצבעות לדלתות",
            "מנעולים לארונות חומרי ניקוי",
            "מטאטא",
            "יעה",
            "מגב",
            "דליים",
            "חומרי ניקוי",
            "חומר חיטוי",
            "שקיות אשפה",
            "נייר טואלט",
            "סבון ידיים",
            "מגבות נייר",
        ]),
    },
    {
        title: "הקמה מלאה - משרד, ניהול ואישורים",
        category: "אישורים",
        status: "לא התחיל",
        priority: "רגילה",
        stage: "לפני פתיחה",
        notes: "ניהול שוטף, מסמכים ותפעול בסיסי",
        subtasks: createSubtasks([
            "מחשב",
            "מדפסת",
            "אינטרנט",
            "טלפון",
            "קלסרים",
            "תיקי ילדים",
            "מדבקות שם",
            "חוזי הרשמה",
            "טפסים רפואיים",
            "יומן נוכחות",
            "קבלות וחשבוניות",
            "ביטוח",
            "נהלי בטיחות",
            "נהלי חירום",
            "תוכנית פינוי",
            "אישורי כיבוי אש אם יידרשו",
            "אישורי משרד הבריאות אם יידרשו",
            "חוזי עובדים",
            "תיקי עובדים",
            "תוכנית לימודים",
            "תפריט שבועי",
            "רשימת אנשי קשר לחירום",
        ]),
    },
    {
        title: "ניהול תרומות ופריטים שאפשר לבקש",
        category: "שיווק",
        status: "לא התחיל",
        priority: "רגילה",
        stage: "לפני פתיחה",
        notes: "לנסות לקבל תרומות כדי לצמצם הוצאה לפני פתיחה",
        subtasks: createSubtasks([
            "מקרר",
            "מזגנים",
            "גופי תאורה",
            "צבע",
            "לוחות גבס",
            "דשא סינטטי",
            "תאי שירותים HPL",
            "ריהוט לילדים",
            "שידת החתלה",
            "ארונות",
            "ספרים",
            "משחקים",
            "מצלמות",
            "מטפים",
            "ציוד יצירה",
            "פרגולה או סנטף",
            "במבוק ורשת צל",
        ]),
    },
];

const defaultDaycareTasks: IDaycareTask[] = ([
    { title: "בירור מסגרת חוקית לפתיחה קטנה עם 6 ילדים", category: "אישורים", status: "לא התחיל", priority: "דחופה", stage: "עכשיו", notes: "חובה לפתיחה | לוודא מה מותר ומה צריך לבדוק לפני פרסום", resourceLabel: "חיפוש רישוי מעונות", resourceUrl: laborDaycareSearchUrl },
    { title: "סגירת חוזה / אישור שימוש במבנה", category: "אישורים", status: "בטיפול", priority: "דחופה", stage: "עכשיו", notes: "חובה לפתיחה | לבדוק שהשימוש כמעון קטן אפשרי מול בעל המקום/העירייה", resourceLabel: "עיריית תל אביב-יפו", resourceUrl: telAvivPlanningUrl },
    { title: "בדיקת התאמת המבנה לפתיחה עם 6 ילדים", category: "תכנון", status: "לא התחיל", priority: "דחופה", stage: "השבוע", notes: "חובה לפתיחה | חלל, מטבח, שירותים, חצר וגישה בטוחה", resourceLabel: "חיפוש הנחיות רישוי", resourceUrl: laborDaycareSearchUrl },
    { title: "קביעת שעות פעילות ומחיר להורים", category: "תכנון", status: "לא התחיל", priority: "דחופה", stage: "עכשיו", notes: "חובה לפני הרשמות | בסיס להצעה להורים ולמצב הכספי בפועל" },
    { title: "בירור צורך באישור כיבוי אש", category: "בטיחות", status: "לא התחיל", priority: "רגילה", stage: "לפני פתיחה", notes: "חשוב לפני פתיחה | קודם לברר אם נדרש במסגרת קטנה", resourceLabel: "חיפוש אישור כבאות", resourceUrl: fireSafetySearchUrl },
    { title: "סגירת ביטוח צד ג׳ ואחריות מקצועית", category: "אישורים", status: "לא התחיל", priority: "דחופה", stage: "לפני פתיחה", notes: "חובה לפתיחה | לפני כניסת ילדים" },
    { title: "גיוס / סגירת מטפלת לפתיחה", category: "כוח אדם", status: "לא התחיל", priority: "דחופה", stage: "עכשיו", notes: "חובה לפתיחה | את מנהלת את המעון, צריך לסגור מטפלת נוספת" },
    { title: "הכנת דף מידע להורים", category: "שיווק", status: "לא התחיל", priority: "דחופה", stage: "עכשיו", notes: "חובה לפני פרסום | מחיר, שעות, גילאים, תאריך יעד ויצירת קשר" },
    { title: "פרסום ראשון ואיסוף מתעניינים", category: "שיווק", status: "לא התחיל", priority: "דחופה", stage: "עכשיו", notes: "חובה עכשיו | אין עדיין משפחות, זו משימה מרכזית" },
    { title: "הכנת יום פתוח / ביקור הורים", category: "שיווק", status: "לא התחיל", priority: "רגילה", stage: "לפני פתיחה", notes: "חשוב אחרי שיש חלל מסודר ואפשר להראות מקום" },
    { title: "מעקב אחרי משפחות מתעניינות", category: "הרשמות", status: "לא התחיל", priority: "דחופה", stage: "עכשיו", notes: "חובה עכשיו | לתעד כל פנייה ולחזור בזמן" },
    { title: "הכנת טופס הרשמה וחוזה הורים לפתיחה", category: "הרשמות", status: "לא התחיל", priority: "דחופה", stage: "לפני פתיחה", notes: "חובה לפני הרשמה סופית | לא חוזה הרחבה", resourceLabel: "חיפוש טפסים", resourceUrl: nationalFormsSearchUrl },
    { title: "הגדרת תהליך גביית תשלום חודשי", category: "הרשמות", status: "לא התחיל", priority: "רגילה", stage: "לפני פתיחה", notes: "חשוב לפני הרשמה סופית | אמצעי תשלום, מועד חיוב וביטול" },
    { title: "מעקב התרחבות מעל 6 ילדים - בירור דרישות", category: "אישורים", status: "לא התחיל", priority: "נמוכה", stage: "התרחבות", notes: "מעקב בלבד | לא דחוף לפני שיש כיוון ל־6 ילדים", resourceLabel: "חיפוש רישוי מעונות", resourceUrl: laborDaycareSearchUrl },
    ...fullSetupChecklistTasks,
] as IDaycareTask[]).map((task) =>
    normalizeTaskStatusBySubtasks({
        ...task,
        subtasks: task.subtasks ?? defaultTaskSubtasksByTitle[task.title],
    }) as IDaycareTask
);

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
    "מטבח - המשך עבודה מול הנגר לאחר מדידות",
    "חיפוי קרמיקות למטבח",
    "גבס לתקרה",
    "צבע לחלל המעון",
    "בניית קיר בין המטבח לחלל הגדול",
    "לסדר חצרות",
    "בדיקת מפגעים בקירות ובחלל המעון",
    "בדיקת חצר: גידור, שער ומפגעים",
    "רשימת ציוד לקנייה לפתיחת המעון",
    "תכנון תקציב פתיחה בשלבים",
    "גיוס מנהלת",
    "גיוס מטפלת",
    "הכנת רשימת ציוד",
    "הכנת רשימת ציוד מינימלית לפתיחה",
    "רכישת מזרנים / לולים / משחקים",
    "רכישת ציוד חובה: מזרנים / לולים / משחקים בסיסיים",
    "רכישת ריהוט בסיסי למעון",
    "רכישת ציוד לפינת החתלה",
    "רכישת ציוד לארוחות",
    "רכישת ערכת עזרה ראשונה",
    "רכישת ציוד ניקיון לפתיחה",
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
    pricePerChild: DAYCARE_MONTHLY_COST,
    currentChildren: DAYCARE_OPENING_CHILDREN,
    targetChildren: DAYCARE_TARGET_CHILDREN,
    rent: 0,
    directorSalary: 0,
    staffSalaries: 0,
    food: 0,
    supplies: 0,
    insuranceAndPermits: 0,
    extraExpenses: 0,
    renovationKitchen: 0,
    renovationYard: 0,
    renovationConstruction: 0,
    renovationSafety: 0,
    renovationEquipment: 0,
    renovationLabor: 0,
    renovationOther: 0,
    monthlyCashflows: [],
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
        status: { $ne: "הושלם" },
    });

    const equipmentTaskExists = await DaycareTask.exists({
        title: "רשימת ציוד לקנייה לפתיחת המעון",
    });

    if (!equipmentTaskExists) {
        await DaycareTask.updateOne(
            {
                title: "הכנת רשימת ציוד מינימלית לפתיחה",
                status: { $ne: "הושלם" },
            },
            {
                $set: {
                    title: "רשימת ציוד לקנייה לפתיחת המעון",
                    category: "ציוד",
                    priority: "דחופה",
                    stage: "לפני פתיחה",
                    notes: "סמני כל פריט שנקנה. כשהכל מסומן המשימה תושלם.",
                    subtasks: openingEquipmentSubtasks,
                },
            }
        );
    }

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
            .map((task) => {
                const updateConditions: Record<string, unknown>[] = [
                    { resourceUrl: { $exists: false } },
                    { resourceUrl: "" },
                    { notes: { $exists: false } },
                    { notes: "" },
                    { stage: { $exists: false } },
                ];

                if (task.subtasks) {
                    updateConditions.push(
                        { subtasks: { $exists: false } },
                        { subtasks: { $size: 0 } }
                    );
                }

                return DaycareTask.updateOne(
                    {
                        title: task.title,
                        $or: updateConditions,
                    },
                    {
                        $set: getTaskDefaultUpdatePayload(task),
                    }
                );
            })
    );

    await Promise.all(
        defaultDaycareTasks
            .filter((task) => task.subtasks && task.subtasks.length > 0)
            .map(async (defaultTask) => {
                const existingTask = await DaycareTask.findOne({
                    title: defaultTask.title,
                });

                if (!existingTask || !defaultTask.subtasks) {
                    return;
                }

                const existingSubtasks = existingTask.subtasks || [];
                const existingTitles = new Set(
                    existingSubtasks.map((subtask) => subtask.title)
                );
                const missingSubtasks = defaultTask.subtasks.filter(
                    (subtask) => !existingTitles.has(subtask.title)
                );

                if (missingSubtasks.length === 0) {
                    return;
                }

                await DaycareTask.updateOne(
                    { _id: existingTask._id },
                    {
                        $set: {
                            subtasks: [...existingSubtasks, ...missingSubtasks],
                        },
                    }
                );
            })
    );

    const tasksWithoutSubtasks = await DaycareTask.find({
        $or: [
            { subtasks: { $exists: false } },
            { subtasks: { $size: 0 } },
        ],
    });

    await Promise.all(
        tasksWithoutSubtasks.map(async (task) => {
            task.subtasks = createFallbackSubtasks(task.status);
            task.status = getTaskStatusFromSubtasks(task.subtasks, task.status);
            task.markModified("subtasks");
            await task.save();
        })
    );

    const tasksWithSubtasks = await DaycareTask.find({
        "subtasks.0": { $exists: true },
    });

    await Promise.all(
        tasksWithSubtasks.map(async (task) => {
            const nextStatus = getTaskStatusFromSubtasks(
                task.subtasks,
                task.status
            );

            if (task.status === nextStatus) {
                return;
            }

            task.status = nextStatus;
            await task.save();
        })
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

const getMonthlyCashflowPayload = (
    cashflows: IDaycareFinanceSettings["monthlyCashflows"] = []
) =>
    cashflows.map((cashflow) => ({
        month: cashflow.month,
        children: Number(cashflow.children) || 0,
        pricePerChild: Number(cashflow.pricePerChild) || 0,
        income: Number(cashflow.income) || 0,
        extraIncome: Number(cashflow.extraIncome) || 0,
        rent: Number(cashflow.rent) || 0,
        directorSalary: Number(cashflow.directorSalary) || 0,
        staffSalaries: Number(cashflow.staffSalaries) || 0,
        food: Number(cashflow.food) || 0,
        supplies: Number(cashflow.supplies) || 0,
        insuranceAndPermits: Number(cashflow.insuranceAndPermits) || 0,
        extraExpenses: Number(cashflow.extraExpenses) || 0,
        renovationKitchen: Number(cashflow.renovationKitchen) || 0,
        renovationYard: Number(cashflow.renovationYard) || 0,
        renovationConstruction: Number(cashflow.renovationConstruction) || 0,
        renovationSafety: Number(cashflow.renovationSafety) || 0,
        renovationEquipment: Number(cashflow.renovationEquipment) || 0,
        renovationLabor: Number(cashflow.renovationLabor) || 0,
        renovationOther: Number(cashflow.renovationOther) || 0,
        renovationRepayment: Number(cashflow.renovationRepayment) || 0,
    }));

const getFinanceUpdatePayload = (body: Partial<IDaycareFinanceSettings>) => ({
    pricePerChild: body.pricePerChild ?? 0,
    currentChildren: body.currentChildren ?? 0,
    targetChildren: body.targetChildren ?? 0,
    rent: body.rent ?? 0,
    directorSalary: body.directorSalary ?? 0,
    staffSalaries: body.staffSalaries ?? 0,
    food: body.food ?? 0,
    supplies: body.supplies ?? 0,
    insuranceAndPermits: body.insuranceAndPermits ?? 0,
    extraExpenses: body.extraExpenses ?? 0,
    renovationKitchen: body.renovationKitchen ?? 0,
    renovationYard: body.renovationYard ?? 0,
    renovationConstruction: body.renovationConstruction ?? 0,
    renovationSafety: body.renovationSafety ?? 0,
    renovationEquipment: body.renovationEquipment ?? 0,
    renovationLabor: body.renovationLabor ?? 0,
    renovationOther: body.renovationOther ?? 0,
    monthlyCashflows: getMonthlyCashflowPayload(body.monthlyCashflows),
});

const getDaycareTaskActualCosts = async () => {
    const tasks = await DaycareTask.find().select("subtasks");

    return tasks.reduce((taskTotal, task) => {
        const subtaskTotal = (task.subtasks || []).reduce(
            (total, subtask) => total + (Number(subtask.actualCost) || 0),
            0
        );

        return taskTotal + subtaskTotal;
    }, 0);
};

const getFinanceEntryPayload = (body: Record<string, unknown>): FinanceEntry => ({
    type: body.type === "income" ? "income" : "expense",
    source:
        typeof body.source === "string" &&
        ["cash", "bit", "credit", "bank", "check"].includes(body.source)
            ? (body.source as "cash" | "bit" | "credit" | "bank" | "check")
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
        const task = await DaycareTask.create(
            normalizeTaskStatusBySubtasks(req.body)
        );

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

router.patch(
    "/daycare/tasks/:id/subtasks/:subtaskIndex",
    requireAdmin,
    async (req, res) => {
        try {
            const subtaskIndex = Number(req.params.subtaskIndex);

            if (!Number.isInteger(subtaskIndex) || subtaskIndex < 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid subtask index",
                });
            }

            const task = await DaycareTask.findById(req.params.id);

            if (!task || !task.subtasks || !task.subtasks[subtaskIndex]) {
                return res.status(404).json({
                    success: false,
                    message: "Task or subtask not found",
                });
            }

            const updates = { ...req.body };

            if (updates.actualCost !== undefined) {
                updates.actualCost = Number(updates.actualCost) || 0;
            }

            Object.assign(task.subtasks[subtaskIndex], updates);
            task.status = getTaskStatusFromSubtasks(task.subtasks, task.status);
            task.markModified("subtasks");

            const savedTask = await task.save();

            return res.json({
                success: true,
                data: savedTask,
            });
        } catch (error) {
            console.error("Failed to update daycare subtask:", error);

            return res.status(400).json({
                success: false,
                message: "Failed to update daycare subtask",
            });
        }
    }
);

router.patch("/daycare/tasks/:id", requireAdmin, async (req, res) => {
    try {
        const existingTask = await DaycareTask.findById(req.params.id);

        if (!existingTask) {
            return res.status(404).json({
                success: false,
                message: "Task not found",
            });
        }

        const nextSubtasks = req.body.subtasks ?? existingTask.subtasks;
        const payload = normalizeTaskStatusBySubtasks(
            { ...req.body, subtasks: nextSubtasks },
            existingTask.status
        );

        const task = await DaycareTask.findByIdAndUpdate(req.params.id, payload, {
            new: true,
            runValidators: true,
        });

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
        const [leads, publicRegistrations, onboardings] = await Promise.all([
            DaycareLead.find().sort({ createdAt: -1 }),
            DaycareRegistration.find().sort({ createdAt: -1 }),
            listAdminOnboardings(),
        ]);
        const onboardingByOrigin = new Map<
            string,
            (typeof onboardings)[number]
        >();

        for (const onboarding of onboardings) {
            if (!onboarding.origin?.recordId) {
                continue;
            }

            const key = `${onboarding.origin.type}:${onboarding.origin.recordId}`;

            if (!onboardingByOrigin.has(key)) {
                onboardingByOrigin.set(key, onboarding);
            }
        }
        const withOnboardingSummary = <T extends { id: string; toObject(): object }>(
            record: T,
            sourceType: "daycareRegistration" | "daycareLead"
        ) => ({
            ...record.toObject(),
            onboardingSummary:
                onboardingByOrigin.get(`${sourceType}:${record.id}`) ?? null,
        });

        return res.json({
            success: true,
            data: {
                leads: leads.map((lead) =>
                    withOnboardingSummary(lead, "daycareLead")
                ),
                publicRegistrations: publicRegistrations.map((registration) =>
                    withOnboardingSummary(
                        registration,
                        "daycareRegistration"
                    )
                ),
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
        const [settings, taskActualCosts] = await Promise.all([
            getFinanceSettings(),
            getDaycareTaskActualCosts(),
        ]);

        return res.json({
            success: true,
            data: {
                ...settings.toObject(),
                taskActualCosts,
            },
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
        const [settings, taskActualCosts] = await Promise.all([
            DaycareFinanceSettings.findByIdAndUpdate(
                currentSettings._id,
                getFinanceUpdatePayload(req.body),
                {
                    new: true,
                    runValidators: true,
                }
            ),
            getDaycareTaskActualCosts(),
        ]);

        return res.json({
            success: true,
            data: settings
                ? {
                      ...settings.toObject(),
                      taskActualCosts,
                  }
                : settings,
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
