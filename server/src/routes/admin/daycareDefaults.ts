import {
    DAYCARE_MONTHLY_COST,
    DAYCARE_OPENING_CHILDREN,
    DAYCARE_TARGET_CHILDREN,
} from "../../config/daycareDefaults";
import type {
    IDaycareDocument,
    IDaycareFinanceSettings,
    IDaycareTask,
} from "../../types/daycareAdmin";
import { fullSetupChecklistTasks } from "./daycareSetupChecklist";
import { defaultTaskSubtasksByTitle } from "./daycareTaskPresets";
import { normalizeTaskStatusBySubtasks } from "./daycareTaskStatus";

export const openingTargetChildren = DAYCARE_OPENING_CHILDREN;
const laborDaycareSearchUrl =
    "https://www.gov.il/he/search?query=%D7%9E%D7%A2%D7%95%D7%A0%D7%95%D7%AA%20%D7%99%D7%95%D7%9D%20%D7%9C%D7%A4%D7%A2%D7%95%D7%98%D7%95%D7%AA%20%D7%A8%D7%99%D7%A9%D7%99%D7%95%D7%9F";
const fireSafetySearchUrl =
    "https://www.gov.il/he/search?query=%D7%90%D7%99%D7%A9%D7%95%D7%A8%20%D7%9B%D7%91%D7%90%D7%95%D7%AA%20%D7%9C%D7%A2%D7%A1%D7%A7";
const telAvivPlanningUrl = "https://www.tel-aviv.gov.il/";
const nationalFormsSearchUrl =
    "https://www.gov.il/he/search?query=%D7%9E%D7%A2%D7%95%D7%9F%20%D7%99%D7%95%D7%9D%20%D7%98%D7%95%D7%A4%D7%A1";

export const defaultDaycareTasks: IDaycareTask[] = ([
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

export const obsoleteDefaultTaskTitles = [
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

export const defaultDaycareDocuments: IDaycareDocument[] = [
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

export const defaultFinanceSettings: IDaycareFinanceSettings = {
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
