import axios from "axios";

type BankOfIsraelExchangeRateResponse = {
    key?: unknown;
    currentExchangeRate?: unknown;
    lastUpdate?: unknown;
};

export type DaycareUsdExchangeRate = {
    currency: "USD";
    rate: number;
    updatedAt: string;
    source: "bank_of_israel";
};

export const parseBankOfIsraelUsdExchangeRate = (
    data: BankOfIsraelExchangeRateResponse
): DaycareUsdExchangeRate => {
    const rate = Number(data.currentExchangeRate);
    const updatedAt = new Date(String(data.lastUpdate ?? ""));

    if (
        data.key !== "USD" ||
        !Number.isFinite(rate) ||
        rate <= 0 ||
        rate > 100 ||
        Number.isNaN(updatedAt.getTime())
    ) {
        throw new Error("Bank of Israel returned an invalid USD exchange rate");
    }

    return {
        currency: "USD",
        rate,
        updatedAt: updatedAt.toISOString(),
        source: "bank_of_israel",
    };
};

export const getBankOfIsraelUsdExchangeRate = async () => {
    const response = await axios.get<BankOfIsraelExchangeRateResponse>(
        "https://www.boi.org.il/PublicApi/GetExchangeRate",
        {
            params: { key: "USD" },
            timeout: 8_000,
        }
    );

    return parseBankOfIsraelUsdExchangeRate(response.data);
};

export const parseBankOfIsraelHistoricalUsdExchangeRate = (
    csv: string
): DaycareUsdExchangeRate => {
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
        throw new Error("Bank of Israel returned no USD observations");
    }

    return {
        currency: "USD",
        rate: latest.rate,
        updatedAt: `${latest.date}T00:00:00.000Z`,
        source: "bank_of_israel",
    };
};

export const getBankOfIsraelUsdExchangeRateForDate = async (
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
        "https://edge.boi.gov.il/FusionEdgeServer/sdmx/v2/data/dataflow/BOI.STATISTICS/EXR/1.0/RER_USD_ILS",
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

    return parseBankOfIsraelHistoricalUsdExchangeRate(response.data);
};
