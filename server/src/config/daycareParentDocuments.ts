export type DaycareParentDocumentKey = "routine" | "holidays" | "menu";

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
    items: Array<{ meal: string; description: string }>;
    note?: string;
};

export type DaycareParentDocument = DaycareRoutineDocument | DaycareHolidaysDocument | DaycareMenuDocument;
export type DaycareParentDocumentBundle = {
    version: string;
    schoolYear: string;
    documents: Record<DaycareParentDocumentKey, DaycareParentDocument>;
};

const routine: DaycareRoutineDocument = {
    key: "routine",
    title: "סדר יום במעון",
    subtitle: "מסגרת יומית | 07:30-16:00",
    filename: "daycare-routine.pdf",
    items: [
        { time: "07:30-08:15", activity: "קבלת הילדים ומשחק בתיבות פעילות" },
        { time: "08:15-08:25", activity: "התארגנות לארוחת הבוקר" },
        { time: "08:25-08:45", activity: "ארוחת בוקר" },
        { time: "08:45-09:00", activity: "מפגש בוקר: תפילה ונושא נלמד" },
        { time: "09:00-09:20", activity: "משחקי הרכבה" },
        { time: "09:20-09:50", activity: "פעילות בחצר" },
        { time: "09:50-10:00", activity: "הפסקת פרי ושתייה" },
        { time: "10:00-10:20", activity: "הנגשת חומרים" },
        { time: "10:20-10:40", activity: "משחקי דמיון (פינת מטבח)" },
        { time: "10:40-10:55", activity: "החתלות והיגיינה" },
        { time: "10:55-11:25", activity: "ג׳ימבורי" },
        { time: "11:25-11:50", activity: "ארוחת צהריים" },
        { time: "11:50-12:00", activity: "התארגנות לשינה" },
        { time: "12:00-14:00", activity: "מנוחת צהריים" },
        { time: "14:00-14:25", activity: "השכמה, התארגנות לאחר המנוחה וטיפוח אישי" },
        { time: "14:25-14:40", activity: "כריך, פרי ושתייה" },
        { time: "14:40-15:20", activity: "פעילות במוזיקה ותנועה" },
        { time: "15:20-16:00", activity: "ספרייה, שעת סיפור, משחקים קוגניטיביים ואיסוף הילדים" },
    ],
    note: "סדר היום הוא מסגרת מנחה ועשוי להשתנות במהלך היום לפי הקצב והצרכים של הילדים.",
};

const holidays: DaycareHolidaysDocument = {
    key: "holidays",
    title: "לוח חופשות - מעון חב״ד יפו",
    subtitle: "שנת הלימודים תשפ״ז | 1.9.2026-9.8.2027",
    filename: "daycare-holidays.pdf",
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
    documents: { routine, holidays, menu },
};

// Published yearly bundles are immutable. Add a new entry for each school year;
// never edit an existing entry after parents have signed against it.
export const daycareParentDocumentBundles: Record<string, DaycareParentDocumentBundle> = {
    [DAYCARE_PARENT_DOCUMENTS_2026_2027.schoolYear]: DAYCARE_PARENT_DOCUMENTS_2026_2027,
};
