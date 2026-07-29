/*
 * Nedarim Plus does not currently provide an official callback signature in
 * the iframe documentation available to this project. Keep that fact explicit
 * instead of claiming that provider verification was implemented.
 */
export const DAYCARE_NEDARIM_OFFICIAL_VERIFICATION_IMPLEMENTED = false;

export const areDaycareDonationPaymentsEnabled = () =>
    process.env.DAYCARE_DONATIONS_PAYMENT_ENABLED === "true" &&
    (DAYCARE_NEDARIM_OFFICIAL_VERIFICATION_IMPLEMENTED ||
        process.env
            .DAYCARE_DONATIONS_ACCEPT_UNSIGNED_NEDARIM_CALLBACKS === "true");
