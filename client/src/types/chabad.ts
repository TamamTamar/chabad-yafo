// src/types/chabad.ts
export type ChabadHouseCard = {
    id: string;
    title: string;
    shaliach: string;
    address: string;
    phone: string;
    imageSrc: string;
    imageAlt: string;
    featured?: boolean;
};

export type HebcalItem = {
  title: string;
  date: string;
  category: "candles" | "havdalah" | "parashat" | "holiday" | "zmanim" | string;
  hebrew?: string;
  hdate?: string; // למשל: "11 Adar 5786"
};

export type HebcalResponse = {
  items: HebcalItem[];
};

export type ShabbatTimes = {
  parasha: string;
  candles: string;
  havdalah: string;
  hebrewDate: string;     // בעברית
  gregorianDate: string;  // 27.02.2026
};
