import type { DaycareFinanceSettings } from "../types";

export type FinanceNumberKey = Exclude<
    keyof DaycareFinanceSettings,
    "_id" | "monthlyCashflows"
>;

export type MonthlyCashflow =
    NonNullable<DaycareFinanceSettings["monthlyCashflows"]>[number];
export type MonthlyCashflowNumberKey = Exclude<keyof MonthlyCashflow, "month">;
export type MonthlyCashflowEditKey = Exclude<
    MonthlyCashflowNumberKey,
    keyof Pick<
        MonthlyCashflow,
        | "renovationKitchen"
        | "renovationYard"
        | "renovationConstruction"
        | "renovationSafety"
        | "renovationEquipment"
        | "renovationLabor"
        | "renovationOther"
    >
>;

export type MonthlyField<K extends MonthlyCashflowNumberKey = MonthlyCashflowNumberKey> = {
    key: K;
    label: string;
};

export const monthlyIncomeFields: Array<MonthlyField<MonthlyCashflowEditKey>> = [
    { key: "children", label: "ילדים" },
    { key: "pricePerChild", label: "מחיר לילד" },
    { key: "income", label: "תשלומי הורים בפועל" },
    { key: "extraIncome", label: "תרומות / הכנסות צד" },
];

export const monthlyFixedExpenseFields: Array<MonthlyField<MonthlyCashflowEditKey>> = [
    { key: "rent", label: "שכירות" },
    { key: "directorSalary", label: "משכורת שלך / מנהלת" },
    { key: "staffSalaries", label: "מטפלת" },
];

export const monthlyVariableExpenseFields: Array<
    MonthlyField<MonthlyCashflowEditKey>
> = [
    { key: "food", label: "אוכל" },
    { key: "supplies", label: "ציוד שוטף" },
    { key: "insuranceAndPermits", label: "ביטוחים / אישורים" },
    { key: "extraExpenses", label: "הוצאות נוספות" },
];

export const monthlyRepaymentField: MonthlyField<MonthlyCashflowEditKey> = {
    key: "renovationRepayment",
    label: "כמה להחזיר החודש לשיפוץ",
};

export const monthlyRenovationFields: Array<MonthlyField> = [
    { key: "renovationKitchen", label: "מטבח" },
    { key: "renovationYard", label: "חצרות" },
    { key: "renovationConstruction", label: "גבס / צבע / קירות" },
    { key: "renovationSafety", label: "בטיחות והתאמות" },
    { key: "renovationEquipment", label: "ציוד פתיחה חד־פעמי" },
    { key: "renovationLabor", label: "שכר עובד / קבלן שיפוץ" },
    { key: "renovationOther", label: "שיפוץ - שונות" },
];

export const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("he-IL", {
        style: "currency",
        currency: "ILS",
        maximumFractionDigits: 0,
    }).format(value);
};

export const getNumberValue = (
    settings: DaycareFinanceSettings,
    key: FinanceNumberKey
) => {
    return settings[key] ?? 0;
};

export const getExpenses = (settings: DaycareFinanceSettings) => {
    return (
        getNumberValue(settings, "rent") +
        getNumberValue(settings, "directorSalary") +
        getNumberValue(settings, "staffSalaries") +
        getNumberValue(settings, "food") +
        getNumberValue(settings, "supplies") +
        getNumberValue(settings, "insuranceAndPermits") +
        getNumberValue(settings, "extraExpenses")
    );
};

export const getRenovationInvestment = (settings: DaycareFinanceSettings) => {
    return (
        getNumberValue(settings, "renovationKitchen") +
        getNumberValue(settings, "renovationYard") +
        getNumberValue(settings, "renovationConstruction") +
        getNumberValue(settings, "renovationSafety") +
        getNumberValue(settings, "renovationEquipment") +
        getNumberValue(settings, "renovationLabor") +
        getNumberValue(settings, "renovationOther")
    );
};

export const getOngoingExpensesFromCashflow = (cashflow: MonthlyCashflow) => {
    return (
        (cashflow.rent || 0) +
        (cashflow.directorSalary || 0) +
        (cashflow.staffSalaries || 0) +
        (cashflow.food || 0) +
        (cashflow.supplies || 0) +
        (cashflow.insuranceAndPermits || 0) +
        (cashflow.extraExpenses || 0)
    );
};

export const getRenovationFromCashflow = (cashflow: MonthlyCashflow) => {
    return (
        (cashflow.renovationKitchen || 0) +
        (cashflow.renovationYard || 0) +
        (cashflow.renovationConstruction || 0) +
        (cashflow.renovationSafety || 0) +
        (cashflow.renovationEquipment || 0) +
        (cashflow.renovationLabor || 0) +
        (cashflow.renovationOther || 0)
    );
};

export const isSetupMonth = (month: string) => {
    const monthNumber = Number(month.slice(5, 7));

    return monthNumber > 0 && monthNumber <= 9;
};

export const getDefaultMonthlyCashflow = (
    settings: DaycareFinanceSettings,
    month: string
): MonthlyCashflow => {
    const income = settings.currentChildren * settings.pricePerChild;

    return {
        month,
        children: settings.currentChildren,
        pricePerChild: settings.pricePerChild,
        income,
        extraIncome: 0,
        rent: settings.rent,
        directorSalary: settings.directorSalary,
        staffSalaries: settings.staffSalaries,
        food: settings.food,
        supplies: settings.supplies,
        insuranceAndPermits: settings.insuranceAndPermits,
        extraExpenses: settings.extraExpenses,
        renovationKitchen: 0,
        renovationYard: 0,
        renovationConstruction: 0,
        renovationSafety: 0,
        renovationEquipment: 0,
        renovationLabor: 0,
        renovationOther: 0,
        renovationRepayment: 0,
    };
};

export const getCurrentMonthValue = () => {
    return new Date().toISOString().slice(0, 7);
};

export const getCurrentYearMonths = () => {
    const currentYear = new Date().getFullYear();

    return Array.from({ length: 12 }, (_item, index) => {
        const monthNumber = String(index + 1).padStart(2, "0");

        return `${currentYear}-${monthNumber}`;
    });
};

export const formatMonth = (month: string) => {
    if (!month) {
        return "-";
    }

    return new Intl.DateTimeFormat("he-IL", {
        month: "long",
        year: "numeric",
    }).format(new Date(`${month}-01T00:00:00`));
};

export const ensureCurrentYearCashflows = (settings: DaycareFinanceSettings) => {
    const existingCashflows = settings.monthlyCashflows || [];
    const existingMonths = new Set(
        existingCashflows.map((cashflow) => cashflow.month)
    );
    const missingMonths = getCurrentYearMonths().filter(
        (month) => !existingMonths.has(month)
    );

    if (missingMonths.length === 0) {
        return { settings, changed: false };
    }

    return {
        settings: {
            ...settings,
            monthlyCashflows: [
                ...existingCashflows,
                ...missingMonths.map((month) =>
                    getDefaultMonthlyCashflow(settings, month)
                ),
            ].sort((a, b) => a.month.localeCompare(b.month)),
        },
        changed: true,
    };
};
