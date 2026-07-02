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
export type GalleryItem = {
  id: string;
  title: string;
  coverImage: string;
  images: string[];
};
export type PaymentData = {
  Mosad: string; // מזהה המוסד
  ApiValid: string; // מפתח API
  Zeout: string; // מספר זהות
  FirstName: string; // שם פרטי
  LastName: string; // שם משפחה
  Street: string; // רחוב
  City: string; // עיר
  Phone: string; // מספר טלפון
  Mail: string; // כתובת דוא"ל
  PaymentType: "HK" | "Ragil"; // סוג תשלום (הוראת קבע או רגיל)
  Amount: number; // סכום התשלום
  Tashlumim: number; // מספר תשלומים
  Currency: number; // מטבע (1 = שקלים)
  Groupe: string; // קבוצה
  Comment: string; // הערה
  CallBack: string; // כתובת קריאה חוזרת
  CallBackMailError: string; // כתובת דוא"ל לשגיאות
};
export interface RebbeLetterFormData {
  fullName: string;
  motherName: string;
  phone: string;
  email: string;
  letter: string;
  occasion: string;
  wantsUpdates: boolean;
}

export type RebbeLetterStatus =
  | "new"
  | "printed"
  | "sentToOhel"
  | "handled";

export interface RebbeLetterAdmin extends RebbeLetterFormData {
  _id: string;
  status: RebbeLetterStatus;
  createdAt: string;
  updatedAt: string;
  updatedStatusAt?: string;
}

export interface PaymentAdmin {
  _id: string;
  FirstName: string;
  LastName: string;
  Phone?: string;
  Mail?: string;
  PaymentType: "HK" | "Ragil";
  Amount: number;
  Tashlumim: number;
  NormalizedTotal: number;
  lizchut?: string;
  createdAt: string;
  updatedAt: string;
}

export type FinanceEntryType = "income" | "expense";

export type FinanceEntrySource =
  | "website"
  | "cash"
  | "bit"
  | "credit"
  | "bank"
  | "check"
  | "nedarim"
  | "manual"
  | "other";

export interface FinanceEntryAdmin {
  _id: string;
  type: FinanceEntryType;
  source: FinanceEntrySource;
  category: string;
  title: string;
  amount: number;
  occurredAt: string;
  donorName?: string;
  notes?: string;
  linkedPaymentId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FinanceSummary {
  income: number;
  expenses: number;
  balance: number;
}

export interface FinanceCategorySummary {
  category: string;
  income: number;
  expenses: number;
  balance: number;
}

export interface FinanceOverview {
  summary: FinanceSummary;
  categorySummary: FinanceCategorySummary[];
  entries: FinanceEntryAdmin[];
}

export type CreateFinanceEntryPayload = {
  type: FinanceEntryType;
  source: Exclude<FinanceEntrySource, "website">;
  category: string;
  title: string;
  amount: number;
  donorName?: string;
  notes?: string;
};
