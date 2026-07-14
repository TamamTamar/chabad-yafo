import type { NextFunction, Request, Response } from "express";

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const windowMs = 15 * 60 * 1000;
const maximumRequests = 30;
const requestsByClient = new Map<string, RateLimitEntry>();
let nextCleanupAt = Date.now() + windowMs;

const cleanExpiredEntries = (now: number) => {
    if (now < nextCleanupAt) {
        return;
    }

    for (const [key, entry] of requestsByClient.entries()) {
        if (entry.resetAt <= now) {
            requestsByClient.delete(key);
        }
    }

    nextCleanupAt = now + windowMs;
};

export const setPublicOnboardingSecurityHeaders = (
    _req: Request,
    res: Response,
    next: NextFunction
) => {
    res.setHeader("Cache-Control", "no-store, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    res.setHeader("Referrer-Policy", "no-referrer");
    next();
};

export const publicOnboardingRateLimit = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const now = Date.now();
    cleanExpiredEntries(now);

    const clientKey = req.ip || req.socket.remoteAddress || "unknown";
    const current = requestsByClient.get(clientKey);
    const entry =
        !current || current.resetAt <= now
            ? { count: 1, resetAt: now + windowMs }
            : { count: current.count + 1, resetAt: current.resetAt };

    requestsByClient.set(clientKey, entry);

    const remaining = Math.max(0, maximumRequests - entry.count);
    const resetSeconds = Math.max(
        1,
        Math.ceil((entry.resetAt - now) / 1000)
    );

    res.setHeader("RateLimit-Limit", String(maximumRequests));
    res.setHeader("RateLimit-Remaining", String(remaining));
    res.setHeader("RateLimit-Reset", String(resetSeconds));

    if (entry.count > maximumRequests) {
        res.setHeader("Retry-After", String(resetSeconds));
        return res.status(429).json({
            success: false,
            message: "יותר מדי ניסיונות. נסו שוב בעוד מספר דקות.",
        });
    }

    next();
};
