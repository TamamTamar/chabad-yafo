export type DaycareAnnualPlanDocument = {
    key: "annualPlan";
    title: string;
    schoolYearLabel: string;
    startDate: string;
    endDate: string;
    filename: string;
    calendar: {
        vacations: Array<{ name: string; startDate: string; endDate: string }>;
        anchors: Array<{ name: string; date: string; topics: string[] }>;
        specialEvents: Array<{ name: string; date: string }>;
    };
    items: Array<{ month: string; dateRange: string; topic: string; specialEvent?: string }>;
};

export const DAYCARE_ANNUAL_PLAN_2026_2027: DaycareAnnualPlanDocument = {
    key: "annualPlan",
    title: "תוכנית נושאי לימוד שנתית",
    schoolYearLabel: "שנת הלימודים תשפ״ז",
    startDate: "2026-09-01",
    endDate: "2027-08-09",
    filename: "תוכנית נושאי לימוד שנתית מעון חבד יפו.pdf",
    calendar: {
        vacations: [
            { name: "ראש השנה", startDate: "2026-09-11", endDate: "2026-09-13" },
            { name: "יום הכיפורים", startDate: "2026-09-20", endDate: "2026-09-21" },
            { name: "סוכות ושמחת תורה", startDate: "2026-09-25", endDate: "2026-10-04" },
            { name: "חנוכה", startDate: "2026-12-06", endDate: "2026-12-07" },
            { name: "פורים", startDate: "2027-03-23", endDate: "2027-03-24" },
            { name: "פסח", startDate: "2027-04-14", endDate: "2027-04-29" },
            { name: "יום העצמאות", startDate: "2027-05-12", endDate: "2027-05-12" },
            { name: "ל״ג בעומר", startDate: "2027-05-25", endDate: "2027-05-25" },
            { name: "שבועות", startDate: "2027-06-10", endDate: "2027-06-12" },
        ],
        anchors: [
            { name: "ראש השנה", date: "2026-09-11", topics: ["ראש השנה"] },
            { name: "יום הכיפורים", date: "2026-09-20", topics: ["יום הכיפורים ומעשים טובים"] },
            { name: "סוכות ושמחת תורה", date: "2026-09-25", topics: ["סוכות ושמחת תורה"] },
            { name: "חנוכה", date: "2026-12-06", topics: ["חנוכה"] },
            { name: "פורים", date: "2027-03-23", topics: ["חודש אדר - שמחה ותחפושות", "פורים"] },
            { name: "פסח", date: "2027-04-14", topics: ["פסח - מתכוננים לחג", "פסח - יציאת מצרים וליל הסדר"] },
            { name: "ל״ג בעומר", date: "2027-05-25", topics: ["ל״ג בעומר ורבי שמעון בר יוחאי", "אהבת ישראל ואחדות"] },
            { name: "שבועות", date: "2027-06-10", topics: ["התורה שלנו - הכנה לשבועות", "הר סיני וקבלת התורה", "חג השבועות ומתן תורה"] },
        ],
        specialEvents: [
            { name: "י״ט כסלו", date: "2026-12-15" },
            { name: "י׳ שבט", date: "2027-02-02" },
            { name: "י״א ניסן", date: "2027-04-12" },
            { name: "י״ב-י״ג תמוז", date: "2027-07-15" },
        ],
    },
    items: [
        { month: "ספטמבר", dateRange: "1-4.9", topic: "הסתגלות והיכרות עם המעון" },
        { month: "ספטמבר", dateRange: "6-10.9", topic: "ראש השנה" },
        { month: "ספטמבר", dateRange: "14-18.9", topic: "יום הכיפורים ומעשים טובים" },
        { month: "ספטמבר", dateRange: "22-24.9", topic: "סוכות ושמחת תורה" },
        { month: "אוקטובר", dateRange: "5-9.10", topic: "אני והמעון שלי" },
        { month: "אוקטובר", dateRange: "11-16.10", topic: "אני והחברים שלי - אהבת ישראל" },
        { month: "אוקטובר", dateRange: "18-23.10", topic: "אני והגוף שלי" },
        { month: "אוקטובר", dateRange: "25-30.10", topic: "עצמאות - אני יכול לבד" },
        { month: "נובמבר", dateRange: "1-6.11", topic: "הסתיו" },
        { month: "נובמבר", dateRange: "8-13.11", topic: "הגשם" },
        { month: "נובמבר", dateRange: "15-20.11", topic: "מים - רטוב ויבש" },
        { month: "נובמבר", dateRange: "22-27.11", topic: "אור וחושך" },
        { month: "נובמבר", dateRange: "29.11-4.12", topic: "חנוכה" },
        { month: "דצמבר", dateRange: "8-11.12", topic: "אור ושמחה - חוויות מחנוכה" },
        { month: "דצמבר", dateRange: "13-18.12", topic: "מעשים טובים והוספה באור", specialEvent: "י״ט כסלו" },
        { month: "דצמבר", dateRange: "20-25.12", topic: "החורף" },
        { month: "דצמבר", dateRange: "27.12-1.1", topic: "שומרים על הגוף - ניקיון ובריאות" },
        { month: "ינואר", dateRange: "3-8.1", topic: "חוש הראייה - צבעים ומה שסביבי" },
        { month: "ינואר", dateRange: "10-15.1", topic: "חוש השמיעה - קולות ומוזיקה" },
        { month: "ינואר", dateRange: "17-22.1", topic: "חוש המישוש - מרקמים" },
        { month: "ינואר", dateRange: "24-29.1", topic: "ריח וטעם" },
        { month: "ינואר", dateRange: "31.1-5.2", topic: "אני גדל ולומד", specialEvent: "י׳ שבט" },
        { month: "פברואר", dateRange: "7-12.2", topic: "העץ והצומח" },
        { month: "פברואר", dateRange: "14-19.2", topic: "ט״ו בשבט ופירות ארץ ישראל" },
        { month: "פברואר", dateRange: "21-26.2", topic: "מזרע לצמח" },
        { month: "פברואר", dateRange: "28.2-5.3", topic: "קטן וגדול - גם אני גדל" },
        { month: "מרץ", dateRange: "7-12.3", topic: "רגשות - שמחה, עצב וכעס" },
        { month: "מרץ", dateRange: "14-19.3", topic: "חודש אדר - שמחה ותחפושות" },
        { month: "מרץ", dateRange: "21-22.3", topic: "פורים" },
        { month: "מרץ", dateRange: "25-26.3", topic: "חברות ונתינה" },
        { month: "מרץ", dateRange: "28.3-2.4", topic: "המשפחה שלי" },
        { month: "אפריל", dateRange: "4-9.4", topic: "פסח - מתכוננים לחג" },
        { month: "אפריל", dateRange: "11-13.4", topic: "פסח - יציאת מצרים וליל הסדר", specialEvent: "י״א ניסן" },
        { month: "אפריל", dateRange: "30.4", topic: "חזרה לשגרה אחרי פסח" },
        { month: "מאי", dateRange: "2-7.5", topic: "ארץ ישראל" },
        { month: "מאי", dateRange: "9-11.5", topic: "אהבת ישראל וחברות" },
        { month: "מאי", dateRange: "13-14.5", topic: "ארץ ישראל שלי" },
        { month: "מאי", dateRange: "16-21.5", topic: "ל״ג בעומר ורבי שמעון בר יוחאי" },
        { month: "מאי", dateRange: "23-24.5", topic: "אהבת ישראל ואחדות" },
        { month: "מאי", dateRange: "26-28.5", topic: "התורה שלנו - הכנה לשבועות" },
        { month: "מאי", dateRange: "30.5-4.6", topic: "הר סיני וקבלת התורה" },
        { month: "יוני", dateRange: "6-9.6", topic: "חג השבועות ומתן תורה" },
        { month: "יוני", dateRange: "13-18.6", topic: "המצוות שאני מכיר" },
        { month: "יוני", dateRange: "20-25.6", topic: "שבת" },
        { month: "יוני", dateRange: "27.6-2.7", topic: "הבית היהודי - מזוזה, צדקה וספרי קודש" },
        { month: "יולי", dateRange: "4-9.7", topic: "הקיץ" },
        { month: "יולי", dateRange: "11-16.7", topic: "מים בקיץ", specialEvent: "י״ב-י״ג תמוז" },
        { month: "יולי", dateRange: "18-23.7", topic: "פירות הקיץ" },
        { month: "יולי", dateRange: "25-30.7", topic: "צבעים סביבי" },
        { month: "אוגוסט", dateRange: "1-6.8", topic: "צורות וגדלים" },
        { month: "אוגוסט", dateRange: "8-9.8", topic: "סיכום ופרידה - אני גדלתי השנה" },
    ],
};
