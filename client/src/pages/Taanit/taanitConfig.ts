import type { DonationCampaignConfig } from "../Campaign/types";
import heroImg from "../../assets/taanit-hero.png";

type FastDayKey = "shivaaAsarBetammuz" | "tishaBeav";

const fastDayTzedakahText =
  "בימי התענית נהוג לתרום לצדקה את עלות הארוחות שנחסכו. חז״ל אומרים שאת עיקר השכר מקבלים המתענים בזכות הצדקה שנותנים לעניים ונזקקים, כמאמר הגמרא: <strong>״אגרא דתעניתא - צדקתא״</strong>. תרומת התענית היא גם סגולה שיתקבלו התפילות והתעניות לרצון לפני הקדוש ברוך הוא.";

const fastDayConfigs: Record<FastDayKey, DonationCampaignConfig> = {
  shivaaAsarBetammuz: {
    slug: "taanit-shivaa-asar-betammuz",
    shaliachName: 'בית חב״ד יפו',
    yearLabel: 'י״ז בתמוז תשפ״ו | יום חמישי, 02.07.2026',
    heroImage: heroImg,
    heroVariant: "compact",
    title: "יום צום ותפילה",
    isCompact: true,
    showCalculator: false,
    paragraphs: [
      "ביום צום אנחנו עוצרים לרגע, מוסיפים בתפילה, בהתבוננות ובצדקה - והופכים את היום הזה למנוע של אור וחסד.",
      fastDayTzedakahText,
      "בי״ז בתמוז מתחילים ימי בין המצרים, זמן שבו מוסיפים באהבת ישראל ובנתינה לזכות עם ישראל, החיילים, הפצועים, החטופים וכל מי שזקוק לישועה.",
      "התרומה שלכם לבית חב״ד יפו מסייעת בפעילות יהודית, עזרה למשפחות, שיעורי תורה וחסד יומיומי כאן בעיר.",
      "<strong>תשובה, תפילה וצדקה מעבירין את רוע הגזירה.</strong>",
    ],
    presetAmounts: [],
    allowCustomAmount: true,
    nedarim: {
      Mosad: "7013920",
      ApiValid: "zidFYCLaNi",
      Currency: "1",
      Comment: "צדקה ליום צום - י״ז בתמוז",
      PaymentType: "Ragil",
    },
  },
  tishaBeav: {
    slug: "taanit-tisha-beav",
    shaliachName: 'בית חב״ד יפו',
    yearLabel: 'תשעה באב תשפ״ו | יום חמישי, 23.07.2026',
    heroImage: heroImg,
    heroVariant: "compact",
    title: "תשעה באב - מוסיפים באהבת ישראל",
    isCompact: true,
    showCalculator: false,
    paragraphs: [
      "תשעה באב מזכיר לנו את החורבן, אבל גם את האחריות שלנו לבנות: עוד מעשה טוב, עוד אהבת ישראל, עוד צדקה.",
      fastDayTzedakahText,
      "ביום הזה מוסיפים בתפילה ובנתינה לזכות עם ישראל, לביטחון ולגאולה שלמה.",
      "התרומה שלכם מחזקת את פעילות בית חב״ד יפו ועוזרת לנו להאיר עוד בית ועוד לב בעיר.",
    ],
    presetAmounts: [],
    allowCustomAmount: true,
    nedarim: {
      Mosad: "7013920",
      ApiValid: "zidFYCLaNi",
      Currency: "1",
      Comment: "צדקה ליום צום - תשעה באב",
      PaymentType: "Ragil",
    },
  },
};

export const activeFastDay: FastDayKey = "shivaaAsarBetammuz";
export const taanitConfig = fastDayConfigs[activeFastDay];
