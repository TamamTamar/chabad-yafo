export type PaymentDataToSave = {
    FirstName: string;
    LastName: string;
    Phone?: string;
    Mail?: string;

    PaymentType: "HK" | "Ragil";

    Amount: number;          // הסכום שנבחר
    Tashlumim: number;
    NormalizedTotal: number;

    lizchut?: string;
};