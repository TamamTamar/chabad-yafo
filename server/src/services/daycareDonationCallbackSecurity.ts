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
