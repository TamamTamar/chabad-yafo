import type { FinanceEntry } from "../../types/financeEntry";

export const getFinanceEntryPayload = (body: Record<string, unknown>): FinanceEntry => ({
    type: body.type === "income" ? "income" : "expense",
    source:
        typeof body.source === "string" &&
        ["cash", "bit", "credit", "bank", "check"].includes(body.source)
            ? (body.source as "cash" | "bit" | "credit" | "bank" | "check")
            : "cash",
    category: String(body.category || "כללי"),
    title: String(body.title || ""),
    amount: Number(body.amount),
    occurredAt: new Date(),
    donorName: String(body.donorName || ""),
    notes: String(body.notes || ""),
});

export const getMonthRange = (month?: unknown) => {
    if (typeof month !== "string" || !/^\d{4}-\d{2}$/.test(month)) {
        return null;
    }

    const [year, monthNumber] = month.split("-").map(Number);
    const start = new Date(year, monthNumber - 1, 1);
    const end = new Date(year, monthNumber, 1);

    return { start, end };
};

export const getWebsitePaymentTitle = (payment: {
    FirstName?: string;
    LastName?: string;
    PaymentType?: string;
}) => {
    const donorName = [payment.FirstName, payment.LastName]
        .filter(Boolean)
        .join(" ");
    const paymentType =
        payment.PaymentType === "HK" ? "הוראת קבע באתר" : "תרומה באתר";

    return donorName ? `${paymentType} - ${donorName}` : paymentType;
};

export const getFinanceSummary = (
    entries: Array<{ type: "income" | "expense"; amount: number }>
) => {
    const income = entries
        .filter((entry) => entry.type === "income")
        .reduce((total, entry) => total + entry.amount, 0);
    const expenses = entries
        .filter((entry) => entry.type === "expense")
        .reduce((total, entry) => total + entry.amount, 0);

    return {
        income,
        expenses,
        balance: income - expenses,
    };
};

export const getCategorySummary = (
    entries: Array<{
        type: "income" | "expense";
        category?: string;
        amount: number;
    }>
) => {
    const summaryByCategory = new Map<
        string,
        { category: string; income: number; expenses: number; balance: number }
    >();

    entries.forEach((entry) => {
        const category = entry.category || "כללי";
        const current = summaryByCategory.get(category) || {
            category,
            income: 0,
            expenses: 0,
            balance: 0,
        };

        if (entry.type === "income") {
            current.income += entry.amount;
        } else {
            current.expenses += entry.amount;
        }

        current.balance = current.income - current.expenses;
        summaryByCategory.set(category, current);
    });

    return Array.from(summaryByCategory.values()).sort(
        (categoryA, categoryB) =>
            categoryB.income +
            categoryB.expenses -
            (categoryA.income + categoryA.expenses)
    );
};
