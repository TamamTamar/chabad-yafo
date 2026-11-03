import { HDate } from "@hebcal/hdate";

export const writeToRebbeConfigs = {
    general: {
        occasion: "general",
        eyebrow: "כינוס השלוחים העולמי",
        title: "שליח בשבילכם",
        subtitle:
            "יש לי הזכות להשתתף בכינוס שלוחי חב״ד העולמי בבית הרבי מליובאוויטש בניו יורק. יחד עם אלפי שלוחים מכל העולם נתפלל בציונו הקדוש של הרבי עבור עם ישראל. אשמח להיות שליח גם בשבילכם ולהתפלל עבורכם ועבור יקיריכם. כאן תוכלו לשלוח אליי שמות לתפילה וברכה, בציון השם המלא ושם האם.",
        eventTitle: "",
        eventText: "",
    },

    kinusHashluchim: {
        occasion: "kinus-hashluchim",
        eyebrow: "כינוס השלוחים העולמי",
        title: "אלפי שלוחים. תפילה משותפת. הבקשה שלכם.",
        subtitle:
            "מכל קצוות תבל מתכנסים אלפי שלוחי חב״ד בניו יורק - ימים של אחדות, תפילה ושליחות, עם עם ישראל כולו בלב. לקראת נסיעתי לכינוס, אני מזמין אתכם לצרף גם את הבקשה שלכם למעמד המיוחד הזה. את השמות, התקוות והתפילות שתשלחו אביא איתי לאוהל הקדוש של הרבי מליובאוויטש, ואתפלל עבורכם ועבור יקיריכם, לרפואה, להצלחה ולבשורות טובות. בתוך התפילה הגדולה של כולנו, יש מקום גם לבקשה האישית שלכם.",
        eventTitle: "",
        eventText: "",
    },

    gimmelTammuz: {
        occasion: "gimmel-tammuz",
        eyebrow: "לקראת ג׳ תמוז",
        title: "כתבו לרבי",
        subtitle:
            "יום מיוחד לבקשות, תפילות והחלטות טובות.",
        eventTitle: "המכתבים יועברו לאוהל הקדוש",
        eventText:
            "המכתבים ייאספו ויועברו לקראת ג׳ תמוז.",
    },
    yudAlefNissan: {
        occasion: "yud-aleph-nissan",
        eyebrow: "לקראת י״א ניסן",
        title: "מתנה לרבי",
        subtitle:
            "לקראת יום הולדתו של הרבי, כתבו בקשה לברכה, הודיה או קבלה טובה והצטרפו למתנה רוחנית משותפת.",
        eventTitle: "המכתבים יועברו לאוהל הקדוש",
        eventText:
            "לקראת י״א ניסן נאסוף את המכתבים ונעבירם לאוהל הקדוש.",
    },
};

export type WriteToRebbeConfig = (typeof writeToRebbeConfigs)[keyof typeof writeToRebbeConfigs];

const KINUS_DURATION_DAYS = 14;

const ACTIVATION_DAYS_BEFORE_OCCASION = 7;

export const getWriteToRebbeConfig = (
    referenceDate = new Date(),
): WriteToRebbeConfig => {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jerusalem",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(referenceDate);
    const part = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((entry) => entry.type === type)!.value;
    const today = new HDate(new Date(
        Number(part("year")), Number(part("month")) - 1, Number(part("day")), 12,
    ));
    const currentDay = today.abs();

    const kinusStart = new HDate(20, "Cheshvan", today.getFullYear()).abs();
    if (currentDay >= kinusStart && currentDay < kinusStart + KINUS_DURATION_DAYS) {
        return writeToRebbeConfigs.kinusHashluchim;
    }

    for (const year of [today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1]) {
        const occasions = [
            { date: new HDate(3, "Tamuz", year), config: writeToRebbeConfigs.gimmelTammuz },
            { date: new HDate(11, "Nisan", year), config: writeToRebbeConfigs.yudAlefNissan },
        ];
        for (const { date, config } of occasions) {
            const daysUntilOccasion = date.abs() - currentDay;
            if (daysUntilOccasion >= 0 && daysUntilOccasion <= ACTIVATION_DAYS_BEFORE_OCCASION) {
                return config;
            }
        }
    }

    return writeToRebbeConfigs.general;
};
