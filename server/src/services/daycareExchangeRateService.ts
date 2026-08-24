import axios from "axios";

type BankOfIsraelExchangeRateResponse = {
    key?: unknown;
    currentExchangeRate?: unknown;
    lastUpdate?: unknown;
};

export type DaycareForeignCurrency = "USD" | "EUR";

export type DaycareExchangeRate = {
    currency: DaycareForeignCurrency;
    rate: number;
    updatedAt: string;
    source: "bank_of_israel";
};

export const parseBankOfIsraelExchangeRate = (
    data: BankOfIsraelExchangeRateResponse,
    currency: DaycareForeignCurrency
): DaycareExchangeRate => {
    const rate = Number(data.currentExchangeRate);
    const updatedAt = new Date(String(data.lastUpdate ?? ""));

    if (
        data.key !== currency ||
        !Number.isFinite(rate) ||
        rate <= 0 ||
        rate > 100 ||
        Number.isNaN(updatedAt.getTime())
    ) {
        throw new Error(`Bank of Israel returned an invalid ${currency} exchange rate`);
    }

    return {
        currency,
        rate,
        updatedAt: updatedAt.toISOString(),
        source: "bank_of_israel",
    };
};

export const getBankOfIsraelExchangeRate = async (
    currency: DaycareForeignCurrency
) => {
    const response = await axios.get<BankOfIsraelExchangeRateResponse>(
        "https://www.boi.org.il/PublicApi/GetExchangeRate",
        {
            params: { key: currency },
            timeout: 8_000,
        }
    );

    return parseBankOfIsraelExchangeRate(response.data, currency);
};

export const parseBankOfIsraelHistoricalExchangeRate = (
    csv: string,
    currency: DaycareForeignCurrency
): DaycareExchangeRate => {
    const observations = csv
        .split(/\r?\n/)
        .map((line) =>
            line.match(/,(\d{4}-\d{2}-\d{2}),([0-9]+(?:\.[0-9]+)?),[^,]*$/)
        )
        .filter((match): match is RegExpMatchArray => Boolean(match))
        .map((match) => ({ date: match[1], rate: Number(match[2]) }))
        .filter(
            (observation) =>
                Number.isFinite(observation.rate) && observation.rate > 0
        )
        .sort((first, second) => first.date.localeCompare(second.date));
    const latest = observations.at(-1);

    if (!latest) {
        throw new Error(`Bank of Israel returned no ${currency} observations`);
    }

    return {
        currency,
        rate: latest.rate,
        updatedAt: `${latest.date}T00:00:00.000Z`,
        source: "bank_of_israel",
    };
};

export const getBankOfIsraelExchangeRateForDate = async (
    currency: DaycareForeignCurrency,
    requestedDate: string
) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
        throw new Error("Invalid exchange rate date");
    }

    const endDate = new Date(`${requestedDate}T12:00:00.000Z`);
    if (Number.isNaN(endDate.getTime())) {
        throw new Error("Invalid exchange rate date");
    }
    const startDate = new Date(endDate);
    startDate.setUTCDate(startDate.getUTCDate() - 7);

    const response = await axios.get<string>(
        `https://edge.boi.gov.il/FusionEdgeServer/sdmx/v2/data/dataflow/BOI.STATISTICS/EXR/1.0/RER_${currency}_ILS`,
        {
            params: {
                startPeriod: startDate.toISOString().slice(0, 10),
                endPeriod: requestedDate,
                format: "csv",
            },
            responseType: "text",
            timeout: 8_000,
        }
    );

    return parseBankOfIsraelHistoricalExchangeRate(response.data, currency);
};
