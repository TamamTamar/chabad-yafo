export interface ChabadHouseInfo {
    id: string;
    title: string;
    shaliach: string;
    address: string;
    phone: string;
    description: string;
}

export interface ServiceInfo {
    id: string;
    title: string;
    actionUrl: string;
}

export interface PageInfo {
    path: string;
    title: string;
    description: string;
}

export const CHABAD_YAFO_KNOWLEDGE = {
    organization: {
        name: "מרכז חב״ד יפו (ע״ר)",
        npoNumber: "580798684",
        mainPhone: "053-770-0339",
        cleanPhoneForWhatsApp: "972537700339",
        mainEmail: "LchabadYaffo@gmail.com",
        mainAddress: "עולי ציון 30, שוק הפשפשים, יפו",
        whatsAppUrl: "https://wa.me/972537700339",
        websiteUrl: "https://chabadyafo.org",
        description: "מרכז חב״ד יפו פועל למען הקהילה, פעילויות חסד, שבתות וחגים, שיעורים, מעון יום ושירותי יהדות בעיר."
    },

    branches: [
        {
            id: "center",
            title: "בית חב״ד המרכזי",
            shaliach: "הרב לוי יצחק תמם",
            address: "עולי ציון 30, שוק הפשפשים",
            phone: "053-770-0339",
            description: "המרכז הראשי בשוק הפשפשים ביפו."
        },
        {
            id: "tzahalon",
            title: "בית חב״ד שכונת צהלון",
            shaliach: "הרב מענדי חבקין",
            address: "מיכאלאנגלו 31, יפו",
            phone: "054-626-4195",
            description: "סניף שכונת צהלון."
        },
        {
            id: "kampus",
            title: "חב״ד בקמפוס",
            shaliach: "הרב שמוליק קפלן",
            address: "המכללה האקדמית יפו",
            phone: "053-302-4315",
            description: "חב״ד בקמפוס המכללה האקדמית יפו."
        }
    ] as ChabadHouseInfo[],

    // Aligned directly with client/src/components/OurService/OurService.tsx
    services: [
        {
            id: "tefillin-mezuzot",
            title: "תפילין ומזוזות",
            actionUrl: "https://wa.me/972537700339"
        },
        {
            id: "kosher-kitchen",
            title: "הכשרת מטבח",
            actionUrl: "https://wa.me/972537700339"
        },
        {
            id: "bar-mitzvah",
            title: "הכנה לבר מצווה",
            actionUrl: "https://wa.me/972537700339"
        },
        {
            id: "judaica",
            title: "חנות יודאיקה",
            actionUrl: "https://wa.me/972537700339"
        },
        {
            id: "mothers",
            title: "תמיכה ביולדות",
            actionUrl: "https://wa.me/972537700339"
        },
        {
            id: "home-store",
            title: "חנות הבית",
            actionUrl: "https://wa.me/972537700339"
        }
    ] as ServiceInfo[],

    pagesAndFeatures: [
        {
            path: "/",
            title: "עמוד הבית וזמני שבת",
            description: "זמני הדלקת נרות, צאת שבת ופרשת השבוע מופיעים בעמוד הבית של האתר."
        },
        {
            path: "/about",
            title: "אודות מרכז חב״ד יפו",
            description: "פרטים על פעילות מרכז חב״ד יפו."
        },
        {
            path: "/donate",
            title: "עמוד התרומות",
            description: "תרומה מאובטחת לפעילות מרכז חב״ד יפו."
        },
        {
            path: "/daycare-registration",
            title: "מעון חב״ד יפו",
            description: "טופס רישום ופרטים על מעון יום חב״ד יפו."
        },
        {
            path: "/daycare-parent-info",
            title: "מידע להורי המעון",
            description: "מידע ונהלים להורי ילדי המעון."
        },
        {
            path: "/families",
            title: "משפחות צעירות ביפו",
            description: "היכרות עם משפחות צעירות ביפו לצורך בניית פעילות קהילתית וחינוכית מותאמת."
        },
        {
            path: "/write-to-rebbe",
            title: "כתיבה לרבי מליובאוויטש",
            description: "שליחת מכתב או בקשת ברכה לרבי מליובאוויטש דרך האתר."
        },
        {
            path: "/gallery",
            title: "גלריה",
            description: "תמונות מאירועים ופעילויות ביפו."
        }
    ] as PageInfo[]
};

export const getKnowledgeContextText = (): string => {
    const org = CHABAD_YAFO_KNOWLEDGE.organization;
    const branches = CHABAD_YAFO_KNOWLEDGE.branches
        .map(b => `- ${b.title}: ${b.address} | שליח: ${b.shaliach} | טלפון: ${b.phone}`)
        .join("\n");
    const services = CHABAD_YAFO_KNOWLEDGE.services
        .map(s => `- ${s.title}`)
        .join("\n");
    const pages = CHABAD_YAFO_KNOWLEDGE.pagesAndFeatures
        .map(p => `- ${p.title} (${p.path}): ${p.description}`)
        .join("\n");

    return `=== מידע מאומת בלבד על בית חב״ד יפו ===
ארגון: ${org.name} (עמותה מס' ${org.npoNumber})
טלפון ראשי: ${org.mainPhone}
וואטסאפ: ${org.whatsAppUrl}
דוא"ל: ${org.mainEmail}
כתובת ראשית: ${org.mainAddress}

סניפים ושלוחים:
${branches}

שירותים המופיעים באתר (בפנייה לוואטסאפ):
${services}

עמודים באתר:
${pages}
`;
};
