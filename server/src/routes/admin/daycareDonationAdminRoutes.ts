import { Router } from "express";
import { DAYCARE_DONATION_CAMPAIGN_SLUG } from "../../config/daycareDonationDefaults";
import { requireAdmin } from "../../middleware/adminAuth";
import type { AdminActor } from "../../middleware/adminAuth";
import { requireSecureAdminMutation } from "../../middleware/adminMutationSecurity";
import { DaycareDonationCampaign } from "../../models/DaycareDonationCampaign";
import { DaycareDonationAudit } from "../../models/DaycareDonationAudit";
import { DaycareDonationDiagnostic } from "../../models/DaycareDonationDiagnostic";
import { DaycareDonationRecord } from "../../models/DaycareDonationRecord";
import {
    ensureDefaultDaycareDonationCampaign,
    getDaycareDonationCampaignSnapshot,
    synchronizeDaycareDonationGoals,
} from "../../services/daycareDonationService";
import { writeDaycareDonationAudit } from "../../services/daycareDonationAuditService";
import type {
    DaycareDonationItemConfig,
    DaycareDonationRecordStatus,
    DaycareDonationManualSource,
    DaycareDonationStatusOverride,
} from "../../types/daycareDonations";

const router = Router();

router.use(requireAdmin);
router.use(requireSecureAdminMutation);

const cleanText = (value: unknown, maxLength = 500) =>
    String(value ?? "").trim().slice(0, maxLength);

const isStatusOverride = (
    value: unknown
): value is DaycareDonationStatusOverride =>
    value === "auto" || value === "open" || value === "closed";

const isRecordStatus = (
    value: unknown
): value is DaycareDonationRecordStatus =>
    value === "confirmed" ||
    value === "refunded" ||
    value === "cancelled";

const isManualSource = (
    value: unknown
): value is DaycareDonationManualSource =>
    value === "bank_transfer" ||
    value === "cash" ||
    value === "check" ||
    value === "other";

const getAdminAuditActor = (adminActor?: AdminActor) => ({
    actor: "admin" as const,
    actorId: adminActor?.id ?? "primary-admin",
    actorLabel: adminActor?.label ?? "מנהל ראשי",
});

const synchronizeStoredCampaignGoals = (campaign: {
    goal: number;
    categories: Array<{ id: string; goal: number }>;
    items: Array<{ categoryId: string; goal: number }>;
}) => {
    const goalState = {
        goal: campaign.goal,
        categories: campaign.categories.map((category) => ({
            id: category.id,
            goal: category.goal,
        })),
        items: campaign.items.map((item) => ({
            categoryId: item.categoryId,
            goal: item.goal,
        })),
    };
    const derived = synchronizeDaycareDonationGoals(goalState);
    campaign.goal = derived.campaignGoal;
    campaign.categories.forEach((category) => {
        category.goal = derived.categoryGoals.get(category.id) ?? 0;
    });
};

router.get("/campaign", async (_req, res) => {
    try {
        const campaign = await getDaycareDonationCampaignSnapshot();
        return res.json({ success: true, data: campaign });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to get donation campaign",
        });
    }
});

router.get("/records", async (_req, res) => {
    try {
        await ensureDefaultDaycareDonationCampaign();
        const records = await DaycareDonationRecord.find({
            campaignSlug: DAYCARE_DONATION_CAMPAIGN_SLUG,
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

router.post("/records", async (req, res) => {
    try {
        const campaign = await ensureDefaultDaycareDonationCampaign();
        const amount = Number(req.body.amount);
        const itemId = cleanText(req.body.itemId, 80) || undefined;
        const manualSource = req.body.manualSource;
        const reference = cleanText(req.body.reference, 200) || undefined;
        const note = cleanText(req.body.note, 600) || undefined;
        const receivedAt = req.body.receivedAt
            ? new Date(req.body.receivedAt)
            : null;

        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Donation amount must be greater than zero",
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

        const record = await DaycareDonationRecord.create({
            campaignSlug: campaign.slug,
            source: "manual",
            status: "confirmed",
            amount,
            itemId,
            donorName: cleanText(req.body.donorName, 160) || undefined,
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
                itemId: record.itemId ?? null,
                status: record.status,
                manualSource,
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

        const itemChanged =
            Object.prototype.hasOwnProperty.call(updates, "itemId") &&
            (updates.itemId ?? null) !== (previous.itemId ?? null);
        const statusChanged =
            Object.prototype.hasOwnProperty.call(updates, "status") &&
            updates.status !== previous.status;

        if ((itemChanged || statusChanged) && !reason) {
            return res.status(400).json({
                success: false,
                message:
                    "A reason is required for reassignment, cancellation or refund",
            });
        }

        if (!itemChanged && !statusChanged) {
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
                status: previous.status,
            },
            after: {
                itemId: record.itemId ?? null,
                status: record.status,
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

router.patch("/items/:itemId", async (req, res) => {
    try {
        const campaign = await ensureDefaultDaycareDonationCampaign();
        const item = campaign.items.find(
            (entry: DaycareDonationItemConfig) =>
                entry.id === req.params.itemId
        );

        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Donation item was not found",
            });
        }
        const before = {
            goal: item.goal,
            statusOverride: item.statusOverride,
            acceptingDonations: item.acceptingDonations,
        };

        if (req.body.goal !== undefined) {
            const goal = Number(req.body.goal);
            const reason = cleanText(req.body.reason, 600);
            if (!Number.isFinite(goal) || goal < 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid donation goal",
                });
            }
            if (goal !== item.goal && !reason) {
                return res.status(400).json({
                    success: false,
                    message: "A reason is required when changing an item goal",
                });
            }
            item.goal = goal;
        }

        if (req.body.statusOverride !== undefined) {
            if (!isStatusOverride(req.body.statusOverride)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid item status override",
                });
            }
            item.statusOverride = req.body.statusOverride;
        }

        if (req.body.acceptingDonations !== undefined) {
            item.acceptingDonations = Boolean(req.body.acceptingDonations);
        }

        synchronizeStoredCampaignGoals(
            campaign as unknown as Parameters<
                typeof synchronizeStoredCampaignGoals
            >[0]
        );
        campaign.markModified("items");
        campaign.markModified("categories");
        await campaign.save();

        await writeDaycareDonationAudit({
            action: "item.updated",
            entityType: "item",
            entityId: item.id,
            ...getAdminAuditActor(res.locals.adminActor),
            reason: cleanText(req.body.reason, 600) || undefined,
            before,
            after: {
                goal: item.goal,
                statusOverride: item.statusOverride,
                acceptingDonations: item.acceptingDonations,
            },
        });

        return res.json({
            success: true,
            data: await getDaycareDonationCampaignSnapshot(),
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: "Failed to update donation item",
        });
    }
});

router.patch("/categories/:categoryId", async (req, res) => {
    return res.status(409).json({
        success: false,
        message:
            "Category goals are derived from item goals and cannot be edited directly",
    });
});

router.patch("/campaign", async (req, res) => {
    try {
        const campaign = await ensureDefaultDaycareDonationCampaign();
        const before = {
            goal: campaign.goal,
            active: campaign.active,
        };

        if (req.body.goal !== undefined) {
            return res.status(409).json({
                success: false,
                message:
                    "Campaign goal is derived from item goals and cannot be edited directly",
            });
        }

        if (req.body.active !== undefined) {
            campaign.active = Boolean(req.body.active);
        }

        synchronizeStoredCampaignGoals(
            campaign as unknown as Parameters<
                typeof synchronizeStoredCampaignGoals
            >[0]
        );
        campaign.markModified("categories");
        await campaign.save();

        await writeDaycareDonationAudit({
            action: "campaign.updated",
            entityType: "campaign",
            entityId: campaign.slug,
            ...getAdminAuditActor(res.locals.adminActor),
            before,
            after: {
                goal: campaign.goal,
                active: campaign.active,
            },
        });

        return res.json({
            success: true,
            data: await getDaycareDonationCampaignSnapshot(),
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: "Failed to update donation campaign",
        });
    }
});

export { router as daycareDonationAdminRoutes };
