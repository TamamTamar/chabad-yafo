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

export const registerDaycareDonationRecordsAdminRoutes = (router: Router) => {
    router.get("/records", async (_req, res) => {
        try {
            await ensureDefaultDaycareDonationCampaign();
            const records = await DaycareDonationRecord.find({
                campaignSlug: DAYCARE_DONATION_CAMPAIGN_SLUG,
            })
                .populate({
                    path: "ambassadorId",
                    select: { name: 1, refCode: 1, active: 1 },
                })
                .sort({ receivedAt: -1, createdAt: -1 })
                .limit(250)
                .lean();

            return res.json({ success: true, data: records });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: "Failed to get donation records",
            });
        }
    });

    router.post("/records", async (req, res) => {
        try {
            const campaign = await ensureDefaultDaycareDonationCampaign();
            const originalAmount = Number(req.body.amount);
            if (
                req.body.currency !== undefined &&
                req.body.currency !== "ILS" &&
                req.body.currency !== "USD" &&
                req.body.currency !== "EUR"
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Donation currency must be ILS, USD or EUR",
                });
            }
            const originalCurrency =
                req.body.currency === "USD" || req.body.currency === "EUR"
                    ? req.body.currency
                    : "ILS";
            const exchangeRate =
                originalCurrency !== "ILS" ? Number(req.body.exchangeRate) : 1;
            const amount = convertDaycareDonationToIls(
                originalAmount,
                originalCurrency,
                exchangeRate
            );
            const itemId = cleanText(req.body.itemId, 80) || undefined;
            const ambassadorId = cleanText(req.body.ambassadorId, 80) || undefined;
            const manualSource = req.body.manualSource;
            const reference = cleanText(req.body.reference, 200) || undefined;
            const note = cleanText(req.body.note, 600) || undefined;
            const displayDonorName = req.body.displayDonorName !== false;
            const receivedAt = req.body.receivedAt
                ? new Date(req.body.receivedAt)
                : null;

            if (!Number.isFinite(originalAmount) || originalAmount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Donation amount must be greater than zero",
                });
            }

            if (
                originalCurrency !== "ILS" &&
                (!Number.isFinite(exchangeRate) ||
                    exchangeRate <= 0 ||
                    exchangeRate > 100)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "A valid foreign-currency to ILS exchange rate is required",
                });
            }

            if (!Number.isFinite(amount) || amount <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Converted donation amount must be greater than zero",
                });
            }

            if (!isManualSource(manualSource)) {
                return res.status(400).json({
                    success: false,
                    message: "Manual donation source is required",
                });
            }

            if (!receivedAt || Number.isNaN(receivedAt.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: "Manual donation date is required",
                });
            }

            if (!note && !reference) {
                return res.status(400).json({
                    success: false,
                    message: "Manual donation note or reference is required",
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

            if (
                ambassadorId &&
                (!mongoose.isValidObjectId(ambassadorId) ||
                    !(await DaycareDonationAmbassador.exists({
                        _id: ambassadorId,
                        active: true,
                    })))
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Donation ambassador was not found or is inactive",
                });
            }

            const record = await DaycareDonationRecord.create({
                campaignSlug: campaign.slug,
                source: "manual",
                status: "confirmed",
                amount,
                originalAmount,
                originalCurrency,
                exchangeRate,
                itemId,
                ambassadorId: ambassadorId
                    ? new mongoose.Types.ObjectId(ambassadorId)
                    : undefined,
                donorName: cleanText(req.body.donorName, 160) || undefined,
                displayDonorName,
                phone: cleanText(req.body.phone, 40) || undefined,
                email: cleanText(req.body.email, 180) || undefined,
                dedication: cleanText(req.body.dedication, 600) || undefined,
                note,
                manualSource,
                reference,
                enteredById: res.locals.adminActor.id,
                enteredByLabel: res.locals.adminActor.label,
                receivedAt,
            });

            await writeDaycareDonationAudit({
                action: "record.manualCreated",
                entityType: "record",
                entityId: String(record._id),
                ...getAdminAuditActor(res.locals.adminActor),
                after: {
                    amount: record.amount,
                    originalAmount: record.originalAmount,
                    originalCurrency: record.originalCurrency,
                    exchangeRate: record.exchangeRate,
                    itemId: record.itemId ?? null,
                    ambassadorId: record.ambassadorId ?? null,
                    status: record.status,
                    manualSource,
                    displayDonorName,
                    reference: reference ?? null,
                    receivedAt,
                    enteredById: res.locals.adminActor.id,
                    enteredByLabel: res.locals.adminActor.label,
                },
            });

            return res.status(201).json({ success: true, data: record });
        } catch (error) {
            console.error("Failed to create manual donation:", error);
            return res.status(400).json({
                success: false,
                message: "Failed to create manual donation",
            });
        }
    });

    router.patch("/records/:id", async (req, res) => {
        try {
            const campaign = await ensureDefaultDaycareDonationCampaign();
            const updates: Record<string, unknown> = {};
            const reason = cleanText(req.body.reason, 600);
            const previous = await DaycareDonationRecord.findOne({
                _id: req.params.id,
                campaignSlug: DAYCARE_DONATION_CAMPAIGN_SLUG,
            }).lean();

            if (!previous) {
                return res.status(404).json({
                    success: false,
                    message: "Donation record was not found",
                });
            }

            if (
                req.body.itemId !== undefined &&
                req.body.allocations !== undefined
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Use either an item or allocations, not both",
                });
            }

            if (req.body.itemId !== undefined) {
                const itemId = cleanText(req.body.itemId, 80);
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
                updates.itemId = itemId || null;
                updates.allocations = [];
            }

            if (req.body.allocations !== undefined) {
                const allocations = normalizeDaycareDonationAllocations(
                    req.body.allocations,
                    previous.amount,
                    new Set(campaign.items.map((item) => item.id))
                );
                updates.allocations = allocations;
                updates.itemId =
                    allocations.length === 1 ? allocations[0].itemId : null;
            }

            if (req.body.ambassadorId !== undefined) {
                const ambassadorId = cleanText(req.body.ambassadorId, 80);
                if (ambassadorId) {
                    if (
                        !mongoose.isValidObjectId(ambassadorId) ||
                        !(await DaycareDonationAmbassador.exists({
                            _id: ambassadorId,
                            active: true,
                        }))
                    ) {
                        return res.status(400).json({
                            success: false,
                            message: "Donation ambassador was not found or is inactive",
                        });
                    }
                    updates.ambassadorId = new mongoose.Types.ObjectId(
                        ambassadorId
                    );
                } else {
                    updates.ambassadorId = null;
                }
            }

            if (req.body.status !== undefined) {
                if (!isRecordStatus(req.body.status)) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid donation status",
                    });
                }
                updates.status = req.body.status;
            }

            if (req.body.displayDonorName !== undefined) {
                if (typeof req.body.displayDonorName !== "boolean") {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid public donor name setting",
                    });
                }
                if (req.body.displayDonorName && !previous.donorName) {
                    return res.status(400).json({
                        success: false,
                        message: "A donor name is required for public display",
                    });
                }
                updates.displayDonorName = req.body.displayDonorName;
            }

            const previousAllocations = previous.allocations?.length
                ? previous.allocations.map((allocation) => ({
                      itemId: allocation.itemId,
                      amount: allocation.amount,
                  }))
                : previous.itemId
                  ? [{ itemId: previous.itemId, amount: previous.amount }]
                  : [];
            const nextAllocations = Object.prototype.hasOwnProperty.call(
                updates,
                "allocations"
            )
                ? (updates.allocations as Array<{
                      itemId: string;
                      amount: number;
                  }>)
                : previousAllocations;
            const itemChanged =
                JSON.stringify(nextAllocations) !==
                JSON.stringify(previousAllocations);
            const ambassadorChanged =
                Object.prototype.hasOwnProperty.call(updates, "ambassadorId") &&
                String(updates.ambassadorId ?? "") !==
                    String(previous.ambassadorId ?? "");
            const statusChanged =
                Object.prototype.hasOwnProperty.call(updates, "status") &&
                updates.status !== previous.status;
            const displayDonorNameChanged =
                Object.prototype.hasOwnProperty.call(updates, "displayDonorName") &&
                updates.displayDonorName !== (previous.displayDonorName !== false);

            if (
                (itemChanged ||
                    ambassadorChanged ||
                    statusChanged ||
                    displayDonorNameChanged) &&
                !reason
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "A reason is required for reassignment, cancellation or refund",
                });
            }

            if (
                !itemChanged &&
                !ambassadorChanged &&
                !statusChanged &&
                !displayDonorNameChanged
            ) {
                return res.status(400).json({
                    success: false,
                    message: "No donation record change was requested",
                });
            }

            const record = await DaycareDonationRecord.findOneAndUpdate(
                {
                    _id: req.params.id,
                    campaignSlug: DAYCARE_DONATION_CAMPAIGN_SLUG,
                },
                { $set: updates },
                { new: true, runValidators: true }
            );

            if (!record) {
                return res.status(404).json({
                    success: false,
                    message: "Donation record was not found",
                });
            }

            await writeDaycareDonationAudit({
                action: "record.updated",
                entityType: "record",
                entityId: String(record._id),
                ...getAdminAuditActor(res.locals.adminActor),
                reason,
                before: {
                    itemId: previous.itemId ?? null,
                    allocations: previousAllocations,
                    ambassadorId: previous.ambassadorId ?? null,
                    status: previous.status,
                    displayDonorName: previous.displayDonorName !== false,
                },
                after: {
                    itemId: record.itemId ?? null,
                    allocations: record.allocations ?? [],
                    ambassadorId: record.ambassadorId ?? null,
                    status: record.status,
                    displayDonorName: Boolean(record.displayDonorName),
                },
            });

            return res.json({ success: true, data: record });
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: "Failed to update donation record",
            });
        }
    });

};
