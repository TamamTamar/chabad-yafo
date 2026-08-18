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
    ensureDefaultDaycareDonationCampaign,
    getDaycareDonationCampaignSnapshot,
    normalizeDaycareDonationAllocations,
    synchronizeDaycareDonationGoals,
} from "../../services/daycareDonationService";
import { writeDaycareDonationAudit } from "../../services/daycareDonationAuditService";
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

const router = Router();

const fieldUpdateUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024, files: 1 },
});
const receiveFieldUpdateImage = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    fieldUpdateUpload.single("image")(req, res, (error) => {
        if (error instanceof multer.MulterError) {
            return res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({
                success: false,
                message:
                    error.code === "LIMIT_FILE_SIZE"
                        ? "התמונה גדולה מ־8MB. יש לבחור קובץ קטן יותר."
                        : "לא הצלחנו לקבל את התמונה.",
            });
        }
        if (error) return next(error);
        return next();
    });
};

const allowedFieldUpdateMimeTypes = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
]);

router.use(requireAdmin);
router.use(requireSecureAdminMutation);

const cleanText = (value: unknown, maxLength = 500) =>
    String(value ?? "").trim().slice(0, maxLength);

const createUniqueAmbassadorRef = async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
        const refCode = randomBytes(4).toString("hex");
        const exists = await DaycareDonationAmbassador.exists({ refCode });
        if (!exists) return refCode;
    }
    throw new Error("Could not create a unique ambassador reference");
};

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

const isLeadStatus = (value: unknown): value is DaycareDonationLeadStatus =>
    value === "new" ||
    value === "contacted" ||
    value === "waiting" ||
    value === "pledged" ||
    value === "completed" ||
    value === "closed";

const isContactMethod = (
    value: unknown
): value is DaycareDonationContactMethod =>
    value === "phone" ||
    value === "whatsapp" ||
    value === "meeting" ||
    value === "other";

const parseOptionalAmount = (value: unknown) => {
    if (value === undefined || value === null || value === "") return undefined;
    const amount = Number(value);
    return Number.isFinite(amount) && amount >= 0 && amount <= 100_000_000
        ? amount
        : null;
};

const parseOptionalDate = (value: unknown) => {
    if (value === undefined || value === null || value === "") return undefined;
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : date;
};

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
        const campaign = await getDaycareDonationCampaignSnapshot({
            includeUnpublishedUpdates: true,
        });
        return res.json({ success: true, data: campaign });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to get donation campaign",
        });
    }
});

router.post("/field-updates", receiveFieldUpdateImage, async (req, res) => {
    let storedImage: Awaited<
        ReturnType<typeof uploadDaycareDonationFieldUpdateImage>
    > | null = null;
    try {
        const campaign = await ensureDefaultDaycareDonationCampaign();
        const title = cleanText(req.body.title, 180);
        const description = cleanText(req.body.description, 1200);
        const imageAlt = cleanText(req.body.imageAlt, 220);
        const itemId = cleanText(req.body.itemId, 80) || undefined;
        const published = String(req.body.published) === "true";

        if (!title || !description || !imageAlt || !req.file) {
            return res.status(400).json({
                success: false,
                message: "כותרת, תיאור, תיאור תמונה וקובץ תמונה הם שדות חובה.",
            });
        }
        if (!allowedFieldUpdateMimeTypes.has(req.file.mimetype)) {
            return res.status(400).json({
                success: false,
                message: "אפשר להעלות תמונת JPG, PNG או WebP בלבד.",
            });
        }
        if (itemId && !campaign.items.some((item) => item.id === itemId)) {
            return res.status(400).json({
                success: false,
                message: "הסעיף המקושר לא נמצא.",
            });
        }

        storedImage = await uploadDaycareDonationFieldUpdateImage({
            bytes: req.file.buffer,
            mimeType: req.file.mimetype,
            originalName: req.file.originalname,
        });
        const now = new Date();
        const update = {
            id: randomUUID(),
            title,
            description,
            itemId,
            published,
            publishedAt: published ? now : undefined,
            image: {
                storageKey: storedImage.storageKey,
                mimeType: storedImage.mimeType,
                alt: imageAlt,
            },
            createdAt: now,
            updatedAt: now,
        };
        campaign.fieldUpdates.push(update);
        campaign.markModified("fieldUpdates");
        await campaign.save();

        await writeDaycareDonationAudit({
            action: "fieldUpdate.created",
            entityType: "fieldUpdate",
            entityId: update.id,
            ...getAdminAuditActor(res.locals.adminActor),
            after: { title, itemId: itemId ?? null, published },
        });

        return res.status(201).json({
            success: true,
            data: await getDaycareDonationCampaignSnapshot({
                includeUnpublishedUpdates: true,
            }),
        });
    } catch (error) {
        if (storedImage) {
            await deleteDaycareDonationFieldUpdateImage(storedImage.storageKey)
                .catch(() => undefined);
        }
        console.error("Failed to create field update:", error);
        return res.status(400).json({
            success: false,
            message: "לא הצלחנו לשמור את העדכון מהשטח.",
        });
    }
});

router.patch("/field-updates/:id", receiveFieldUpdateImage, async (req, res) => {
    let replacementImage: Awaited<
        ReturnType<typeof uploadDaycareDonationFieldUpdateImage>
    > | null = null;
    try {
        const campaign = await ensureDefaultDaycareDonationCampaign();
        const update = campaign.fieldUpdates.find(
            (entry) => entry.id === req.params.id
        );
        if (!update) {
            return res.status(404).json({
                success: false,
                message: "העדכון לא נמצא.",
            });
        }
        const before = {
            title: update.title,
            itemId: update.itemId ?? null,
            published: update.published,
        };

        if (req.body.title !== undefined) {
            const title = cleanText(req.body.title, 180);
            if (!title) {
                return res.status(400).json({ success: false, message: "נדרשת כותרת." });
            }
            update.title = title;
        }
        if (req.body.description !== undefined) {
            const description = cleanText(req.body.description, 1200);
            if (!description) {
                return res.status(400).json({ success: false, message: "נדרש תיאור." });
            }
            update.description = description;
        }
        if (req.body.imageAlt !== undefined) {
            const imageAlt = cleanText(req.body.imageAlt, 220);
            if (!imageAlt) {
                return res.status(400).json({ success: false, message: "נדרש תיאור לתמונה." });
            }
            update.image.alt = imageAlt;
        }
        if (req.body.itemId !== undefined) {
            const itemId = cleanText(req.body.itemId, 80) || undefined;
            if (itemId && !campaign.items.some((item) => item.id === itemId)) {
                return res.status(400).json({ success: false, message: "הסעיף המקושר לא נמצא." });
            }
            update.itemId = itemId;
        }
        if (req.body.published !== undefined) {
            const published = String(req.body.published) === "true";
            if (published && !update.published) update.publishedAt = new Date();
            update.published = published;
        }
        const previousStorageKey = update.image.storageKey;
        if (req.file) {
            if (!allowedFieldUpdateMimeTypes.has(req.file.mimetype)) {
                return res.status(400).json({
                    success: false,
                    message: "אפשר להעלות תמונת JPG, PNG או WebP בלבד.",
                });
            }
            replacementImage = await uploadDaycareDonationFieldUpdateImage({
                bytes: req.file.buffer,
                mimeType: req.file.mimetype,
                originalName: req.file.originalname,
            });
            update.image.src = undefined;
            update.image.storageKey = replacementImage.storageKey;
            update.image.mimeType = replacementImage.mimeType;
        }
        update.updatedAt = new Date();
        campaign.markModified("fieldUpdates");
        await campaign.save();

        if (replacementImage && previousStorageKey) {
            await deleteDaycareDonationFieldUpdateImage(previousStorageKey).catch(() => undefined);
        }
        await writeDaycareDonationAudit({
            action: "fieldUpdate.updated",
            entityType: "fieldUpdate",
            entityId: update.id,
            ...getAdminAuditActor(res.locals.adminActor),
            before,
            after: {
                title: update.title,
                itemId: update.itemId ?? null,
                published: update.published,
            },
        });
        return res.json({
            success: true,
            data: await getDaycareDonationCampaignSnapshot({
                includeUnpublishedUpdates: true,
            }),
        });
    } catch (error) {
        if (replacementImage) {
            await deleteDaycareDonationFieldUpdateImage(replacementImage.storageKey)
                .catch(() => undefined);
        }
        console.error("Failed to update field update:", error);
        return res.status(400).json({ success: false, message: "לא הצלחנו לעדכן את הפרסום." });
    }
});

router.delete("/field-updates/:id", async (req, res) => {
    try {
        const campaign = await ensureDefaultDaycareDonationCampaign();
        const index = campaign.fieldUpdates.findIndex(
            (entry) => entry.id === req.params.id
        );
        if (index < 0) {
            return res.status(404).json({ success: false, message: "העדכון לא נמצא." });
        }
        const [removed] = campaign.fieldUpdates.splice(index, 1);
        campaign.markModified("fieldUpdates");
        await campaign.save();
        if (removed.image.storageKey) {
            await deleteDaycareDonationFieldUpdateImage(removed.image.storageKey).catch(() => undefined);
        }
        await writeDaycareDonationAudit({
            action: "fieldUpdate.deleted",
            entityType: "fieldUpdate",
            entityId: removed.id,
            ...getAdminAuditActor(res.locals.adminActor),
            before: {
                title: removed.title,
                itemId: removed.itemId ?? null,
                published: removed.published,
            },
        });
        return res.json({
            success: true,
            data: await getDaycareDonationCampaignSnapshot({
                includeUnpublishedUpdates: true,
            }),
        });
    } catch (error) {
        return res.status(400).json({ success: false, message: "לא הצלחנו למחוק את העדכון." });
    }
});

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
            ownerLabel: cleanText(req.body.ownerLabel, 160) || undefined,
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
                ownerLabel: ambassador.ownerLabel ?? null,
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
            ownerLabel: ambassador.ownerLabel ?? null,
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
        if (req.body.ownerLabel !== undefined) {
            ambassador.ownerLabel =
                cleanText(req.body.ownerLabel, 160) || undefined;
        }
        if (req.body.notes !== undefined) {
            ambassador.notes = cleanText(req.body.notes, 800) || undefined;
        }
        if (
            ambassador.name === before.name &&
            (ambassador.linkSlug ?? null) === before.linkSlug &&
            ambassador.goal === before.goal &&
            ambassador.active === before.active &&
            (ambassador.ownerLabel ?? null) === before.ownerLabel &&
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
                ownerLabel: ambassador.ownerLabel ?? null,
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
                ownerLabel: ambassador.ownerLabel ?? null,
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

router.post("/records", async (req, res) => {
    try {
        const campaign = await ensureDefaultDaycareDonationCampaign();
        const amount = Number(req.body.amount);
        const itemId = cleanText(req.body.itemId, 80) || undefined;
        const ambassadorId = cleanText(req.body.ambassadorId, 80) || undefined;
        const manualSource = req.body.manualSource;
        const reference = cleanText(req.body.reference, 200) || undefined;
        const note = cleanText(req.body.note, 600) || undefined;
        const displayDonorName = req.body.displayDonorName !== false;
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
            recommendedChoiceIds: campaign.recommendedChoiceIds ?? [],
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

        if (req.body.recommendedChoiceIds !== undefined) {
            if (!Array.isArray(req.body.recommendedChoiceIds)) {
                return res.status(400).json({
                    success: false,
                    message: "Recommended choices must be an array",
                });
            }
            const recommendedChoiceIds = req.body.recommendedChoiceIds.map(
                (value: unknown) => cleanText(value, 80)
            );
            const allowedChoiceIds = new Set([
                "general",
                ...campaign.items.map((item) => item.id),
            ]);
            if (
                recommendedChoiceIds.length !== 0 &&
                (recommendedChoiceIds.length !== 3 ||
                    new Set(recommendedChoiceIds).size !== 3 ||
                    recommendedChoiceIds.some(
                        (choiceId: string) => !allowedChoiceIds.has(choiceId)
                    ))
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Choose three distinct valid donation paths",
                });
            }
            campaign.recommendedChoiceIds = recommendedChoiceIds;
            campaign.markModified("recommendedChoiceIds");
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
                recommendedChoiceIds: campaign.recommendedChoiceIds ?? [],
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
