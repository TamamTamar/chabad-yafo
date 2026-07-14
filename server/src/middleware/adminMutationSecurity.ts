import type { NextFunction, Request, Response } from "express";

const builtInTrustedOrigins = [
    "https://www.chabadyafo.org",
    "https://chabadyafo.org",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
];

const normalizeOrigin = (value: string) => {
    try {
        return new URL(value).origin;
    } catch {
        return null;
    }
};

const getTrustedOrigins = () => {
    const configuredOrigins = (process.env.CLIENT_ORIGIN ?? "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);

    return new Set(
        [...builtInTrustedOrigins, ...configuredOrigins]
            .map(normalizeOrigin)
            .filter((origin): origin is string => Boolean(origin))
    );
};

export const isTrustedAdminOrigin = (origin: string) => {
    const normalizedOrigin = normalizeOrigin(origin);
    return Boolean(
        normalizedOrigin && getTrustedOrigins().has(normalizedOrigin)
    );
};

const mutationMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export const requireSecureAdminMutation = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (!mutationMethods.has(req.method)) {
        next();
        return;
    }

    const origin = req.get("origin");
    const fetchSite = req.get("sec-fetch-site");

    if (
        (origin && !isTrustedAdminOrigin(origin)) ||
        origin === "null" ||
        fetchSite === "cross-site"
    ) {
        res.status(403).json({
            success: false,
            message: "Untrusted request origin",
        });
        return;
    }

    if (!req.is("application/json")) {
        res.status(415).json({
            success: false,
            message: "Admin mutations require application/json",
        });
        return;
    }

    next();
};
