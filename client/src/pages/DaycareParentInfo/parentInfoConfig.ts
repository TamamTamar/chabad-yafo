import {
    Baby,
    CalendarDays,
    ClipboardPlus,
    Clock3,
    CreditCard,
    FileSignature,
    Files,
    HeartHandshake,
    MapPin,
    MessageCircleQuestion,
    ShieldCheck,
    Sparkles,
    UsersRound,
    Utensils,
    type LucideIcon,
} from "lucide-react";
import {
    DAYCARE_MONTHLY_ADDITIONAL_FEE_LABEL,
    DAYCARE_MONTHLY_COST_LABEL,
    DAYCARE_MONTHLY_TUITION_LABEL,
    DAYCARE_REGISTRATION_DEPOSIT_LABEL,
} from "../../config/daycareDefaults";

export type ParentInfoSectionId =
    | "general"
    | "routine"
    | "menu"
    | "health"
    | "payments"
    | "holidays"
    | "faq"
    | "documents";

export interface ParentInfoTab {
    id: ParentInfoSectionId;
    label: string;
}

export interface ParentInfoSummaryItem {
    icon: LucideIcon;
    label: string;
    value: string;
    isPlaceholder?: boolean;
}

export interface ParentInfoAccordionItem {
    title: string;
    content: string;
    isPlaceholder?: boolean;
}

export interface ParentInfoSection {
    id: ParentInfoSectionId;
    icon: LucideIcon;
    title: string;
    summary: string;
    details: string[];
    note?: string;
    accordionItems?: ParentInfoAccordionItem[];
    kind?: "standard" | "faq" | "documents";
}

export interface ParentInfoDocument {
    id: "agreement" | "holidays" | "menu" | "medical";
    icon: LucideIcon;
    title: string;
    description: string;
    pdfPath: string;
    pdfAvailable: boolean;
    onlinePath?: string;
    onlineLabel?: string;
    updatedAt?: string;
}

export const tabs: ParentInfoTab[] = [
    { id: "general", label: "כללי ושעות פעילות" },
    { id: "routine", label: "סדר יום והסתגלות" },
    { id: "menu", label: "ארוחות ותפריט" },
    { id: "health", label: "בריאות וציוד אישי" },
    { id: "payments", label: "תשלומים וביטולים" },
    { id: "holidays", label: "חופשות" },
    { id: "faq", label: "שאלות נפוצות" },
    { id: "documents", label: "מסמכים להורדה" },
];

export const summaryItems: ParentInfoSummaryItem[] = [
    { icon: Baby, label: "גילאי הילדים", value: "לידה עד 3" },
    {
        icon: CalendarDays,
        label: "ימי פעילות",
        value: "יעודכן עם סגירת המתכונת",
        isPlaceholder: true,
    },
    { icon: Clock3, label: "שעות פעילות", value: "07:30–16:00" },
    { icon: UsersRound, label: "גודל הקבוצה", value: "קבוצה קטנה ומוגבלת" },
    { icon: MapPin, label: "מיקום", value: "מרכז שוק הפשפשים, יפו" },
    { icon: Sparkles, label: "פתיחה", value: "בהיערכות לפתיחה בספטמבר" },
];

export const sections: Record<ParentInfoSectionId, ParentInfoSection> = {
    general: {
        id: "general",
        icon: HeartHandshake,
        title: "מסגרת קטנה, חמה וברורה",
        summary:
            "מעון ערכי ומשפחתי לגיל הרך, עם קבוצה קטנה, קשר אישי ושגרה שמעניקה לילדים ביטחון.",
        details: [
            "שעות הפעילות המתוכננות: 07:30–16:00",
            "קבוצה קטנה שמאפשרת להכיר כל ילד וכל משפחה",
            "משחק, תנועה, חצר, יצירה, שירים וסיפורים בהתאמה לגיל",
            "שבת, חגים, ברכות וערכים יהודיים בגישה שמחה ונעימה",
            "קשר אישי ושקוף עם ההורים לאורך השנה",
            "המעון פתוח למשפחות מיפו והסביבה, גם למי שאינן חב״ד",
        ],
        note: "ימי הפעילות, פרטי הצוות והמתכונת הסופית יעודכנו לאחר שיושלמו ההיערכות והגיוס.",
    },
    routine: {
        id: "routine",
        icon: Clock3,
        title: "סדר יום והסתגלות",
        summary:
            "היום בנוי מעוגנים קבועים בין 07:30 ל־16:00, עם מעברים רגועים וגמישות בהתאם לצורכי הילדים.",
        details: [
            "07:30–08:15 · קבלת הילדים ומשחק בתיבות פעילות",
            "08:15–09:00 · ארוחת בוקר ומפגש בוקר עם תפילה ונושא נלמד",
            "09:00–11:25 · משחק, חצר, פרי, יצירה, היגיינה וג׳ימבורי",
            "11:25–12:00 · ארוחת צהריים והתארגנות לשינה",
            "12:00–14:00 · מנוחת צהריים",
            "14:00–16:00 · השכמה, ארוחת ביניים, מוזיקה, סיפור ומשחק עד לאיסוף",
        ],
        accordionItems: [
            {
                title: "תהליך ההסתגלות",
                content:
                    "ההסתגלות מתוכננת בצורה הדרגתית ורגועה, בתיאום עם המשפחה ובהתאם לגיל, לקצב ולהרגלים של כל ילד.",
            },
        ],
        note: "סדר היום הוא מסגרת מנחה ועשוי להשתנות במהלך היום לפי הקצב והצרכים של הילדים.",
    },
    menu: {
        id: "menu",
        icon: Utensils,
        title: "ארוחות ותפריט",
        summary:
            "זמני האוכל משתלבים ביום בקצב רגוע ובהתאמה לגיל הילדים ולמידע שנמסר לצוות.",
        details: [
            "ארוחת בוקר, הפסקת פרי ושתייה, ארוחת צהריים וארוחת ביניים",
            "התייחסות מסודרת לרגישויות, אלרגיות ומידע רפואי",
            "עדכון ההורים בכל מידע תזונתי שמצריך תשומת לב",
        ],
        note: "התפריט השבועי ומדיניות המזון המלאה יפורסמו לאחר שייקבעו סופית.",
    },
    health: {
        id: "health",
        icon: ShieldCheck,
        title: "בריאות, היגיינה וציוד אישי",
        summary:
            "טיפול עקבי ורגיש, מידע רפואי מסודר ונהלי בטיחות ברורים הם הבסיס לשגרה בטוחה במעון.",
        details: [
            "מידע רפואי, רגישויות ואנשי קשר לחירום נאספים בתהליך ההרשמה",
            "החתלה, היגיינה ומנוחה נעשות מתוך רגישות ובהתאם לצורכי הילד",
            "רשימת ציוד אישית ומסומנת תימסר לפני הכניסה למעון",
            "ההורים יעודכנו בנהלים הסופיים לפני תחילת הפעילות",
        ],
        accordionItems: [
            {
                title: "מחלות וחום",
                content:
                    "מדיניות ההגעה, החזרה למסגרת ועדכון ההורים תפורסם במסמך הנהלים.",
                isPlaceholder: true,
            },
            {
                title: "איסוף ילדים",
                content:
                    "רשימת מורשי איסוף ונוהל זיהוי מסודר יימסרו לפני הפתיחה.",
                isPlaceholder: true,
            },
            {
                title: "מקרי חירום וביטוח",
                content:
                    "נהלי התגובה ופרטי הכיסוי הביטוחי יתווספו לאחר השלמת ההיערכות.",
                isPlaceholder: true,
            },
        ],
    },
    payments: {
        id: "payments",
        icon: CreditCard,
        title: "תשלומים וביטולים",
        summary:
            "העלות והתנאים מוצגים למשפחה לפני השלמת ההרשמה והחתימה על ההסכם.",
        details: [
            `העלות החודשית הכוללת היא ${DAYCARE_MONTHLY_COST_LABEL}`,
            `הסכום מורכב מ־${DAYCARE_MONTHLY_TUITION_LABEL} שכר לימוד ו־${DAYCARE_MONTHLY_ADDITIONAL_FEE_LABEL} דמי שכלול`,
            `מקדמת הרישום לשריון מקום היא ${DAYCARE_REGISTRATION_DEPOSIT_LABEL} ומקוזזת מהחודש הראשון`,
        ],
        accordionItems: [
            {
                title: "עלות חודשית כוללת",
                content: `${DAYCARE_MONTHLY_COST_LABEL} לחודש, כולל שכר לימוד ודמי שכלול.`,
            },
            {
                title: "מקדמת רישום",
                content: `${DAYCARE_REGISTRATION_DEPOSIT_LABEL} לשריון מקום. המקדמה מקוזזת מהחודש הראשון ואינה תשלום נוסף מעבר לעלות החודשית.`,
            },
            {
                title: "אופן התשלום",
                content: "מועדי ואמצעי התשלום יימסרו בשיחת ההיכרות ובהסכם.",
                isPlaceholder: true,
            },
            {
                title: "מדיניות ביטול",
                content: "תנאי הביטול יופיעו בהסכם ההתקשרות לפני החתימה.",
                isPlaceholder: true,
            },
        ],
        note: "העמוד מציג תקציר בלבד. התנאים המחייבים יופיעו בהסכם ההתקשרות המלא.",
    },
    holidays: {
        id: "holidays",
        icon: CalendarDays,
        title: "חופשות ומועדים",
        summary:
            "לוח החופשות השנתי ירכז את ימי הפעילות, ערבי החג, החגים והחזרה לשגרה.",
        details: [
            "לוח החופשות עדיין לא פורסם",
            "לאחר אישורו ניתן יהיה לצפות בו באתר ולהוריד אותו כ־PDF",
        ],
        note: "יש להעלות את לוח החופשות המאושר לפני פרסום הטאב להורים.",
    },
    faq: {
        id: "faq",
        icon: MessageCircleQuestion,
        title: "שאלות נפוצות",
        summary: "תשובות קצרות לשאלות שעולות לפני הביקור וההרשמה.",
        details: [],
        kind: "faq",
    },
    documents: {
        id: "documents",
        icon: Files,
        title: "מסמכים להורדה",
        summary:
            "כל המסמכים החשובים ירוכזו כאן. קישור להורדה מופיע רק לאחר העלאת PDF תקין.",
        details: [],
        kind: "documents",
    },
};

export const faqItems: ParentInfoAccordionItem[] = [
    {
        title: "מה גודל הקבוצה?",
        content:
            "הכוונה היא לקבוצה קטנה ומוגבלת במספר המקומות, כדי לשמור על יחס אישי ותחושת בית. המספר הסופי יימסר בשיחת ההיכרות.",
    },
    {
        title: "מה כוללת העלות החודשית?",
        content: `העלות החודשית הכוללת היא ${DAYCARE_MONTHLY_COST_LABEL}: ${DAYCARE_MONTHLY_TUITION_LABEL} שכר לימוד ו־${DAYCARE_MONTHLY_ADDITIONAL_FEE_LABEL} דמי שכלול.`,
    },
    {
        title: "איך מתקיים הקשר עם ההורים?",
        content:
            "הדגש הוא על קשר אישי ושקוף, מקום קבוע לשאלות ועדכונים אחראיים לאורך התהליך ובמהלך השנה.",
    },
    {
        title: "מה צריך להביא בכל יום?",
        content:
            "רשימת ציוד מלאה ומסומנת תימסר לקראת הפתיחה, לאחר שנוהלי ההיגיינה והשגרה ייסגרו.",
    },
    {
        title: "מה קורה כאשר ילד חולה?",
        content:
            "מדיניות מחלות וחום תימסר במסמך הנהלים. במקרה שמצריך תשומת לב הצוות יעדכן את ההורים ישירות.",
    },
    {
        title: "האם ניתן להגיע לביקור לפני ההרשמה?",
        content:
            "כן. ביקור במעון הוא אחד השלבים בתהליך, בתיאום מראש לאחר שיחת היכרות.",
    },
    {
        title: "איך שומרים מקום?",
        content: `לאחר בדיקת התאמה ומילוי הטופס, משלימים מקדמת רישום בסך ${DAYCARE_REGISTRATION_DEPOSIT_LABEL}, המקוזזת מהחודש הראשון, וחותמים על ההסכם.`,
    },
];

export const daycareDocumentPaths = {
    agreement: "/documents/daycare/daycare-agreement.pdf",
    holidays: "/documents/daycare/daycare-holidays.pdf",
    menu: "/documents/daycare/daycare-menu.pdf",
    medical: "/documents/daycare/daycare-medical-form.pdf",
} as const;

// TODO: After uploading each verified PDF to client/public/documents/daycare,
// change only its pdfAvailable flag and optionally add updatedAt.
export const documents: ParentInfoDocument[] = [
    {
        id: "agreement",
        icon: FileSignature,
        title: "הסכם התקשרות",
        description:
            "הסכם המסדיר את תנאי ההרשמה, הפעילות, התשלום וההתקשרות עם המעון.",
        pdfPath: daycareDocumentPaths.agreement,
        pdfAvailable: false,
        onlinePath: "/daycare-parent-info?section=payments",
        onlineLabel: "קריאת תקציר באתר",
    },
    {
        id: "holidays",
        icon: CalendarDays,
        title: "לוח חופשות",
        description: "לוח החופשות השנתי של המעון.",
        pdfPath: daycareDocumentPaths.holidays,
        pdfAvailable: false,
        onlinePath: "/daycare-parent-info?section=holidays",
        onlineLabel: "צפייה באתר",
    },
    {
        id: "menu",
        icon: Utensils,
        title: "תפריט המעון",
        description: "דוגמה לארוחות ולתפריט המוגש במהלך השבוע.",
        pdfPath: daycareDocumentPaths.menu,
        pdfAvailable: false,
        onlinePath: "/daycare-parent-info?section=menu",
        onlineLabel: "צפייה באתר",
    },
    {
        id: "medical",
        icon: ClipboardPlus,
        title: "טופס פרטים רפואיים והרשאות",
        description:
            "הטופס נשלח למשפחה בתוך התיק האישי לאחר שיחת ההיכרות והביקור.",
        pdfPath: daycareDocumentPaths.medical,
        pdfAvailable: false,
    },
];

export const registrationSteps = [
    "השארת פרטים קצרה",
    "שיחת היכרות ובדיקת התאמה",
    "ביקור במעון",
    "פתיחת תיק אישי למשפחה",
    "מילוי פרטים וחתימה על הסכם",
    "תשלום מקדמה ושריון מקום",
    "שיבוץ ותיאום יום הסתגלות",
];

const legacySectionAliases: Record<string, ParentInfoSectionId> = {
    about: "general",
    team: "general",
    registration: "general",
    routine: "routine",
    meals: "menu",
    "sleep-hygiene": "health",
    safety: "health",
    payment: "payments",
};

export const resolveParentInfoSection = (
    value: string | null
): ParentInfoSectionId => {
    if (value && value in sections) {
        return value as ParentInfoSectionId;
    }

    if (value && value in legacySectionAliases) {
        return legacySectionAliases[value];
    }

    return "general";
};

export const whatsappPhone = "972537700339";
export const whatsappText =
    "שלום, קראתי את המידע להורים על מעון חב״ד יפו ויש לי שאלה.";
export const whatsappLink = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(
    whatsappText
)}`;
