export type DaycareStoredParentDocumentKey = "welcome" | "routine" | "holidays" | "menu" | "equipment";
export type DaycareParentDocumentKey = DaycareStoredParentDocumentKey;

export type DaycareWelcomeDocument = {
    key: "welcome";
    title: string;
    subtitle: string;
    filename: string;
    intro: string[];
    hours: {
        weekdays: string;
        friday: string;
        address: string;
    };
    day: string[];
    parents: string[];
    join: string[];
    contactName: string;
    contactPhone: string;
};

export type DaycareRoutineDocument = {
    key: "routine";
    title: string;
    subtitle: string;
    filename: string;
    items: Array<{ time: string; activity: string }>;
    note: string;
};

export type DaycareHolidaysDocument = {
    key: "holidays";
    title: string;
    subtitle: string;
    filename: string;
    items: Array<{ occasion: string; hebrewDate: string; vacationDates: string }>;
    clarifications: string[];
};

export type DaycareMenuDocument = {
    key: "menu";
    title: string;
    subtitle: string;
    filename: string;
    items: Array<{
        day: string;
        breakfast: string;
        lunch?: string;
        afternoon?: string;
    }>;
    note?: string;
};

export type DaycareEquipmentDocument = {
    key: "equipment";
    title: string;
    subtitle: string;
    filename: string;
    items: string[];
    important: string;
    note: string;
};

export type DaycareParentDocument = DaycareWelcomeDocument | DaycareRoutineDocument | DaycareHolidaysDocument | DaycareMenuDocument | DaycareEquipmentDocument;
export type DaycareParentDocumentBundle = {
    version: string;
    schoolYear: string;
    documents: {
        welcome: DaycareWelcomeDocument;
        routine: DaycareRoutineDocument;
        holidays: DaycareHolidaysDocument;
        menu: DaycareMenuDocument;
        equipment: DaycareEquipmentDocument;
    };
};

export const DAYCARE_WELCOME_DOCUMENT: DaycareWelcomeDocument = {
    key: "welcome",
    title: "ברוכים הבאים למעון חב״ד יפו",
    subtitle: "קבוצה קטנה • יחס אישי • סביבה חמה וערכית",
    filename: "ברוכים הבאים למעון חבד יפו.pdf",
    intro: [
        "ברוכים הבאים למעון חב״ד יפו.",
        "המעון מעניק לילדים מסגרת חמה, משפחתית ומקצועית, באווירה יהודית ובתכנים המותאמים לגילם.",
        "הקבוצה הקטנה מאפשרת לנו להכיר כל ילד, לתת לו יחס אישי וללוות אותו לאורך היום בחום, באהבה ובתשומת לב.",
    ],
    hours: {
        weekdays: "ימים א׳-ה׳: 07:30-16:00",
        friday: "יום שישי: 07:30-11:45",
        address: "כתובת: יוסי בן יוסי 1, יפו",
    },
    day: [
        "במהלך היום הילדים נהנים ממפגש בוקר ותפילה, משחקי הרכבה ודמיון, פעילות בחצר, יצירה והנגשת חומרים, מוזיקה, תנועה ופעילות מוטורית, ספרים וסיפורים.",
        "במהלך היום מוגשות ארוחת בוקר, פרי ושתייה, ארוחת צהריים וארוחת מנחה.",
        "מנוחת הצהריים מתקיימת בין השעות 12:00-14:00.",
        "את סדר היום המלא ניתן לראות בדף המצורף.",
    ],
    parents: [
        "חשוב לנו לקיים קשר פתוח, נעים ומכבד עם ההורים ולעדכן בכל דבר משמעותי הנוגע לילד.",
        "לשאלות, עדכונים או התייעצות ניתן לפנות לתמר:",
    ],
    join: [
        "משפחה המעוניינת להמשיך לתהליך הרישום מוזמנת לשלוח הודעת WhatsApp לתמר.",
        "לאחר הפנייה יישלח קישור אישי להשלמת פרטי הרישום, האישורים והחתימה על הסכם ההתקשרות באופן מקוון.",
    ],
    contactName: "תמר",
    contactPhone: "054-219-3770",
};

export const DAYCARE_EQUIPMENT_DOCUMENT: DaycareEquipmentDocument = {
    key: "equipment",
    title: "ציוד אישי - מה להביא למעון",
    subtitle: "לקראת תחילת השנה | מעון חב״ד יפו",
    filename: "ציוד אישי מה להביא למעון חבד יפו.pdf",
    items: [
        "חיתולים - בכמות מספקת ובהתאם לצורך",
        "מגבונים",
        "2-3 סטים של בגדי החלפה",
        "מוצץ - לילדים המשתמשים במוצץ. מומלץ להביא גם מוצץ נוסף",
        "בקבוק או כוס אישית - לפי הצורך",
        "משחה אישית להחתלה - אם משתמשים",
        "שמיכה אישית לשינה",
        "חפץ מעבר - במידת הצורך ובהתאם להרגלי הילד",
    ],
    important: "חשוב: יש לסמן את שמו של הילד על כל הציוד האישי.",
    note: "המעון מספק מצעים. את השמיכה האישית יש לקחת לכביסה בסוף כל שבוע ולהחזירה בתחילת השבוע.",
};

const routine: DaycareRoutineDocument = {
    key: "routine",
    title: "סדר יום במעון",
    subtitle: "מסגרת יומית | 07:30-16:00",
    filename: "סדר יום מעון חבד יפו.pdf",
    items: [
        { time: "07:30-08:15", activity: "קבלת הילדים ומשחק בתיבות פעילות" },
        { time: "08:15-08:25", activity: "התארגנות לארוחת הבוקר" },
        { time: "08:25-08:45", activity: "ארוחת בוקר" },
        { time: "08:45-09:00", activity: "מפגש בוקר - תפילה ונושא נלמד" },
        { time: "09:00-09:30", activity: "משחקי הרכבה ופעילות חופשית" },
        { time: "09:30-10:00", activity: "פעילות בחצר, פרי ושתייה" },
        { time: "10:00-10:40", activity: "פעילות מונחית - יצירה, חומרים ומשחקי דמיון" },
        { time: "10:40-11:00", activity: "החתלות, היגיינה והתארגנות" },
        { time: "11:00-11:25", activity: "מוזיקה, תנועה ופעילות מוטורית" },
        { time: "11:25-12:00", activity: "ארוחת צהריים והתארגנות לשינה" },
        { time: "12:00-14:00", activity: "מנוחת צהריים" },
        { time: "14:00-14:40", activity: "השכמה, טיפוח אישי וארוחת מנחה" },
        { time: "14:40-16:00", activity: "פעילות רגועה - ספרים, סיפור, משחק ואיסוף הילדים" },
    ],
    note: "סדר היום הוא מסגרת מנחה ועשוי להשתנות במהלך היום לפי הקצב והצרכים של הילדים.",
};

const holidays: DaycareHolidaysDocument = {
    key: "holidays",
    title: "לוח חופשות - מעון חב״ד יפו",
    subtitle: "שנת הלימודים תשפ״ז | 1.9.2026-9.8.2027",
    filename: "לוח חופשות מעון חבד יפו.pdf",
    items: [
        { occasion: "ראש השנה", hebrewDate: "כ״ט באלול תשפ״ו-ב׳ בתשרי תשפ״ז", vacationDates: "יום שישי-ראשון, 11-13.9.2026" },
        { occasion: "יום הכיפורים", hebrewDate: "ט׳-י׳ בתשרי תשפ״ז", vacationDates: "יום ראשון-שני, 20-21.9.2026" },
        { occasion: "סוכות, חול המועד ואסרו חג", hebrewDate: "י״ד-כ״ג בתשרי תשפ״ז", vacationDates: "יום שישי-ראשון, 25.9-4.10.2026" },
        { occasion: "חנוכה", hebrewDate: "כ״ו-כ״ז בכסלו תשפ״ז", vacationDates: "יום ראשון-שני, 6-7.12.2026" },
        { occasion: "פורים ושושן פורים", hebrewDate: "י״ד-ט״ו באדר ב׳ תשפ״ז", vacationDates: "יום שלישי-רביעי, 23-24.3.2027" },
        { occasion: "חופשת פסח", hebrewDate: "ז׳-כ״ב בניסן תשפ״ז", vacationDates: "יום רביעי-חמישי, 14-29.4.2027" },
        { occasion: "יום העצמאות", hebrewDate: "ה׳ באייר תשפ״ז", vacationDates: "יום רביעי, 12.5.2027" },
        { occasion: "ל״ג בעומר", hebrewDate: "י״ח באייר תשפ״ז", vacationDates: "יום שלישי, 25.5.2027" },
        { occasion: "ערב שבועות, שבועות ואסרו חג", hebrewDate: "ה׳-ז׳ בסיוון תשפ״ז", vacationDates: "יום חמישי-שבת, 10-12.6.2027" },
    ],
    clarifications: [
        "המעון פועל בימי שישי. כל יום שישי שאינו מצוין בטבלה כיום חופשה הוא יום פעילות רגיל.",
        "יום הזיכרון, יום שלישי 11.5.2027, יהיה יום פעילות רגיל.",
        "ימי ההסתגלות בתחילת השנה יפורסמו בנפרד.",
        "שנת הלימודים תתחיל ביום שלישי, 1.9.2026, ותסתיים ביום שני, 9.8.2027.",
    ],
};

const menu: DaycareMenuDocument = {
    key: "menu",
    title: "תפריט המעון",
    subtitle: "התפריט יפורסם בהמשך",
    filename: "daycare-menu.pdf",
    items: [],
};

export const DAYCARE_PARENT_DOCUMENTS_2026_2027: DaycareParentDocumentBundle = {
    version: "2026-2027-v1",
    schoolYear: "2026-2027",
    documents: { welcome: DAYCARE_WELCOME_DOCUMENT, routine, holidays, menu, equipment: DAYCARE_EQUIPMENT_DOCUMENT },
};

// Published yearly bundles are immutable. Add a new entry for each school year;
// never edit an existing entry after parents have signed against it.
export const daycareParentDocumentBundles: Record<string, DaycareParentDocumentBundle> = {
    [DAYCARE_PARENT_DOCUMENTS_2026_2027.schoolYear]: DAYCARE_PARENT_DOCUMENTS_2026_2027,
};
