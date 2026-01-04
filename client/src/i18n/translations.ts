export type Lang = "he" | "en";

export const translations = {
    he: {
        brand: 'בית חב״ד יפו',
        navLabel: "ניווט ראשי",
        activity: "פעילות",
        about: "אודות",
        contact: "צור קשר",
        donate: "תרומה",
        shabbat: "רישום לשבת",
        openMenu: "פתיחת תפריט",
        closeMenu: "סגירת תפריט",
        english: "English",
        hebrew: "עברית",
        whatsappText: "שלום, הגעתי מהאתר של בית חב״ד יפו ורציתי ליצור קשר.",
        heroAria: "פתיח בית חב״ד יפו",
        heroTitle: "בית חב״ד יפו",
        heroSubtitle: "הכתובת שלך לכל עניין יהודי",
        heroShabbat: "רישום לסעודת שבת",
        heroDonate: "תרומה לפעילות",

    },
    en: {
        brand: "Chabad of Jaffa",
        navLabel: "Main navigation",
        activity: "Activities",
        about: "About",
        contact: "Contact",
        donate: "Donate",
        shabbat: "Shabbat Registration",
        openMenu: "Open menu",
        closeMenu: "Close menu",
        english: "English",
        hebrew: "Hebrew",
        whatsappText: "Hi, I reached you through the Chabad of Jaffa website and would like to get in touch.",
        heroAria: "Chabad of Jaffa introduction",
        heroTitle: "Chabad of Jaffa",
        heroSubtitle: "Your home for every Jewish need",
        heroShabbat: "Shabbat Meal Registration",
        heroDonate: "Support Our Activities",
    },
} as const;

export const isLang = (v: string): v is Lang => v === "he" || v === "en";
