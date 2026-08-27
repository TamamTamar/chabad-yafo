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

export const fieldUpdateUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024, files: 1 },
});
export const receiveFieldUpdateImage = (
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

export const allowedFieldUpdateMimeTypes = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
]);

export const cleanText = (value: unknown, maxLength = 500) =>
    String(value ?? "").trim().slice(0, maxLength);

export const createUniqueAmbassadorRef = async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
        const refCode = randomBytes(4).toString("hex");
        const exists = await DaycareDonationAmbassador.exists({ refCode });
        if (!exists) return refCode;
    }
    throw new Error("Could not create a unique ambassador reference");
};

export const isStatusOverride = (
    value: unknown
): value is DaycareDonationStatusOverride =>
    value === "auto" || value === "open" || value === "closed";

export const isRecordStatus = (
    value: unknown
): value is DaycareDonationRecordStatus =>
    value === "confirmed" ||
    value === "refunded" ||
    value === "cancelled";

export const isManualSource = (
    value: unknown
): value is DaycareDonationManualSource =>
    value === "bank_transfer" ||
    value === "cash" ||
    value === "check" ||
    value === "other";

export const isLeadStatus = (value: unknown): value is DaycareDonationLeadStatus =>
    value === "new" ||
    value === "contacted" ||
    value === "waiting" ||
    value === "pledged" ||
    value === "completed" ||
    value === "closed";

export const isContactMethod = (
    value: unknown
): value is DaycareDonationContactMethod =>
    value === "phone" ||
    value === "whatsapp" ||
    value === "meeting" ||
    value === "other";

export const parseOptionalAmount = (value: unknown) => {
    if (value === undefined || value === null || value === "") return undefined;
    const amount = Number(value);
    return Number.isFinite(amount) && amount >= 0 && amount <= 100_000_000
        ? amount
        : null;
};

export const parseOptionalDate = (value: unknown) => {
    if (value === undefined || value === null || value === "") return undefined;
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : date;
};

export const getAdminAuditActor = (adminActor?: AdminActor) => ({
    actor: "admin" as const,
    actorId: adminActor?.id ?? "primary-admin",
    actorLabel: adminActor?.label ?? "מנהל ראשי",
});

export const synchronizeStoredCampaignGoals = (campaign: {
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
