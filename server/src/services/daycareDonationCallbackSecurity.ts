import { createHmac, timingSafeEqual } from "crypto";
import type { Request } from "express";

const getCallbackSecret = () =>
    process.env.DAYCARE_DONATION_CALLBACK_SECRET?.trim() || "";

export const isDaycareDonationCallbackConfigured = () =>
    Boolean(getCallbackSecret());

export const signDaycareDonationIntent = (publicId: string) =>
    createHmac("sha256", getCallbackSecret())
        .update(publicId)
        .digest("hex");

export const isValidDaycareDonationIntentSignature = (
    publicId: string,
    signature: string
) => {
    if (!getCallbackSecret() || !signature) return false;
    const expected = Buffer.from(signDaycareDonationIntent(publicId));
    const received = Buffer.from(signature);
    return (
        expected.length === received.length &&
        timingSafeEqual(expected, received)
    );
};

const normalizeIpAddress = (value: string) =>
    value.trim().replace(/^::ffff:/, "");

export const isTrustedNedarimCallbackRequest = (req: Request) => {
    const configuredAddresses = process.env.NEDARIM_CALLBACK_ALLOWED_IPS
        ?.split(",")
        .map(normalizeIpAddress)
        .filter(Boolean);
    // Address published in Nedarim's iframe callback documentation. It can be
    // overridden as a comma-separated allowlist without changing application code.
    const allowedAddresses = new Set(
        configuredAddresses?.length
            ? configuredAddresses
            : ["18.194.219.73"]
    );
    const requestAddress = normalizeIpAddress(req.ip || req.socket.remoteAddress || "");

    return allowedAddresses.has(requestAddress);
};

export const buildDaycareDonationCallbackUrl = (
    req: Request,
    publicId: string
) => {
    const configuredApiUrl =
        process.env.PUBLIC_API_URL?.trim().replace(/\/$/, "") || "";
    const callbackBase = configuredApiUrl
        ? `${configuredApiUrl}/daycare-donations/nedarim-callback`
        : `${req.protocol}://${req.get("host")}/api/daycare-donations/nedarim-callback`;
    const signature = signDaycareDonationIntent(publicId);

    return {
        callbackUrl: `${callbackBase}/${encodeURIComponent(publicId)}/${encodeURIComponent(signature)}`,
        signature,
    };
};

export const buildSignedDaycareCallbackUrl = (
    req: Request,
    publicId: string,
    apiPath: string
) => {
    const configuredApiUrl =
        process.env.PUBLIC_API_URL?.trim().replace(/\/$/, "") || "";
    const normalizedPath = apiPath.replace(/^\/+/, "");
    const callbackBase = configuredApiUrl
        ? `${configuredApiUrl}/${normalizedPath}`
        : `${req.protocol}://${req.get("host")}/api/${normalizedPath}`;
    const signature = signDaycareDonationIntent(publicId);

    return {
        callbackUrl: `${callbackBase}/${encodeURIComponent(publicId)}/${encodeURIComponent(signature)}`,
        signature,
    };
};
