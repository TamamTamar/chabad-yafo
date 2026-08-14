const validAmbassadorRef = /^[a-z0-9]{4,32}$/;
const validAmbassadorIdentifier = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const commonHebrewNames: Record<string, string> = {
    אברהם: "avraham",
    אהרן: "aharon",
    אליהו: "eliyahu",
    דוד: "david",
    חנה: "chana",
    יעקב: "yaakov",
    יהודה: "yehuda",
    יוסף: "yosef",
    יצחק: "yitzchak",
    ישראל: "yisrael",
    כהן: "cohen",
    לוי: "levy",
    מאיר: "meir",
    מנחם: "menachem",
    מענדל: "mendel",
    מרדכי: "mordechai",
    משה: "moshe",
    מושקי: "mushky",
    נחמה: "nechama",
    רבקה: "rivka",
    רחל: "rachel",
    שמואל: "shmuel",
    שניאור: "shneur",
    שרה: "sara",
    תמר: "tamar",
    זלמן: "zalman",
};

const hebrewLetterTransliteration: Record<string, string> = {
    א: "a",
    ב: "b",
    ג: "g",
    ד: "d",
    ה: "h",
    ו: "v",
    ז: "z",
    ח: "ch",
    ט: "t",
    י: "y",
    כ: "k",
    ך: "k",
    ל: "l",
    מ: "m",
    ם: "m",
    נ: "n",
    ן: "n",
    ס: "s",
    ע: "a",
    פ: "p",
    ף: "f",
    צ: "tz",
    ץ: "tz",
    ק: "k",
    ר: "r",
    ש: "sh",
    ת: "t",
};

export const normalizeAmbassadorSlug = (value: string) =>
    value
        .normalize("NFKD")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60)
        .replace(/-+$/g, "");

export const transliterateAmbassadorName = (value: string) =>
    normalizeAmbassadorSlug(
        value
            .trim()
            .split(/\s+/)
            .map((word) => {
                const cleanWord = word.replace(/[^\u0590-\u05ffa-zA-Z0-9]/g, "");
                if (!cleanWord) return "";
                if (commonHebrewNames[cleanWord]) {
                    return commonHebrewNames[cleanWord];
                }
                return Array.from(cleanWord)
                    .map((letter) => hebrewLetterTransliteration[letter] ?? letter)
                    .join("");
            })
            .filter(Boolean)
            .join("-")
    );

export const buildAmbassadorLink = (
    origin: string,
    linkSlug: string,
    refCode: string
) => {
    const slug = normalizeAmbassadorSlug(linkSlug);
    const identifier = slug || `ambassador-${refCode}`;
    return `${origin}/daycare-donations/${identifier}`;
};

export const extractAmbassadorRef = (ambassadorLink?: string) => {
    const normalized = ambassadorLink?.trim().toLowerCase();
    if (!normalized) return undefined;
    return normalized.length <= 100 && validAmbassadorIdentifier.test(normalized)
        ? normalized
        : undefined;
};

export const normalizeAmbassadorRef = (value?: string | null) => {
    const normalized = value?.trim().toLowerCase();
    return normalized && validAmbassadorRef.test(normalized)
        ? normalized
        : undefined;
};
