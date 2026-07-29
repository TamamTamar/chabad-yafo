import { DaycareDonationAudit } from "../models/DaycareDonationAudit";
import { DAYCARE_DONATION_CAMPAIGN_SLUG } from "../config/daycareDonationDefaults";
import type { DaycareDonationAuditDocument } from "../types/daycareDonations";

type AuditInput = Omit<
    DaycareDonationAuditDocument,
    "campaignSlug" | "createdAt" | "updatedAt"
>;

export const writeDaycareDonationAudit = async (input: AuditInput) =>
    DaycareDonationAudit.create({
        ...input,
        campaignSlug: DAYCARE_DONATION_CAMPAIGN_SLUG,
    });
