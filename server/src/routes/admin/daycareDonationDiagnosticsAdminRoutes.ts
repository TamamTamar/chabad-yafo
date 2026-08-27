import { randomBytes, randomUUID } from "crypto";
import { Router, type NextFunction, type Request, type Response } from "express";
import mongoose from "mongoose";
import multer from "multer";
import { DAYCARE_DONATION_CAMPAIGN_SLUG } from "../../config/daycareDonationDefaults";
import { requireAdmin } from "../../middleware/adminAuth";
import type { AdminActor } from "../../middleware/adminAuth";
import { requireSecureAdminMutation } from "../../middleware/adminMutationSecurity";
import { DaycareDonationCampaign } from "../../models/DaycareDonationCampaign";
import { DaycareDonationAmbassador } from "../../models/DaycareDonationAmbassador";
import { DaycareDonationAudit } from "../../models/DaycareDonationAudit";
import { DaycareDonationDiagnostic } from "../../models/DaycareDonationDiagnostic";
import { DaycareDonationIntent } from "../../models/DaycareDonationIntent";
import { DaycareDonationLead } from "../../models/DaycareDonationLead";
import { DaycareDonationRecord } from "../../models/DaycareDonationRecord";
import {
    convertDaycareDonationToIls,
    ensureDefaultDaycareDonationCampaign,
    getDaycareDonationCampaignSnapshot,
    normalizeDaycareDonationAllocations,
    synchronizeDaycareDonationGoals,
} from "../../services/daycareDonationService";
import { writeDaycareDonationAudit } from "../../services/daycareDonationAuditService";
import {
    getBankOfIsraelExchangeRate,
    getBankOfIsraelExchangeRateForDate,
    type DaycareForeignCurrency,
} from "../../services/daycareExchangeRateService";
import {
    createAvailableDaycareAmbassadorSlug,
    normalizeDaycareAmbassadorSlug,
} from "../../services/daycareDonationAmbassadorService";
import {
    buildDaycareDonationCallbackUrl,
    isDaycareDonationCallbackConfigured,
} from "../../services/daycareDonationCallbackSecurity";
import {
    deleteDaycareDonationFieldUpdateImage,
    uploadDaycareDonationFieldUpdateImage,
} from "../../services/daycareDonationFieldUpdateImageService";
import type {
    DaycareDonationItemConfig,
    DaycareDonationContactMethod,
    DaycareDonationLeadStatus,
    DaycareDonationRecordStatus,
    DaycareDonationManualSource,
    DaycareDonationStatusOverride,
} from "../../types/daycareDonations";
import {
    allowedFieldUpdateMimeTypes,
    cleanText,
    createUniqueAmbassadorRef,
    getAdminAuditActor,
    isContactMethod,
    isLeadStatus,
    isManualSource,
    isRecordStatus,
    isStatusOverride,
    parseOptionalAmount,
    parseOptionalDate,
    receiveFieldUpdateImage,
    synchronizeStoredCampaignGoals,
} from "./daycareDonationAdminShared";

export const registerDaycareDonationDiagnosticsAdminRoutes = (router: Router) => {
    router.get("/audit", async (_req, res) => {
        try {
            const entries = await DaycareDonationAudit.find({
                campaignSlug: DAYCARE_DONATION_CAMPAIGN_SLUG,
            })
                .sort({ createdAt: -1 })
                .limit(250)
                .lean();
            return res.json({ success: true, data: entries });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: "Failed to get donation audit",
            });
        }
    });

    router.get("/diagnostics", async (_req, res) => {
        try {
            const diagnostics = await DaycareDonationDiagnostic.find({
                campaignSlug: DAYCARE_DONATION_CAMPAIGN_SLUG,
            })
                .select({
                    intentPublicId: 1,
                    status: 1,
                    fields: 1,
                    values: 1,
                    receivedAt: 1,
                    expiresAt: 1,
                })
                .sort({ receivedAt: -1 })
                .limit(20)
                .lean();

            return res.json({
                success: true,
                data: {
                    enabled:
                        process.env.DAYCARE_DONATION_DIAGNOSTICS === "true",
                    paymentTestEnabled:
                        process.env
                            .DAYCARE_DONATION_DIAGNOSTIC_PAYMENT_ENABLED ===
                        "true",
                    diagnostics,
                },
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: "Failed to get donation diagnostics",
            });
        }
    });

    router.delete("/diagnostics", async (_req, res) => {
        try {
            const result = await DaycareDonationDiagnostic.deleteMany({
                campaignSlug: DAYCARE_DONATION_CAMPAIGN_SLUG,
            });

            await writeDaycareDonationAudit({
                action: "diagnostics.cleared",
                entityType: "campaign",
                entityId: DAYCARE_DONATION_CAMPAIGN_SLUG,
                actor: "admin",
                actorId: res.locals.adminActor.id,
                actorLabel: res.locals.adminActor.label,
                after: { cleared: result.deletedCount },
            });

            return res.json({
                success: true,
                data: { cleared: result.deletedCount },
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: "Failed to clear donation diagnostics",
            });
        }
    });

    router.post("/diagnostic-intents", async (req, res) => {
        try {
            if (
                process.env.DAYCARE_DONATION_DIAGNOSTIC_PAYMENT_ENABLED !==
                "true"
            ) {
                return res.status(503).json({
                    success: false,
                    message: "Diagnostic payment is not enabled",
                });
            }
            if (!isDaycareDonationCallbackConfigured()) {
                return res.status(503).json({
                    success: false,
                    message: "Donation callback is not configured",
                });
            }

            const campaign = await ensureDefaultDaycareDonationCampaign();
            const amount = Number(req.body.amount);
            const itemId = cleanText(req.body.itemId, 80) || undefined;
            const donorName = cleanText(req.body.donorName, 160);
            const phone = cleanText(req.body.phone, 40);
            const email = cleanText(req.body.email, 180).toLowerCase();
            const dedication =
                cleanText(req.body.dedication, 600) || undefined;

            if (!Number.isFinite(amount) || amount < 1 || amount > 10) {
                return res.status(400).json({
                    success: false,
                    message: "Diagnostic payment must be between 1 and 10 ILS",
                });
            }
            if (
                !donorName ||
                !phone ||
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Donor contact details are required",
                });
            }
            if (
                itemId &&
                !campaign.items.some(
                    (item: DaycareDonationItemConfig) => item.id === itemId
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Donation item was not found",
                });
            }

            const publicId = randomUUID();
            const intent = await DaycareDonationIntent.create({
                publicId,
                campaignSlug: campaign.slug,
                mode: "diagnostic",
                status: "created",
                amount,
                itemId,
                donorName,
                phone,
                email,
                dedication,
                expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            });
            const { callbackUrl, signature } =
                buildDaycareDonationCallbackUrl(req, publicId);

            await writeDaycareDonationAudit({
                action: "diagnostic.intentCreated",
                entityType: "intent",
                entityId: publicId,
                ...getAdminAuditActor(res.locals.adminActor),
                after: {
                    amount,
                    itemId: itemId ?? null,
                    status: intent.status,
                    countedInCampaign: false,
                },
            });

            return res.status(201).json({
                success: true,
                data: {
                    intentId: publicId,
                    callbackUrl,
                    param1: publicId,
                    param2: signature,
                    expiresAt: intent.expiresAt,
                },
            });
        } catch (error) {
            console.error("Failed to create diagnostic donation intent:", error);
            return res.status(400).json({
                success: false,
                message: "Failed to prepare diagnostic payment",
            });
        }
    });

};
