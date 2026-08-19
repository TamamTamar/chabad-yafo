const cleanProviderValue = (value: unknown, maxLength = 160) =>
    String(value ?? "").trim().slice(0, maxLength);

const normalizeProviderFieldName = (field: string) =>
    field.replace(/[^a-z0-9]/gi, "").toLowerCase();

const transactionIdFieldNames = new Set([
    "transactionid",
    "transaction",
    "confirmation",
    "confirmationnumber",
    "approval",
    "shovar",
    "kevaid",
]);

export const getNedarimTransactionId = (
    body: Record<string, unknown>
) => {
    for (const [field, rawValue] of Object.entries(body)) {
        if (!transactionIdFieldNames.has(normalizeProviderFieldName(field))) {
            continue;
        }

        const value = cleanProviderValue(rawValue);
        if (value) return value;
    }

    return null;
};

export const resolveNedarimExternalTransactionId = (args: {
    body: Record<string, unknown>;
    paymentType: "HK" | "Ragil";
    intentPublicId: string;
}) => {
    const providerTransactionId = getNedarimTransactionId(args.body);
    if (providerTransactionId) return providerTransactionId;

    // Nedarim confirms a standing-order setup without consistently including
    // its Keva/order number in the callback. The signed intent is stable and
    // unique, so it provides idempotency without rejecting a valid HK pledge.
    if (args.paymentType === "HK") {
        return `nedarim-hk-intent:${args.intentPublicId}`;
    }

    return null;
};

export const isSafeNedarimDiagnosticValueField = (field: string) => {
    const normalizedField = normalizeProviderFieldName(field);
    return (
        normalizedField === "status" ||
        normalizedField === "amount" ||
        transactionIdFieldNames.has(normalizedField)
    );
};
