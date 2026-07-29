import type { DaycareDonationCampaignDocument } from "../types/daycareDonations";

export const DAYCARE_DONATION_CAMPAIGN_SLUG = "daycare-2026";

export const defaultDaycareDonationCampaign: DaycareDonationCampaignDocument = {
    slug: DAYCARE_DONATION_CAMPAIGN_SLUG,
    title: "מקימים יחד את מעון חב״ד יפו",
    goal: 100_000,
    active: true,
    categories: [
        {
            id: "renovation",
            title: "שיפוץ, בנייה ותשתיות",
            shortTitle: "שיפוץ ותשתיות",
            description:
                "מכינים את המבנה והופכים אותו למקום נקי, יציב ובטוח שמותאם לילדים.",
            goal: 42_000,
            order: 1,
            visual: {
                src: "/daycare-donations/renovation-work.webp",
                alt: "עבודות שיפוץ ותשתיות במעון",
            },
        },
        {
            id: "kitchen",
            title: "מטבח ושירותים",
            shortTitle: "מטבח",
            description:
                "מקימים את החללים שישמשו את הילדים ואת הצוות בכל יום מחדש.",
            goal: 12_000,
            order: 2,
            visual: {
                src: "/daycare-donations/kitchen-installed.webp",
                alt: "המטבח החדש במהלך ההרכבה במעון",
            },
        },
        {
            id: "yard",
            title: "חצר ובטיחות",
            shortTitle: "חצר",
            description:
                "יוצרים מרחב מוגן שבו הילדים יוכלו לרוץ, לשחק ולגלות את העולם.",
            goal: 15_700,
            order: 3,
            visual: {
                src: "/daycare-donations/hero.webp",
                alt: "חצר המעון במהלך עבודות השיפוץ",
            },
        },
        {
            id: "equipment",
            title: "ריהוט וציוד",
            shortTitle: "ריהוט",
            description:
                "ממלאים את המעון בפריטים שיהפכו אותו לבית פעיל, נעים ומזמין.",
            goal: 14_500,
            order: 4,
            visual: {
                src: "/daycare-donations/equipment-work.webp",
                alt: "הרכבת ציוד וארונות במעון",
            },
        },
        {
            id: "completion",
            title: "השלמות",
            shortTitle: "השלמות",
            description:
                "דואגים שגם הפרטים שמתגלים בדרך לא יעכבו את פתיחת הדלתות.",
            goal: 15_800,
            order: 5,
            visual: {
                src: "/daycare-donations/completion-work.webp",
                alt: "פרטים אחרונים בתהליך הקמת המעון",
            },
        },
    ],
    items: [
        {
            id: "demolition",
            categoryId: "renovation",
            title: "פירוק מבנים ארעיים",
            description:
                "מפנים את הישן כדי לפנות מקום למעון החדש של ילדי יפו.",
            goal: 3_000,
            order: 1,
            openingPriority: 8,
            acceptingDonations: true,
            statusOverride: "auto",
            visual: {
                src: "/daycare-donations/demolition.webp",
                alt: "פינוי ופירוק ראשוני במבנה המעון",
            },
        },
        {
            id: "painting",
            categoryId: "renovation",
            title: "שפכטל וצביעת קירות",
            description:
                "עוטפים את הילדים בקירות נקיים, בהירים ושמחים.",
            goal: 10_500,
            order: 2,
            openingPriority: 7,
            acceptingDonations: true,
            statusOverride: "auto",
            visual: {
                src: "/daycare-donations/wall-prep.webp",
                alt: "עבודות תיקון וצביעת קירות במעון",
            },
        },
        {
            id: "drywall",
            categoryId: "renovation",
            title: "עבודות גבס, תקרה וחיפויים",
            description:
                "יוצרים חלל שלם ונעים — מהתקרה ועד הפרט האחרון.",
            goal: 12_500,
            order: 3,
            openingPriority: 8,
            acceptingDonations: true,
            statusOverride: "auto",
            visual: {
                src: "/daycare-donations/ceiling-structure.webp",
                alt: "עבודות גבס ותקרה במעון",
            },
        },
        {
            id: "storage",
            categoryId: "renovation",
            title: "בניית ארון אחסון",
            description:
                "נותנים לכל משחק ולכל חומר יצירה מקום מסודר משלו.",
            goal: 6_000,
            order: 4,
            openingPriority: 9,
            acceptingDonations: true,
            statusOverride: "auto",
            visual: {
                src: "/daycare-donations/equipment-work.webp",
                alt: "ארונות וציוד במהלך ההרכבה במעון",
            },
        },
        {
            id: "electricity",
            categoryId: "renovation",
            title: "תשתיות חשמל ושקעים בטיחותיים",
            description:
                "דואגים שכל נקודת חשמל תהיה מוגנת ומתאימה לסביבה של ילדים.",
            goal: 10_000,
            order: 5,
            openingPriority: 1,
            acceptingDonations: true,
            statusOverride: "auto",
            visual: {
                src: "/daycare-donations/electric-infrastructure.webp",
                alt: "תשתיות החשמל הבטיחותיות במעון",
            },
        },
        {
            id: "plumbing",
            categoryId: "kitchen",
            title: "אינסטלציה ושירותים",
            description:
                "מתאימים כיורים ושירותים קטנים, נוחים ובטוחים לילדים.",
            goal: 2_000,
            order: 1,
            openingPriority: 2,
            acceptingDonations: true,
            statusOverride: "auto",
            visual: {
                src: "/daycare-donations/bathroom.webp",
                alt: "אזור השירותים והכיורים המיועד לילדים",
            },
        },
        {
            id: "daycare-kitchen",
            categoryId: "kitchen",
            title: "מטבח, ארונות, כיור ושיש",
            description:
                "מקימים את המטבח שבו יכינו לילדים אוכל חם ומזין בכל יום.",
            goal: 10_000,
            order: 2,
            openingPriority: 6,
            acceptingDonations: true,
            statusOverride: "auto",
            visual: {
                src: "/daycare-donations/kitchen-installed.webp",
                alt: "המטבח החדש לאחר הרכבת הארונות",
            },
        },
        {
            id: "grass",
            categoryId: "yard",
            title: "דשא סינטטי",
            description:
                "מעניקים לרגליים הקטנות משטח רך ונעים למשחק בחצר.",
            goal: 1_500,
            order: 1,
            openingPriority: 6,
            acceptingDonations: true,
            statusOverride: "auto",
            visual: {
                src: "/daycare-donations/yard-cleared.webp",
                alt: "שטח החצר לאחר הפינוי ולפני התקנת המשטח",
            },
        },
        {
            id: "lighting",
            categoryId: "yard",
            title: "תאורה וגופי תאורה",
            description:
                "מאירים את החדרים ואת החצר באור חם, נעים ובטוח.",
            goal: 2_000,
            order: 2,
            openingPriority: 5,
            acceptingDonations: true,
            statusOverride: "auto",
            visual: {
                src: "/daycare-donations/lighting-room.webp",
                alt: "חלל המעון לפני השלמת גופי התאורה",
            },
        },
        {
            id: "yard-renovation",
            categoryId: "yard",
            title: "שיפוץ החצר והשטח החיצוני",
            description:
                "הופכים את שטח החוץ לחצר מזמינה שבה הילדים יוכלו לרוץ ולשחק.",
            goal: 2_200,
            order: 3,
            openingPriority: 7,
            acceptingDonations: true,
            statusOverride: "auto",
            visual: {
                src: "/daycare-donations/hero.webp",
                alt: "החצר והשטח החיצוני של המעון",
            },
        },
        {
            id: "security",
            categoryId: "yard",
            title: "מערכת מצלמות ואבטחה",
            description:
                "שומרים על הילדים ועל המעון לאורך כל שעות היום.",
            goal: 8_000,
            order: 4,
            openingPriority: 4,
            acceptingDonations: true,
            statusOverride: "auto",
            visual: {
                src: "/daycare-donations/entrance.webp",
                alt: "הכניסה והמרחבים שעליהם תגן מערכת האבטחה",
            },
        },
        {
            id: "shade",
            categoryId: "yard",
            title: "הצללה ורשת בטיחות לחצר",
            description:
                "יוצרים חצר מוצלת ומוגנת שאפשר ליהנות ממנה בבטחה.",
            goal: 2_000,
            order: 5,
            openingPriority: 3,
            acceptingDonations: true,
            statusOverride: "auto",
            visual: {
                src: "/daycare-donations/ceiling-structure.webp",
                alt: "מבנה התקרה והקורות במהלך השיפוץ",
            },
        },
        {
            id: "air-conditioning",
            categoryId: "equipment",
            title: "מיזוג אוויר",
            description:
                "דואגים שלילדים יהיה נעים במעון גם בימים החמים של יפו.",
            goal: 4_000,
            order: 1,
            openingPriority: 5,
            acceptingDonations: true,
            statusOverride: "auto",
            visual: {
                src: "/daycare-donations/air-conditioning.webp",
                alt: "חלל המעון שבו יותקן מיזוג האוויר",
            },
        },
        {
            id: "furniture",
            categoryId: "equipment",
            title: "ריהוט וציוד כללי למעון",
            description:
                "ממלאים את המעון בשולחנות, כיסאות ומשחקים שמזמינים ללמוד וליצור.",
            goal: 10_500,
            order: 2,
            openingPriority: 10,
            acceptingDonations: true,
            statusOverride: "auto",
            visual: {
                alt: "הדמיית החלל המרוהט והמאובזר של המעון",
            },
        },
        {
            id: "unexpected",
            categoryId: "completion",
            title: "הוצאות בלתי צפויות והשלמות",
            description:
                "משאירים מרחב בטוח להשלמות שיתגלו בדרך, כדי שנוכל לפתוח בזמן.",
            goal: 15_800,
            order: 1,
            openingPriority: 11,
            acceptingDonations: true,
            statusOverride: "auto",
            visual: {
                src: "/daycare-donations/completion-work.webp",
                alt: "פרטים אחרונים בתהליך הקמת המעון",
            },
        },
    ],
};
