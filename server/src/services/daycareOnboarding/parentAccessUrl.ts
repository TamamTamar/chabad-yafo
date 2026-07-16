const trustedPublicOrigins = new Set([
    "https://www.chabadyafo.org",
    "https://chabadyafo.org",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]);

const normalizePublicOrigin = (value: string | undefined) => {
    if (!value) {
        return undefined;
    }

    try {
        return new URL(value).origin;
    } catch {
        return undefined;
    }
};

const selectPublicOrigin = (requestOrigin?: string) => {
    const normalizedRequestOrigin = normalizePublicOrigin(requestOrigin);
    const configuredOrigins = (process.env.CLIENT_ORIGIN ?? "")
        .split(",")
        .map((origin) => normalizePublicOrigin(origin.trim()))
        .filter((origin): origin is string => Boolean(origin));
    const allowedOrigins = new Set([
        ...trustedPublicOrigins,
        ...configuredOrigins,
    ]);

    if (
        normalizedRequestOrigin &&
        allowedOrigins.has(normalizedRequestOrigin)
    ) {
        return normalizedRequestOrigin;
    }

    const configuredOrigin =
        process.env.PUBLIC_SITE_URL ||
        process.env.CLIENT_ORIGIN?.split(",")[0]?.trim() ||
        "https://chabadyafo.org";

    return normalizePublicOrigin(configuredOrigin) ?? "https://chabadyafo.org";
};

export const buildParentAccessUrl = (
    rawToken: string,
    requestOrigin?: string
) =>
    `${selectPublicOrigin(requestOrigin)}/daycare/onboarding/${encodeURIComponent(rawToken)}`;
