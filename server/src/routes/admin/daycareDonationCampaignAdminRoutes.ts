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

export const registerDaycareDonationCampaignAdminRoutes = (router: Router) => {
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

    router.get("/exchange-rates/:currency", async (req, res) => {
        try {
            const currency = req.params.currency as DaycareForeignCurrency;
            if (currency !== "USD" && currency !== "EUR") {
                return res.status(400).json({
                    success: false,
                    message: "Exchange-rate currency must be USD or EUR",
                });
            }
            const requestedDate = cleanText(req.query.date, 10);
            return res.json({
                success: true,
                data: requestedDate
                    ? await getBankOfIsraelExchangeRateForDate(
                          currency,
                          requestedDate
                      )
                    : await getBankOfIsraelExchangeRate(currency),
            });
        } catch (error) {
            console.error("Failed to get Bank of Israel exchange rate:", error);
            return res.status(502).json({
                success: false,
                message: "Failed to get the current exchange rate",
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

};
