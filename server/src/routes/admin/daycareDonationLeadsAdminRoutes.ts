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

export const registerDaycareDonationLeadsAdminRoutes = (router: Router) => {
    router.get("/leads", async (_req, res) => {
        try {
            const leads = await DaycareDonationLead.find({
                campaignSlug: DAYCARE_DONATION_CAMPAIGN_SLUG,
            })
                .populate({
                    path: "ambassadorId",
                    select: { name: 1, refCode: 1, active: 1 },
                })
                .sort({ nextFollowUpAt: 1, updatedAt: -1 })
                .limit(500)
                .lean();

            return res.json({ success: true, data: leads });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: "Failed to get donation leads",
            });
        }
    });

    router.post("/leads", async (req, res) => {
        try {
            const donorName = cleanText(req.body.donorName, 160);
            const targetAmount = parseOptionalAmount(req.body.targetAmount);
            const pledgedAmount = parseOptionalAmount(req.body.pledgedAmount);
            const nextFollowUpAt = parseOptionalDate(req.body.nextFollowUpAt);
            const status = req.body.status ?? "new";
            const contactMethod = req.body.contactMethod || undefined;
            const ambassadorId = cleanText(req.body.ambassadorId, 80) || undefined;

            if (!donorName) {
                return res.status(400).json({
                    success: false,
                    message: "Lead donor name is required",
                });
            }
            if (targetAmount === null || pledgedAmount === null) {
                return res.status(400).json({
                    success: false,
                    message: "Lead amounts must be valid positive values",
                });
            }
            if (nextFollowUpAt === null) {
                return res.status(400).json({
                    success: false,
                    message: "Lead follow-up date is invalid",
                });
            }
            if (!isLeadStatus(status)) {
                return res.status(400).json({
                    success: false,
                    message: "Lead status is invalid",
                });
            }
            if (contactMethod && !isContactMethod(contactMethod)) {
                return res.status(400).json({
                    success: false,
                    message: "Lead contact method is invalid",
                });
            }
            if (status === "pledged" && !pledgedAmount) {
                return res.status(400).json({
                    success: false,
                    message: "A pledged lead requires a pledged amount",
                });
            }
            if (ambassadorId) {
                if (
                    !mongoose.isValidObjectId(ambassadorId) ||
                    !(await DaycareDonationAmbassador.exists({ _id: ambassadorId }))
                ) {
                    return res.status(400).json({
                        success: false,
                        message: "Lead ambassador was not found",
                    });
                }
            }

            const lead = await DaycareDonationLead.create({
                campaignSlug: DAYCARE_DONATION_CAMPAIGN_SLUG,
                donorName,
                phone: cleanText(req.body.phone, 40) || undefined,
                ambassadorId,
                targetAmount,
                pledgedAmount,
                contactMethod,
                status,
                nextFollowUpAt,
                notes: cleanText(req.body.notes, 1200) || undefined,
                createdById: res.locals.adminActor.id,
                createdByLabel: res.locals.adminActor.label,
            });

            await writeDaycareDonationAudit({
                action: "lead.created",
                entityType: "lead",
                entityId: String(lead._id),
                ...getAdminAuditActor(res.locals.adminActor),
                after: {
                    donorName: lead.donorName,
                    status: lead.status,
                    targetAmount: lead.targetAmount ?? null,
                    pledgedAmount: lead.pledgedAmount ?? null,
                    ambassadorId: lead.ambassadorId ?? null,
                    nextFollowUpAt: lead.nextFollowUpAt ?? null,
                },
            });

            await lead.populate({
                path: "ambassadorId",
                select: { name: 1, refCode: 1, active: 1 },
            });
            return res.status(201).json({ success: true, data: lead });
        } catch (error) {
            console.error("Failed to create donation lead:", error);
            return res.status(400).json({
                success: false,
                message: "Failed to create donation lead",
            });
        }
    });

    router.patch("/leads/:id", async (req, res) => {
        try {
            if (!mongoose.isValidObjectId(req.params.id)) {
                return res.status(404).json({
                    success: false,
                    message: "Donation lead was not found",
                });
            }
            const lead = await DaycareDonationLead.findOne({
                _id: req.params.id,
                campaignSlug: DAYCARE_DONATION_CAMPAIGN_SLUG,
            });
            if (!lead) {
                return res.status(404).json({
                    success: false,
                    message: "Donation lead was not found",
                });
            }

            const before = {
                donorName: lead.donorName,
                phone: lead.phone ?? null,
                ambassadorId: lead.ambassadorId
                    ? String(lead.ambassadorId)
                    : null,
                targetAmount: lead.targetAmount ?? null,
                pledgedAmount: lead.pledgedAmount ?? null,
                contactMethod: lead.contactMethod ?? null,
                status: lead.status,
                lastContactAt: lead.lastContactAt?.toISOString() ?? null,
                nextFollowUpAt: lead.nextFollowUpAt?.toISOString() ?? null,
                notes: lead.notes ?? null,
            };

            if (req.body.donorName !== undefined) {
                const donorName = cleanText(req.body.donorName, 160);
                if (!donorName) {
                    return res.status(400).json({
                        success: false,
                        message: "Lead donor name is required",
                    });
                }
                lead.donorName = donorName;
            }
            if (req.body.phone !== undefined) {
                lead.phone = cleanText(req.body.phone, 40) || undefined;
            }
            if (req.body.targetAmount !== undefined) {
                const amount = parseOptionalAmount(req.body.targetAmount);
                if (amount === null) {
                    return res.status(400).json({
                        success: false,
                        message: "Lead target amount is invalid",
                    });
                }
                lead.targetAmount = amount;
            }
            if (req.body.pledgedAmount !== undefined) {
                const amount = parseOptionalAmount(req.body.pledgedAmount);
                if (amount === null) {
                    return res.status(400).json({
                        success: false,
                        message: "Lead pledged amount is invalid",
                    });
                }
                lead.pledgedAmount = amount;
            }
            if (req.body.contactMethod !== undefined) {
                const method = req.body.contactMethod || undefined;
                if (method && !isContactMethod(method)) {
                    return res.status(400).json({
                        success: false,
                        message: "Lead contact method is invalid",
                    });
                }
                lead.contactMethod = method;
            }
            if (req.body.status !== undefined) {
                if (!isLeadStatus(req.body.status)) {
                    return res.status(400).json({
                        success: false,
                        message: "Lead status is invalid",
                    });
                }
                lead.status = req.body.status;
            }
            if (req.body.lastContactAt !== undefined) {
                const date = parseOptionalDate(req.body.lastContactAt);
                if (date === null) {
                    return res.status(400).json({
                        success: false,
                        message: "Lead contact date is invalid",
                    });
                }
                lead.lastContactAt = date;
            }
            if (req.body.nextFollowUpAt !== undefined) {
                const date = parseOptionalDate(req.body.nextFollowUpAt);
                if (date === null) {
                    return res.status(400).json({
                        success: false,
                        message: "Lead follow-up date is invalid",
                    });
                }
                lead.nextFollowUpAt = date;
            }
            if (req.body.notes !== undefined) {
                lead.notes = cleanText(req.body.notes, 1200) || undefined;
            }
            if (req.body.ambassadorId !== undefined) {
                const ambassadorId = cleanText(req.body.ambassadorId, 80);
                if (ambassadorId) {
                    if (
                        !mongoose.isValidObjectId(ambassadorId) ||
                        !(await DaycareDonationAmbassador.exists({
                            _id: ambassadorId,
                        }))
                    ) {
                        return res.status(400).json({
                            success: false,
                            message: "Lead ambassador was not found",
                        });
                    }
                    lead.ambassadorId = new mongoose.Types.ObjectId(ambassadorId);
                } else {
                    lead.ambassadorId = undefined;
                }
            }

            if (lead.status === "pledged" && !lead.pledgedAmount) {
                return res.status(400).json({
                    success: false,
                    message: "A pledged lead requires a pledged amount",
                });
            }

            const after = {
                donorName: lead.donorName,
                phone: lead.phone ?? null,
                ambassadorId: lead.ambassadorId
                    ? String(lead.ambassadorId)
                    : null,
                targetAmount: lead.targetAmount ?? null,
                pledgedAmount: lead.pledgedAmount ?? null,
                contactMethod: lead.contactMethod ?? null,
                status: lead.status,
                lastContactAt: lead.lastContactAt?.toISOString() ?? null,
                nextFollowUpAt: lead.nextFollowUpAt?.toISOString() ?? null,
                notes: lead.notes ?? null,
            };
            if (JSON.stringify(before) === JSON.stringify(after)) {
                return res.status(400).json({
                    success: false,
                    message: "No donation lead change was requested",
                });
            }

            await lead.save();
            await writeDaycareDonationAudit({
                action: "lead.updated",
                entityType: "lead",
                entityId: String(lead._id),
                ...getAdminAuditActor(res.locals.adminActor),
                before,
                after,
            });
            await lead.populate({
                path: "ambassadorId",
                select: { name: 1, refCode: 1, active: 1 },
            });
            return res.json({ success: true, data: lead });
        } catch (error) {
            console.error("Failed to update donation lead:", error);
            return res.status(400).json({
                success: false,
                message: "Failed to update donation lead",
            });
        }
    });

};
