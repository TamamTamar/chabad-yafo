import type {
    DonationCategory,
    DonationItem,
    DonationItemStatus,
    FieldGalleryItem,
} from "./types";

export const CAMPAIGN_GOAL = 100_000;
export const GENERAL_DONATIONS_RAISED = 2_700;

export const categories: DonationCategory[] = [
    {
        id: "renovation",
        title: "שיפוץ, בנייה ותשתיות",
        description:
            "מכינים את המבנה והופכים אותו למקום נקי, יציב ובטוח שמותאם לילדים.",
        goal: 42_000,
        visual: {
            src: "/daycare-donations/renovation-work.webp",
            alt: "עבודות שיפוץ ותשתיות במעון",
            placeholderLabel: "תמונת שיפוץ ותשתיות",
            tone: "blue",
        },
    },
    {
        id: "kitchen",
        title: "מטבח ושירותים",
        description:
            "מקימים את החללים שישמשו את הילדים ואת הצוות בכל יום מחדש.",
        goal: 12_000,
        visual: {
            src: "/daycare-donations/kitchen-installed.webp",
            alt: "המטבח החדש במהלך ההרכבה במעון",
            placeholderLabel: "הדמיית המטבח",
            tone: "sand",
        },
    },
    {
        id: "yard",
        title: "חצר ובטיחות",
        description:
            "יוצרים מרחב מוגן שבו הילדים יוכלו לרוץ, לשחק ולגלות את העולם.",
        goal: 15_700,
        visual: {
            src: "/daycare-donations/hero.webp",
            alt: "חצר המעון במהלך עבודות השיפוץ",
            placeholderLabel: "תמונת החצר וההצללה",
            tone: "sage",
        },
    },
    {
        id: "equipment",
        title: "ריהוט וציוד",
        description:
            "ממלאים את המעון בפריטים שיהפכו אותו לבית פעיל, נעים ומזמין.",
        goal: 14_500,
        visual: {
            src: "/daycare-donations/equipment-work.webp",
            alt: "הרכבת ציוד וארונות במעון",
            placeholderLabel: "צילום הרכבת הציוד",
            tone: "gold",
        },
    },
    {
        id: "completion",
        title: "השלמות",
        description:
            "דואגים שגם הפרטים שמתגלים בדרך לא יעכבו את פתיחת הדלתות.",
        goal: 15_800,
        visual: {
            src: "/daycare-donations/completion-work.webp",
            alt: "פרטים אחרונים בתהליך הקמת המעון",
            placeholderLabel: "תמונת ההשלמות",
            tone: "sky",
        },
    },
];

export const donationItems: DonationItem[] = [
    {
        id: "demolition",
        categoryId: "renovation",
        title: "פירוק מבנים ארעיים",
        description:
            "מפנים את הישן כדי לפנות מקום למעון החדש של ילדי יפו.",
        goal: 3_000,
        raised: 3_000,
        acceptingDonations: false,
        visual: {
            src: "/daycare-donations/demolition.webp",
            alt: "פינוי ופירוק ראשוני במבנה המעון",
            placeholderLabel: "צילום הפינוי והפירוק",
            tone: "sand",
        },
    },
    {
        id: "painting",
        categoryId: "renovation",
        title: "שפכטל וצביעת קירות",
        description:
            "עוטפים את הילדים בקירות נקיים, בהירים ושמחים.",
        goal: 10_500,
        raised: 6_300,
        acceptingDonations: true,
        visual: {
            src: "/daycare-donations/wall-prep.webp",
            alt: "עבודות תיקון וצביעת קירות במעון",
            placeholderLabel: "צילום הקירות בשיפוץ",
            tone: "gold",
        },
    },
    {
        id: "drywall",
        categoryId: "renovation",
        title: "עבודות גבס, תקרה וחיפויים",
        description:
            "יוצרים חלל שלם ונעים — מהתקרה ועד הפרט האחרון.",
        goal: 12_500,
        raised: 2_500,
        acceptingDonations: true,
        visual: {
            src: "/daycare-donations/ceiling-structure.webp",
            alt: "עבודות גבס ותקרה במעון",
            placeholderLabel: "צילום עבודות הגבס",
            tone: "blue",
        },
    },
    {
        id: "storage",
        categoryId: "renovation",
        title: "בניית ארון אחסון",
        description:
            "נותנים לכל משחק ולכל חומר יצירה מקום מסודר משלו.",
        goal: 6_000,
        raised: 1_200,
        acceptingDonations: true,
        visual: {
            src: "/daycare-donations/equipment-work.webp",
            alt: "ארונות וציוד במהלך ההרכבה במעון",
            placeholderLabel: "הדמיית אזור האחסון",
            tone: "sage",
        },
    },
    {
        id: "electricity",
        categoryId: "renovation",
        title: "תשתיות חשמל ושקעים בטיחותיים",
        description:
            "דואגים שכל נקודת חשמל תהיה מוגנת ומתאימה לסביבה של ילדים.",
        goal: 10_000,
        raised: 8_100,
        acceptingDonations: true,
        visual: {
            src: "/daycare-donations/electric-infrastructure.webp",
            alt: "תשתיות החשמל הבטיחותיות במעון",
            placeholderLabel: "צילום תשתיות החשמל",
            tone: "sky",
        },
    },
    {
        id: "plumbing",
        categoryId: "kitchen",
        title: "אינסטלציה ושירותים",
        description:
            "מתאימים כיורים ושירותים קטנים, נוחים ובטוחים לילדים.",
        goal: 2_000,
        raised: 1_500,
        acceptingDonations: true,
        visual: {
            src: "/daycare-donations/bathroom.webp",
            alt: "אזור השירותים והכיורים המיועד לילדים",
            placeholderLabel: "צילום השירותים והכיורים",
            tone: "sky",
        },
    },
    {
        id: "daycare-kitchen",
        categoryId: "kitchen",
        title: "מטבח, ארונות, כיור ושיש",
        description:
            "מקימים את המטבח שבו יכינו לילדים אוכל חם ומזין בכל יום.",
        goal: 10_000,
        raised: 3_600,
        acceptingDonations: true,
        visual: {
            src: "/daycare-donations/kitchen-installed.webp",
            alt: "המטבח החדש לאחר הרכבת הארונות",
            placeholderLabel: "הדמיית המטבח המתוכנן",
            tone: "sand",
        },
    },
    {
        id: "grass",
        categoryId: "yard",
        title: "דשא סינטטי",
        description:
            "מעניקים לרגליים הקטנות משטח רך ונעים למשחק בחצר.",
        goal: 1_500,
        raised: 1_500,
        acceptingDonations: false,
        visual: {
            src: "/daycare-donations/yard-cleared.webp",
            alt: "שטח החצר לאחר הפינוי ולפני התקנת המשטח",
            placeholderLabel: "הדמיית משטח המשחק",
            tone: "sage",
        },
    },
    {
        id: "lighting",
        categoryId: "yard",
        title: "תאורה וגופי תאורה",
        description:
            "מאירים את החדרים ואת החצר באור חם, נעים ובטוח.",
        goal: 2_000,
        raised: 900,
        acceptingDonations: true,
        visual: {
            src: "/daycare-donations/lighting-room.webp",
            alt: "חלל המעון לפני השלמת גופי התאורה",
            placeholderLabel: "צילום התאורה המתוכננת",
            tone: "gold",
        },
    },
    {
        id: "yard-renovation",
        categoryId: "yard",
        title: "שיפוץ החצר והשטח החיצוני",
        description:
            "הופכים את שטח החוץ לחצר מזמינה שבה הילדים יוכלו לרוץ ולשחק.",
        goal: 2_200,
        raised: 2_200,
        acceptingDonations: false,
        visual: {
            src: "/daycare-donations/hero.webp",
            alt: "החצר והשטח החיצוני של המעון",
            placeholderLabel: "צילום החצר כיום",
            tone: "sand",
        },
    },
    {
        id: "security",
        categoryId: "yard",
        title: "מערכת מצלמות ואבטחה",
        description:
            "שומרים על הילדים ועל המעון לאורך כל שעות היום.",
        goal: 8_000,
        raised: 2_400,
        acceptingDonations: true,
        visual: {
            src: "/daycare-donations/entrance.webp",
            alt: "הכניסה והמרחבים שעליהם תגן מערכת האבטחה",
            placeholderLabel: "צילום הכניסה למעון",
            tone: "blue",
        },
    },
    {
        id: "shade",
        categoryId: "yard",
        title: "הצללה ורשת בטיחות לחצר",
        description:
            "יוצרים חצר מוצלת ומוגנת שאפשר ליהנות ממנה בבטחה.",
        goal: 2_000,
        raised: 1_600,
        acceptingDonations: true,
        visual: {
            src: "/daycare-donations/ceiling-structure.webp",
            alt: "מבנה התקרה והקורות במהלך השיפוץ",
            placeholderLabel: "הדמיית ההצללה בחצר",
            tone: "sage",
        },
    },
    {
        id: "air-conditioning",
        categoryId: "equipment",
        title: "מיזוג אוויר",
        description:
            "דואגים שלילדים יהיה נעים במעון גם בימים החמים של יפו.",
        goal: 4_000,
        raised: 4_000,
        acceptingDonations: false,
        visual: {
            src: "/daycare-donations/air-conditioning.webp",
            alt: "חלל המעון שבו יותקן מיזוג האוויר",
            placeholderLabel: "הדמיית החלל הממוזג",
            tone: "sky",
        },
    },
    {
        id: "furniture",
        categoryId: "equipment",
        title: "ריהוט וציוד כללי למעון",
        description:
            "ממלאים את המעון בשולחנות, כיסאות ומשחקים שמזמינים ללמוד וליצור.",
        goal: 10_500,
        raised: 2_600,
        acceptingDonations: true,
        visual: {
            alt: "הדמיית החלל המרוהט והמאובזר של המעון",
            placeholderLabel: "הדמיית הריהוט והציוד",
            tone: "gold",
        },
    },
    {
        id: "unexpected",
        categoryId: "completion",
        title: "הוצאות בלתי צפויות והשלמות",
        description:
            "משאירים מרחב בטוח להשלמות שיתגלו בדרך, כדי שנוכל לפתוח בזמן.",
        goal: 15_800,
        raised: 900,
        acceptingDonations: true,
        visual: {
            src: "/daycare-donations/completion-work.webp",
            alt: "פרטים אחרונים בתהליך הקמת המעון",
            placeholderLabel: "קולאז׳ פרטים מהשיפוץ",
            tone: "blue",
        },
    },
];

export const fieldGalleryItems: FieldGalleryItem[] = [
    {
        id: "gallery-space",
        title: "החלל שמתחיל להשתנות",
        caption: "כאן ייבנה המרחב המרכזי שבו הילדים ישחקו, ילמדו וייצרו.",
        visual: {
            src: "/daycare-donations/before-main.webp",
            alt: "החלל המרכזי במעון לפני השיפוץ",
            placeholderLabel: "תמונת החלל לפני השיפוץ",
            tone: "sand",
        },
    },
    {
        id: "gallery-walls",
        title: "מתחילים מהקירות",
        caption: "יישור, תיקון וצביעה יהפכו את החלל לנקי, בהיר ומזמין.",
        visual: {
            src: "/daycare-donations/wall-prep.webp",
            alt: "קירות המעון במהלך עבודות השיפוץ",
            placeholderLabel: "תמונת קירות בתהליך",
            tone: "gold",
        },
    },
    {
        id: "gallery-kitchen",
        title: "כאן יקום המטבח",
        caption: "פינה יומיומית שתאפשר לצוות להכין לילדים אוכל חם ומזין.",
        visual: {
            src: "/daycare-donations/kitchen-installed.webp",
            alt: "האזור המיועד למטבח במעון",
            placeholderLabel: "תמונת אזור המטבח",
            tone: "sky",
        },
    },
    {
        id: "gallery-yard",
        title: "החצר של הילדים",
        caption: "השטח הזה יהפוך לחצר מוצלת, רכה ובטוחה למשחק.",
        visual: {
            src: "/daycare-donations/hero.webp",
            alt: "חצר המעון לפני השיפוץ",
            placeholderLabel: "תמונת החצר כיום",
            tone: "sage",
        },
    },
    {
        id: "gallery-render",
        title: "העבודה כבר בעיצומה",
        caption: "ארון אחר ארון, פרט אחר פרט — החלל החדש מתחיל לקבל צורה.",
        visual: {
            src: "/daycare-donations/renovation-work.webp",
            alt: "עובדים מרכיבים את ארונות המעון",
            placeholderLabel: "צילום מתהליך העבודה",
            tone: "blue",
        },
    },
    {
        id: "gallery-details",
        title: "כל פרט נבחר באהבה",
        caption: "מהתאורה ועד הריהוט — כל בחירה נעשית מתוך מחשבה על הילדים.",
        visual: {
            src: "/daycare-donations/bathroom.webp",
            alt: "פרטים מתהליך תכנון המעון",
            placeholderLabel: "תמונת פרטים מהתהליך",
            tone: "gold",
        },
    },
];

export const getDonationItemStatus = (
    item: Pick<DonationItem, "goal" | "raised" | "statusOverride">
): DonationItemStatus => {
    if (item.statusOverride === "open") return "open";
    if (item.statusOverride === "closed") return "closed";

    const progress = item.goal > 0 ? item.raised / item.goal : 0;

    if (progress >= 1) return "complete";
    if (progress >= 0.8) return "almost";
    return "open";
};

export const getProgressPercent = (
    item: Pick<DonationItem, "goal" | "raised">
) => Math.min(100, Math.max(0, Math.round((item.raised / item.goal) * 100)));

export const allocatedRaised = donationItems.reduce(
    (total, item) => total + item.raised,
    0
);

export const campaignRaised = allocatedRaised + GENERAL_DONATIONS_RAISED;

export const completedItemsCount = donationItems.filter(
    (item) => getDonationItemStatus(item) === "complete"
).length;
