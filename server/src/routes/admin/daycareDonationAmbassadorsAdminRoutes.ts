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

export const registerDaycareDonationAmbassadorsAdminRoutes = (router: Router) => {
    router.get("/ambassadors", async (_req, res) => {
        try {
            const [ambassadors, totals] = await Promise.all([
                DaycareDonationAmbassador.find()
                    .sort({ active: -1, createdAt: -1 })
                    .lean(),
                DaycareDonationRecord.aggregate([
                    {
                        $match: {
                            campaignSlug: DAYCARE_DONATION_CAMPAIGN_SLUG,
                            status: "confirmed",
                            ambassadorId: { $type: "objectId" },
                        },
                    },
                    {
                        $group: {
                            _id: "$ambassadorId",
                            raised: { $sum: "$amount" },
                            donationCount: { $sum: 1 },
                        },
                    },
                ]),
            ]);
            const totalsById = new Map<
                string,
                { raised: number; donationCount: number }
            >(
                totals.map((entry) => [
                    String(entry._id),
                    {
                        raised: Number(entry.raised) || 0,
                        donationCount: Number(entry.donationCount) || 0,
                    },
                ])
            );

            return res.json({
                success: true,
                data: ambassadors.map((ambassador) => ({
                    ...ambassador,
                    raised:
                        totalsById.get(String(ambassador._id))?.raised ?? 0,
                    donationCount:
                        totalsById.get(String(ambassador._id))?.donationCount ?? 0,
                })),
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: "Failed to get donation ambassadors",
            });
        }
    });

    router.post("/ambassadors", async (req, res) => {
        try {
            const name = cleanText(req.body.name, 160);
            const requestedLinkSlug = normalizeDaycareAmbassadorSlug(
                req.body.linkSlug
            );
            const goal = Number(req.body.goal);
            if (!name) {
                return res.status(400).json({
                    success: false,
                    message: "Ambassador name is required",
                });
            }
            if (!requestedLinkSlug) {
                return res.status(400).json({
                    success: false,
                    message: "Ambassador link name in English is required",
                });
            }
            const linkSlug = await createAvailableDaycareAmbassadorSlug(
                requestedLinkSlug
            );
            if (!Number.isFinite(goal) || goal <= 0 || goal > 100_000_000) {
                return res.status(400).json({
                    success: false,
                    message: "Ambassador goal must be greater than zero",
                });
            }

            const ambassador = await DaycareDonationAmbassador.create({
                name,
                linkSlug,
                goal,
                refCode: await createUniqueAmbassadorRef(),
                active: true,
                notes: cleanText(req.body.notes, 800) || undefined,
            });
            await writeDaycareDonationAudit({
                action: "ambassador.created",
                entityType: "ambassador",
                entityId: String(ambassador._id),
                ...getAdminAuditActor(res.locals.adminActor),
                after: {
                    name: ambassador.name,
                    linkSlug: ambassador.linkSlug,
                    goal: ambassador.goal,
                    refCode: ambassador.refCode,
                    active: ambassador.active,
                    notes: ambassador.notes ?? null,
                },
            });

            return res.status(201).json({
                success: true,
                data: { ...ambassador.toObject(), raised: 0, donationCount: 0 },
            });
        } catch (error) {
            console.error("Failed to create donation ambassador:", error);
            return res.status(400).json({
                success: false,
                message: "Failed to create donation ambassador",
            });
        }
    });

    router.patch("/ambassadors/:id", async (req, res) => {
        try {
            if (!mongoose.isValidObjectId(req.params.id)) {
                return res.status(404).json({
                    success: false,
                    message: "Ambassador was not found",
                });
            }
            const ambassador = await DaycareDonationAmbassador.findById(
                req.params.id
            );
            if (!ambassador) {
                return res.status(404).json({
                    success: false,
                    message: "Ambassador was not found",
                });
            }

            const before = {
                name: ambassador.name,
                linkSlug: ambassador.linkSlug ?? null,
                linkAliases: ambassador.linkAliases ?? [],
                goal: ambassador.goal,
                active: ambassador.active,
                notes: ambassador.notes ?? null,
            };
            if (req.body.name !== undefined) {
                const name = cleanText(req.body.name, 160);
                if (!name) {
                    return res.status(400).json({
                        success: false,
                        message: "Ambassador name is required",
                    });
                }
                ambassador.name = name;
            }
            if (req.body.linkSlug !== undefined) {
                const requestedLinkSlug = normalizeDaycareAmbassadorSlug(
                    req.body.linkSlug
                );
                if (!requestedLinkSlug) {
                    return res.status(400).json({
                        success: false,
                        message: "Ambassador link name in English is required",
                    });
                }
                const linkSlug = await createAvailableDaycareAmbassadorSlug(
                    requestedLinkSlug,
                    ambassador._id
                );
                if (ambassador.linkSlug && ambassador.linkSlug !== linkSlug) {
                    ambassador.linkAliases = Array.from(
                        new Set([
                            ...(ambassador.linkAliases ?? []),
                            ambassador.linkSlug,
                        ])
                    ).filter((alias) => alias !== linkSlug);
                }
                ambassador.linkSlug = linkSlug;
            }
            if (req.body.goal !== undefined) {
                const goal = Number(req.body.goal);
                if (!Number.isFinite(goal) || goal <= 0 || goal > 100_000_000) {
                    return res.status(400).json({
                        success: false,
                        message: "Ambassador goal must be greater than zero",
                    });
                }
                ambassador.goal = goal;
            }
            if (req.body.active !== undefined) {
                ambassador.active = Boolean(req.body.active);
            }
            if (req.body.notes !== undefined) {
                ambassador.notes = cleanText(req.body.notes, 800) || undefined;
            }
            if (
                ambassador.name === before.name &&
                (ambassador.linkSlug ?? null) === before.linkSlug &&
                ambassador.goal === before.goal &&
                ambassador.active === before.active &&
                (ambassador.notes ?? null) === before.notes
            ) {
                return res.status(400).json({
                    success: false,
                    message: "No ambassador change was requested",
                });
            }

            await ambassador.save();
            await writeDaycareDonationAudit({
                action: "ambassador.updated",
                entityType: "ambassador",
                entityId: String(ambassador._id),
                ...getAdminAuditActor(res.locals.adminActor),
                before,
                after: {
                    name: ambassador.name,
                    linkSlug: ambassador.linkSlug ?? null,
                    linkAliases: ambassador.linkAliases ?? [],
                    goal: ambassador.goal,
                    active: ambassador.active,
                    notes: ambassador.notes ?? null,
                },
            });

            return res.json({ success: true, data: ambassador });
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: "Failed to update donation ambassador",
            });
        }
    });

    router.delete("/ambassadors/:id", async (req, res) => {
        try {
            if (!mongoose.isValidObjectId(req.params.id)) {
                return res.status(404).json({
                    success: false,
                    message: "Ambassador was not found",
                });
            }

            const ambassador = await DaycareDonationAmbassador.findById(
                req.params.id
            );
            if (!ambassador) {
                return res.status(404).json({
                    success: false,
                    message: "Ambassador was not found",
                });
            }

            const [hasRecords, hasLeads, hasActiveIntents] = await Promise.all([
                DaycareDonationRecord.exists({ ambassadorId: ambassador._id }),
                DaycareDonationLead.exists({ ambassadorId: ambassador._id }),
                DaycareDonationIntent.exists({
                    ambassadorId: ambassador._id,
                    status: { $in: ["created", "submitted", "confirmed"] },
                }),
            ]);
            if (hasRecords || hasLeads || hasActiveIntents) {
                return res.status(409).json({
                    success: false,
                    message: "Ambassadors with donation activity cannot be deleted",
                });
            }

            await DaycareDonationAmbassador.deleteOne({ _id: ambassador._id });
            await DaycareDonationIntent.updateMany(
                { ambassadorId: ambassador._id },
                { $unset: { ambassadorId: 1 } }
            );
            await writeDaycareDonationAudit({
                action: "ambassador.deleted",
                entityType: "ambassador",
                entityId: String(ambassador._id),
                ...getAdminAuditActor(res.locals.adminActor),
                before: {
                    name: ambassador.name,
                    linkSlug: ambassador.linkSlug ?? null,
                    linkAliases: ambassador.linkAliases ?? [],
                    goal: ambassador.goal,
                    refCode: ambassador.refCode,
                    active: ambassador.active,
                    notes: ambassador.notes ?? null,
                },
                after: null,
            });

            return res.json({ success: true });
        } catch (error) {
            console.error("Failed to delete donation ambassador:", error);
            return res.status(400).json({
                success: false,
                message: "Failed to delete donation ambassador",
            });
        }
    });

};
