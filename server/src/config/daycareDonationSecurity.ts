/*
 * Fail-closed release gate.
 *
 * This must only be changed after Nedarim Plus supplies and we implement their
 * official server-side transaction verification flow. An internal intent
 * signature plus Status=OK is not sufficient to open real payments.
 */
export const DAYCARE_NEDARIM_OFFICIAL_VERIFICATION_IMPLEMENTED = false;

export const areDaycareDonationPaymentsEnabled = () =>
    DAYCARE_NEDARIM_OFFICIAL_VERIFICATION_IMPLEMENTED &&
    process.env.DAYCARE_DONATIONS_PAYMENT_ENABLED === "true";
