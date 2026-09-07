import heroImage from "../../assets/yizkor-hero.png";
import type { DonationCampaignConfig } from "../Campaign/types";

export const yizkorConfig: DonationCampaignConfig = {
    slug: "yizkor",
    shaliachName: "בית חב״ד יפו",
    yearLabel: "לעילוי נשמת יקיריכם",
    heroImage,
    heroVariant: "compact",
    title: "יזכור",
    paragraphs: [
        "תפילת יזכור נאמרת לזכר בני משפחה וקרובים שנפטרו. בתפילה מזכירים את נשמתם ומבקשים שתהיה צרורה בצרור החיים.",
    ],
    presetAmounts: [],
    allowCustomAmount: true,
    collectBlessingNames: false,
    showCalculator: false,
    preparation: {
        sections: [
            {
                title: "מתי אומרים יזכור?",
                paragraphs: ["את תפילת יזכור אומרים ביום הכיפורים, בשמיני עצרת, בשביעי של פסח ובחג השבועות."],
                occasions: ["יום הכיפורים", "שמיני עצרת", "שביעי של פסח", "חג השבועות"],
            },
            {
                title: "לפני יזכור",
                variant: "note",
                paragraphs: [
                    "בתפילת יזכור אנחנו זוכרים את יקירינו שנפטרו ומזכירים אותם בתפילה.",
                    "נהוג לתת צדקה לעילוי נשמת הנפטרים כחלק ממנהג יזכור.",
                ],
            },
        ],
        donation: {
            title: "דמי יזכור",
            paragraphs: [
                "ניתן לתת דמי יזכור לבית חב״ד יפו לעילוי נשמת יקיריכם.",
                "התרומה מסייעת לפעילות בית חב״ד לאורך השנה וניתנת לעילוי נשמת הנפטרים.",
            ],
            buttonLabel: "לתשלום דמי יזכור",
            defaultAmount: 28,
        },
    },
    nedarim: {
        Mosad: import.meta.env.VITE_NEDARIM_MOSAD,
        ApiValid: import.meta.env.VITE_NEDARIM_API_VALID,
        Currency: "1",
        PaymentType: "Ragil",
        Comment: "דמי יזכור",
    },
};
