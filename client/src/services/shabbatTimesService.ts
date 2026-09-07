import axios from "axios";
import type { HebcalResponse, ShabbatTimes } from "../types/chabad";

/* ================================
   API
================================ */

const HEB_CAL_URL =
    "https://www.hebcal.com/hebcal";

/* ================================
   Helpers
================================ */

const TIME_ZONE = "Asia/Jerusalem";

// Keep the weekly rollover on Sunday in Israel, regardless of the visitor's timezone.
export const getShabbatRange = (now = new Date()) => {
    const localDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
    }).format(now);
    const sunday = new Date(`${localDate}T12:00:00Z`);
    sunday.setUTCDate(sunday.getUTCDate() - sunday.getUTCDay());
    const dateAt = (offset: number) => {
        const date = new Date(sunday);
        date.setUTCDate(date.getUTCDate() + offset);
        return date.toISOString().slice(0, 10);
    };
    return { start: dateAt(0), friday: dateAt(5), end: dateAt(9) };
};

const formatGregorian = (d: Date): string =>
    new Intl.DateTimeFormat("en-GB", {
        timeZone: TIME_ZONE, day: "2-digit", month: "2-digit", year: "numeric",
    }).format(d);

const formatTime = (date: string): string =>
    new Intl.DateTimeFormat("he-IL", {
        timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).format(new Date(date));

const formatEventDate = (date: string): string =>
    new Intl.DateTimeFormat("he-IL", {
        timeZone: TIME_ZONE, weekday: "short", day: "numeric", month: "numeric",
    }).format(new Date(date));

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
        timeZone: TIME_ZONE,
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

export const parseShabbatTimes = (data: HebcalResponse, friday: string): ShabbatTimes => {
    if (!data || !Array.isArray(data.items)) {
        throw new Error("Hebcal לא החזיר נתונים תקינים");
    }
    const items = [...data.items].sort((a, b) => a.date.localeCompare(b.date));
    const timed = items.filter((item) => item.category === "candles" || item.category === "havdalah");
    const fridayIndex = timed.findIndex((item) =>
        item.category === "candles" && item.date.slice(0, 10) === friday);
    if (fridayIndex < 0) throw new Error("חסרים זמני כניסה או יציאה");

    // Include a preceding holiday when it runs directly into Shabbat.
    let start = fridayIndex;
    while (start > 0 && timed[start - 1].category === "candles") start--;
    const end = timed.findIndex((item, index) => index > fridayIndex && item.category === "havdalah");
    if (end < 0) throw new Error("חסרים זמני כניסה או יציאה");
    const events = timed.slice(start, end + 1);
    const first = events[0];
    const last = events[events.length - 1];
    const holidays = items.filter((item) => item.category === "holiday" && item.yomtov &&
        item.date >= first.date.slice(0, 10) && item.date <= last.date.slice(0, 10));
    const hasHoliday = holidays.length > 0;
    const parasha = items.find((item) => item.category === "parashat" &&
        item.date > friday && item.date <= last.date.slice(0, 10));
    const parashaName = parasha?.hebrew ?? parasha?.title ?? "";
    const candleDate = new Date(first.date);
    const firstDay = first.date.slice(0, 10);
    const followingDay = new Date(`${firstDay}T12:00:00Z`);
    followingDay.setUTCDate(followingDay.getUTCDate() + 1);
    const startsHoliday = holidays.some((holiday) => holiday.date === followingDay.toISOString().slice(0, 10));
    const entryLabel = firstDay === friday
        ? (startsHoliday ? "כניסת שבת וחג" : "כניסת שבת") : "כניסת החג";
    return {
        title: hasHoliday ? "זמני שבת וחג ביפו" : parashaName
            ? `שבת ${parashaName} ביפו` : "זמני שבת ביפו",
        hebrewDate: formatHebrewDate(candleDate),
        gregorianDate: formatGregorian(candleDate),
        events: events.map((item, index) => ({
            label: item.category === "havdalah"
                ? (holidays.some((holiday) => holiday.date === last.date.slice(0, 10))
                    ? "צאת החג" : "צאת שבת")
                : index === 0 ? entryLabel
                    : "הדלקת נרות",
            time: formatTime(item.date),
            date: formatEventDate(item.date),
        })),
    };
};

export const fetchShabbatTimes = async (): Promise<ShabbatTimes> => {
    try {
        const range = getShabbatRange();
        const { data } = await axios.get<HebcalResponse>(HEB_CAL_URL, {
            params: {
                v: 1, cfg: "json", geonameid: 293397, M: "on", c: "on",
                i: "on", maj: "on", s: "on", leyning: "off",
                start: range.start, end: range.end,
            },
            timeout: 12000,
            headers: { Accept: "application/json" },
        });
        return parseShabbatTimes(data, range.friday);
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