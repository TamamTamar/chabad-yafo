import axios from "axios";
import type { HebcalResponse, ShabbatTimes } from "../types/chabad";

/* ================================
   API
================================ */

const HEB_CAL_URL =
    "https://www.hebcal.com/shabbat?cfg=json&geonameid=293397&M=on";

/* ================================
   Helpers
================================ */

const getTimeFromTitle = (title: string): string => {
    const parts = title.split(": ");
    return parts.length > 1 ? parts[1] : title;
};

/* ---------- Gregorian ---------- */

const formatGregorian = (d: Date): string => {
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
};

/* ---------- Hebrew Numbers (גימטריה עם גרשיים) ---------- */

const GERESH = "׳";
const GERSHAYIM = "״";

const hebrewGematria = (num: number): string => {
    if (!Number.isFinite(num) || num <= 0) return String(num);

    const ones = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
    const tens = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
    const hundreds = ["", "ק", "ר", "ש", "ת"];

    let n = num;
    let result = "";

    while (n >= 400) {
        result += "ת";
        n -= 400;
    }

    if (n >= 100) {
        result += hundreds[Math.floor(n / 100)];
        n %= 100;
    }

    if (n === 15) {
        result += "טו";
        n = 0;
    } else if (n === 16) {
        result += "טז";
        n = 0;
    }

    if (n >= 10) {
        result += tens[Math.floor(n / 10)];
        n %= 10;
    }

    if (n > 0) {
        result += ones[n];
    }

    if (result.length === 1) {
        return `${result}${GERESH}`;
    }

    const last = result.slice(-1);
    const rest = result.slice(0, -1);
    return `${rest}${GERSHAYIM}${last}`;
};

/* ---------- Hebrew Date ---------- */

const formatHebrewDate = (d: Date): string => {
    const parts = new Intl.DateTimeFormat("he-IL-u-ca-hebrew", {
        day: "numeric",
        month: "long",
        year: "numeric",
    }).formatToParts(d);

    const dayNum = Number(parts.find((p) => p.type === "day")?.value);
    const month = parts.find((p) => p.type === "month")?.value ?? "";
    const yearNum = Number(parts.find((p) => p.type === "year")?.value);

    const dayHeb = hebrewGematria(dayNum);
    const yearShort = yearNum % 1000;
    const yearHeb = hebrewGematria(yearShort);

    return `${dayHeb} ב${month} ${yearHeb}`;
};

/* ================================
   Main Fetch
================================ */

export const fetchShabbatTimes = async (): Promise<ShabbatTimes> => {
    try {
        const { data } = await axios.get<HebcalResponse>(HEB_CAL_URL, {
            timeout: 12000,
            headers: { Accept: "application/json" },
        });

        if (!data || !Array.isArray(data.items)) {
            throw new Error("Hebcal לא החזיר נתונים תקינים");
        }

        const candles = data.items.find((i) => i.category === "candles");
        const havdalah = data.items.find((i) => i.category === "havdalah");
        const parasha = data.items.find((i) => i.category === "parashat");

        if (!candles || !havdalah) {
            throw new Error("חסרים זמני כניסה או יציאה");
        }

        const candleDate = new Date(candles.date);

        return {
            parasha: parasha?.hebrew ?? parasha?.title ?? "",
            candles: getTimeFromTitle(candles.title),
            havdalah: getTimeFromTitle(havdalah.title),
            hebrewDate: formatHebrewDate(candleDate),
            gregorianDate: formatGregorian(candleDate),
        };
    } catch (error: unknown) {
        console.error("fetchShabbatTimes error:", error);

        if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            throw new Error(status ? `שגיאה מהשרת (${status})` : error.message);
        }

        if (error instanceof Error) {
            throw error;
        }

        throw new Error("שגיאה בטעינת זמני שבת");
    }
};