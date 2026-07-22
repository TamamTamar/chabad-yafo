import { HDate } from "@hebcal/hdate";
import { getHolidaysForYearArray } from "@hebcal/core/dist/esm/holidays";
import type { DonationCampaignConfig } from "../Campaign/types";
import heroImg from "../../assets/taanit-hero.png";

type FastDayKey =
  | "tzomGedaliah"
  | "asaraBTevet"
  | "taanitEsther"
  | "shivaaAsarBetammuz"
  | "tishaBeav";

type FastDayDefinition = {
  eventName: string;
  displayName: string;
  config: Omit<DonationCampaignConfig, "yearLabel">;
};

const ISRAEL_TIME_ZONE = "Asia/Jerusalem";
const ACTIVATION_DAYS_BEFORE_FAST = 2;

const fastDayTzedakahText =
  "בימי התענית נהוג לתרום לצדקה את עלות הארוחות שנחסכו. חז״ל אומרים שאת עיקר השכר מקבלים המתענים בזכות הצדקה שנותנים לעניים ונזקקים, כמאמר הגמרא: <strong>״אגרא דתעניתא - צדקתא״</strong>. תרומת התענית היא גם סגולה שיתקבלו התפילות והתעניות לרצון לפני הקדוש ברוך הוא.";

const sharedConfig = {
  shaliachName: 'בית חב״ד יפו',
  heroImage: heroImg,
  heroVariant: "compact" as const,
  isCompact: true,
  showCalculator: false,
  presetAmounts: [],
  allowCustomAmount: true,
};

const makeNedarimConfig = (comment: string) => ({
  Mosad: import.meta.env.VITE_NEDARIM_MOSAD,
  ApiValid: import.meta.env.VITE_NEDARIM_API_VALID,
  Currency: "1" as const,
  Comment: comment,
  PaymentType: "Ragil",
});

const fastDayDefinitions: Record<FastDayKey, FastDayDefinition> = {
  tzomGedaliah: {
    eventName: "Tzom Gedaliah",
    displayName: "צום גדליה",
    config: {
      ...sharedConfig,
      slug: "taanit-tzom-gedaliah",
      title: "צום גדליה - מוסיפים בצדקה",
      paragraphs: [
        "צום גדליה חל בעשרת ימי תשובה, זמן של תפילה, חשבון נפש ותוספת במעשים טובים.",
        fastDayTzedakahText,
        "התרומה שלכם מחזקת את פעילות בית חב״ד יפו ומסייעת למשפחות ולנזקקים בעיר.",
      ],
      nedarim: makeNedarimConfig("צדקה ליום צום - צום גדליה"),
    },
  },
  asaraBTevet: {
    eventName: "Asara B'Tevet",
    displayName: "עשרה בטבת",
    config: {
      ...sharedConfig,
      slug: "taanit-asara-betevet",
      title: "עשרה בטבת - יום צום וצדקה",
      paragraphs: [
        "בעשרה בטבת אנו מתענים וזוכרים את תחילת המצור על ירושלים, ומוסיפים בתפילה, באהבת ישראל ובצדקה.",
        fastDayTzedakahText,
        "התרומה שלכם מחזקת את פעילות בית חב״ד יפו והחסד היומיומי כאן בעיר.",
      ],
      nedarim: makeNedarimConfig("צדקה ליום צום - עשרה בטבת"),
    },
  },
  taanitEsther: {
    eventName: "Ta'anit Esther",
    displayName: "תענית אסתר",
    config: {
      ...sharedConfig,
      slug: "taanit-esther",
      title: "תענית אסתר - מרבים בצדקה",
      paragraphs: [
        "בתענית אסתר אנו זוכרים את כוחם של האחדות, התפילה והצדקה להפוך גזרה לישועה.",
        fastDayTzedakahText,
        "התרומה שלכם מסייעת לפעילות הפורים ולפעילות החסד של בית חב״ד יפו.",
      ],
      nedarim: makeNedarimConfig("צדקה ליום צום - תענית אסתר"),
    },
  },
  shivaaAsarBetammuz: {
    eventName: "Tzom Tammuz",
    displayName: "י״ז בתמוז",
    config: {
      ...sharedConfig,
      slug: "taanit-shivaa-asar-betammuz",
      title: "יום צום ותפילה",
      paragraphs: [
        "ביום צום אנחנו עוצרים לרגע, מוסיפים בתפילה, בהתבוננות ובצדקה - והופכים את היום הזה למנוע של אור וחסד.",
        fastDayTzedakahText,
        "בי״ז בתמוז מתחילים ימי בין המצרים, זמן שבו מוסיפים באהבת ישראל ובנתינה לזכות עם ישראל, החיילים, הפצועים, החטופים וכל מי שזקוק לישועה.",
        "התרומה שלכם לבית חב״ד יפו מסייעת בפעילות יהודית, עזרה למשפחות, שיעורי תורה וחסד יומיומי כאן בעיר.",
        "<strong>תשובה, תפילה וצדקה מעבירין את רוע הגזירה.</strong>",
      ],
      nedarim: makeNedarimConfig("צדקה ליום צום - י״ז בתמוז"),
    },
  },
  tishaBeav: {
    eventName: "Tish'a B'Av",
    displayName: "תשעה באב",
    config: {
      ...sharedConfig,
      slug: "taanit-tisha-beav",
      title: "תשעה באב - מוסיפים באהבת ישראל",
      paragraphs: [
        "תשעה באב מזכיר לנו את החורבן, אבל גם את האחריות שלנו לבנות: עוד מעשה טוב, עוד אהבת ישראל, עוד צדקה.",
        fastDayTzedakahText,
        "ביום הזה מוסיפים בתפילה ובנתינה לזכות עם ישראל, לביטחון ולגאולה שלמה.",
        "התרומה שלכם מחזקת את פעילות בית חב״ד יפו ועוזרת לנו להאיר עוד בית ועוד לב בעיר.",
      ],
      nedarim: makeNedarimConfig("צדקה ליום צום - תשעה באב"),
    },
  },
};

const getJerusalemDateParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ISRAEL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day"),
  };
};

const toDayNumber = (year: number, month: number, day: number) =>
  Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);

const formatFastDate = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"][
    new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  ];
  const numericDate = [day, month, year]
    .map((value, index) => (index < 2 ? String(value).padStart(2, "0") : String(value)))
    .join(".");

  return `יום ${weekday}, ${numericDate}`;
};

const getHebrewYearLabel = (hdate: HDate) =>
  hdate.renderGematriya().split(" ").at(-1) ?? String(hdate.getFullYear());

export const getTaanitConfig = (referenceDate = new Date()): DonationCampaignConfig => {
  const jerusalemDate = getJerusalemDateParts(referenceDate);
  const referenceDay = toDayNumber(jerusalemDate.year, jerusalemDate.month, jerusalemDate.day);
  const referenceHebrewYear = new HDate(
    new Date(jerusalemDate.year, jerusalemDate.month - 1, jerusalemDate.day, 12)
  ).getFullYear();
  const definitionsByEvent = new Map(
    Object.values(fastDayDefinitions).map((definition) => [definition.eventName, definition])
  );

  const scheduledFasts = [referenceHebrewYear - 1, referenceHebrewYear, referenceHebrewYear + 1]
    .flatMap((year) => getHolidaysForYearArray(year, true))
    .flatMap((event) => {
      const definition = definitionsByEvent.get(event.getDesc());
      if (!definition) return [];

      const fastDate = event.getDate().greg();
      const fastDay = toDayNumber(
        fastDate.getFullYear(),
        fastDate.getMonth() + 1,
        fastDate.getDate()
      );
      return [{ definition, fastDate, hdate: event.getDate(), activationDay: fastDay - ACTIVATION_DAYS_BEFORE_FAST }];
    })
    .sort((a, b) => a.activationDay - b.activationDay);

  const activeFast =
    scheduledFasts.findLast((fast) => fast.activationDay <= referenceDay) ?? scheduledFasts[0];

  if (!activeFast) {
    throw new Error("Unable to resolve a fast-day campaign from the Hebrew calendar");
  }

  return {
    ...activeFast.definition.config,
    yearLabel: `${activeFast.definition.displayName} ${getHebrewYearLabel(activeFast.hdate)} | ${formatFastDate(activeFast.fastDate)}`,
  };
};

export const taanitConfig = getTaanitConfig();
