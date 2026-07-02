export type FinanceEntryType = "income" | "expense";

export type FinanceEntrySource =
    | "website"
    | "cash"
    | "bit"
    | "credit"
    | "bank"
    | "nedarim"
    | "manual"
    | "other";

export type FinanceEntry = {
    type: FinanceEntryType;
    source: FinanceEntrySource;
    category: string;
    title: string;
    amount: number;
    occurredAt: Date;
    donorName?: string;
    notes?: string;
};
