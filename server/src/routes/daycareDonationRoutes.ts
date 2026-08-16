import { randomUUID } from "crypto";
import express, { Router } from "express";
import { DAYCARE_DONATION_CAMPAIGN_SLUG } from "../config/daycareDonationDefaults";
import { areDaycareDonationPaymentsEnabled } from "../config/daycareDonationSecurity";
import { DaycareDonationIntent } from "../models/DaycareDonationIntent";
import { DaycareDonationDiagnostic } from "../models/DaycareDonationDiagnostic";
import { DaycareDonationRecord } from "../models/DaycareDonationRecord";
import {
    ensureDefaultDaycareDonationCampaign,
    getDaycareDonationCampaignSnapshot,
} from "../services/daycareDonationService";
import { writeDaycareDonationAudit } from "../services/daycareDonationAuditService";
import {
    buildDaycareDonationCallbackUrl,
    isDaycareDonationCallbackConfigured,
    isValidDaycareDonationIntentSignature,
} from "../services/daycareDonationCallbackSecurity";
import type { DaycareDonationItemConfig } from "../types/daycareDonations";
import { findActiveDaycareDonationAmbassador } from "../services/daycareDonationAmbassadorService";

const router = Router();

const cleanText = (value: unknown, maxLength: number) =>
    String(value ?? "").trim().slice(0, maxLength);

const toAmount = (value: unknown) => {
    const amount = Number.parseFloat(
        String(value ?? "").replace(/[^\d.-]/g, "")
    );
    return Number.isFinite(amount) ? amount : 0;
};

const getTransactionId = (body: Record<string, unknown>) => {
    const aliases = [
        "TransactionId",
        "TransactionID",
        "Transaction",
        "Confirmation",
        "ConfirmationNumber",
        "Approval",
        "Shovar",
        "KevaId",
    ];

    for (const key of aliases) {
        const value = cleanText(body[key], 160);
        if (value) return value;
    }

    return null;
};

const diagnosticValueFields = new Set([
    "Status",
    "Amount",
    "TransactionId",
    "TransactionID",
    "Transaction",
    "Confirmation",
    "ConfirmationNumber",
    "Approval",
    "Shovar",
    "KevaId",
]);

const getSafeProviderDiagnostic = (body: Record<string, unknown>) => {
    const fields = Object.keys(body)
        .filter((field) => !/card|credit|cvv|password|secret|param2/i.test(field))
        .sort()
        .slice(0, 100);
    const values = Object.fromEntries(
        fields
            .filter((field) => diagnosticValueFields.has(field))
            .map((field) => [field, cleanText(body[field], 300)])
    );

    return { fields, values };
};

router.get("/campaign", async (_req, res) => {
    try {
        const campaign = await getDaycareDonationCampaignSnapshot();

        res.set("Cache-Control", "no-store");
        return res.json({ success: true, data: campaign });
    } catch (error) {
        console.error("Failed to get daycare donation campaign:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to get daycare donation campaign",
        });
    }
});

router.get("/ambassadors/:identifier", async (req, res) => {
    try {
        const ambassador = await findActiveDaycareDonationAmbassador(
            req.params.identifier
        )?.select({ name: 1, refCode: 1, linkSlug: 1 });
        if (!ambassador) {
            return res.status(404).json({
                success: false,
                message: "Ambassador link was not found",
            });
        }

        res.set("Cache-Control", "no-store");
        return res.json({
            success: true,
            data: {
                name: ambassador.name,
                refCode: ambassador.refCode,
                linkSlug: ambassador.linkSlug,
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to validate ambassador link",
        });
    }
});

router.post("/intents", async (req, res) => {
    try {
        if (!areDaycareDonationPaymentsEnabled()) {
            return res.status(503).json({
                success: false,
                message: "Donation payment is not open yet",
            });
        }

        if (!isDaycareDonationCallbackConfigured()) {
            return res.status(503).json({
                success: false,
                message: "Donation payment is not configured",
            });
        }

        const campaign = await ensureDefaultDaycareDonationCampaign();
        const campaignSnapshot = await getDaycareDonationCampaignSnapshot();
        const amount = Number(req.body.amount);
        const paymentType =
            String(req.body.paymentType ?? "Ragil") === "HK"
                ? "HK"
                : "Ragil";
        const installments = Number(req.body.installments ?? 1);
        const itemId = cleanText(req.body.itemId, 80) || undefined;
        const donorName = cleanText(req.body.donorName, 160);
        const displayDonorName = req.body.displayDonorName !== false;
        const phone = cleanText(req.body.phone, 40);
        const email = cleanText(req.body.email, 180).toLowerCase();
        const dedication = cleanText(req.body.dedication, 600) || undefined;
        const refCode = String(req.body.refCode ?? "").trim().toLowerCase();

        if (!campaign.active) {
            return res.status(409).json({
                success: false,
                message: "Donation campaign is not active",
            });
        }

        if (!Number.isFinite(amount) || amount < 1 || amount > 1_000_000) {
            return res.status(400).json({
                success: false,
                message: "Invalid donation amount",
            });
        }

        if (
            !Number.isInteger(installments) ||
            installments < 1 ||
            installments > 12 ||
            (paymentType === "HK" && installments !== 12)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid donation payment plan",
            });
        }

        const campaignAmount =
            paymentType === "HK" ? amount * installments : amount;
        if (campaignAmount > 1_000_000) {
            return res.status(400).json({
                success: false,
                message: "Invalid donation amount",
            });
        }

        if (!donorName || !phone || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Donor contact details are required",
            });
        }

        if (itemId) {
            const item = campaignSnapshot.items.find(
                (entry: DaycareDonationItemConfig & { raised: number }) =>
                    entry.id === itemId
            );
            if (!item || !item.acceptingDonations) {
                return res.status(400).json({
                    success: false,
                    message: "Donation item is not accepting donations",
                });
            }
        }

        const ambassador = await findActiveDaycareDonationAmbassador(
            refCode
        )?.select({ _id: 1 });

        const publicId = randomUUID();
        const intent = await DaycareDonationIntent.create({
            publicId,
            campaignSlug: campaign.slug,
            mode: "live",
            status: "created",
            amount,
            paymentType,
            installments,
            itemId,
            donorName,
            displayDonorName,
            phone,
            email,
            dedication,
            ambassadorId: ambassador?._id,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        });

        const { callbackUrl, signature } =
            buildDaycareDonationCallbackUrl(req, publicId);

        await writeDaycareDonationAudit({
            action: "intent.created",
            entityType: "intent",
            entityId: publicId,
            actor: "system",
            after: {
                amount,
                campaignAmount,
                paymentType,
                installments,
                itemId: itemId ?? null,
                status: intent.status,
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
        console.error("Failed to create daycare donation intent:", error);
        return res.status(400).json({
            success: false,
            message: "Failed to prepare donation payment",
        });
    }
});

router.post(
    [
        "/nedarim-callback",
        "/nedarim-callback/:intent/:signature",
    ],
    express.urlencoded({ extended: false }),
    async (req, res) => {
        const publicId = cleanText(
            req.params.intent ?? req.query.intent ?? req.body?.Param1,
            80
        );
        const signature = cleanText(
            req.params.signature ?? req.query.signature ?? req.body?.Param2,
            128
        );

        if (
            !publicId ||
            !isValidDaycareDonationIntentSignature(publicId, signature)
        ) {
            return res.status(401).send("INVALID");
        }

        try {
            const intent = await DaycareDonationIntent.findOne({
                publicId,
                campaignSlug: DAYCARE_DONATION_CAMPAIGN_SLUG,
            });

            if (!intent) return res.status(404).send("NOT_FOUND");
            if (intent.status === "confirmed") return res.status(200).send("OK");
            const previousIntentStatus = intent.status;

            const body = (req.body ?? {}) as Record<string, unknown>;
            const status = cleanText(body.Status, 40).toUpperCase();
            const providerMessage = cleanText(
                body.Message ?? body.Result ?? body.Error,
                300
            );
            if (process.env.DAYCARE_DONATION_DIAGNOSTICS === "true") {
                try {
                    const diagnostic = getSafeProviderDiagnostic(body);
                    await DaycareDonationDiagnostic.create({
                        campaignSlug: intent.campaignSlug,
                        intentPublicId: publicId,
                        status: status || "UNKNOWN",
                        ...diagnostic,
                    });
                } catch (diagnosticError) {
                    console.error(
                        "Failed to store safe donation diagnostic:",
                        diagnosticError
                    );
                }
            }

            if (status !== "OK") {
                intent.status = "failed";
                intent.providerMessage = providerMessage || "Payment declined";
                await intent.save();
                await writeDaycareDonationAudit({
                    action: "intent.failed",
                    entityType: "intent",
                    entityId: publicId,
                    actor: "nedarim",
                    before: { status: previousIntentStatus },
                    after: { status: "failed" },
                });
                return res.status(200).send("OK");
            }

            const callbackAmount = toAmount(body.Amount);
            if (
                callbackAmount <= 0 ||
                Math.abs(callbackAmount - intent.amount) > 0.009
            ) {
                intent.status = "failed";
                intent.providerMessage = "Callback amount mismatch";
                await intent.save();
                await writeDaycareDonationAudit({
                    action: "intent.amountMismatch",
                    entityType: "intent",
                    entityId: publicId,
                    actor: "nedarim",
                    before: {
                        status: previousIntentStatus,
                        expectedAmount: intent.amount,
                    },
                    after: {
                        status: "failed",
                        callbackAmount,
                    },
                });
                return res.status(409).send("AMOUNT_MISMATCH");
            }

            const externalTransactionId = getTransactionId(body);
            if (!externalTransactionId) {
                intent.status = "failed";
                intent.providerMessage = "Provider transaction ID missing";
                await intent.save();
                await writeDaycareDonationAudit({
                    action: "intent.transactionIdMissing",
                    entityType: "intent",
                    entityId: publicId,
                    actor: "nedarim",
                    before: { status: previousIntentStatus },
                    after: { status: "failed" },
                });
                return res.status(409).send("TRANSACTION_ID_MISSING");
            }

            const paymentType = intent.paymentType ?? "Ragil";
            const installments = intent.installments ?? 1;
            const campaignAmount =
                paymentType === "HK"
                    ? callbackAmount * installments
                    : callbackAmount;

            if (intent.mode === "diagnostic") {
                intent.status = "confirmed";
                intent.externalTransactionId = externalTransactionId;
                intent.confirmedAt = new Date();
                intent.providerMessage = providerMessage || undefined;
                await intent.save();
                await writeDaycareDonationAudit({
                    action: "diagnostic.paymentObserved",
                    entityType: "intent",
                    entityId: publicId,
                    actor: "nedarim",
                    actorId: externalTransactionId,
                    actorLabel: "נדרים פלוס",
                    before: { status: previousIntentStatus },
                    after: {
                        status: "confirmed",
                        amount: campaignAmount,
                        providerAmount: callbackAmount,
                        paymentType,
                        installments,
                        externalTransactionId,
                        itemId: intent.itemId ?? null,
                        countedInCampaign: false,
                    },
                });
                return res.status(200).send("OK");
            }

            const writeResult = await DaycareDonationRecord.updateOne(
                { externalTransactionId },
                {
                    $setOnInsert: {
                        campaignSlug: intent.campaignSlug,
                        source: "nedarim",
                        status: "confirmed",
                        amount: campaignAmount,
                        paymentType,
                        installments,
                        itemId: intent.itemId,
                        donorName: intent.donorName,
                        displayDonorName: intent.displayDonorName,
                        phone: intent.phone,
                        email: intent.email,
                        dedication: intent.dedication,
                        ambassadorId: intent.ambassadorId,
                        providerIntentId: publicId,
                        externalTransactionId,
                        receivedAt: new Date(),
                    },
                },
                { upsert: true, runValidators: true }
            );
            const record = await DaycareDonationRecord.findOne({
                externalTransactionId,
            });

            if (!record || record.providerIntentId !== publicId) {
                intent.status = "failed";
                intent.providerMessage =
                    "Transaction ID is already linked to another intent";
                await intent.save();
                await writeDaycareDonationAudit({
                    action: "intent.transactionConflict",
                    entityType: "intent",
                    entityId: publicId,
                    actor: "nedarim",
                    actorId: externalTransactionId,
                    actorLabel: "נדרים פלוס",
                    before: { status: previousIntentStatus },
                    after: { status: "failed" },
                });
                return res.status(409).send("TRANSACTION_CONFLICT");
            }

            intent.status = "confirmed";
            intent.externalTransactionId = externalTransactionId;
            intent.confirmedAt = new Date();
            intent.providerMessage = providerMessage || undefined;
            await intent.save();

            if (writeResult.upsertedCount === 1) {
                await writeDaycareDonationAudit({
                    action: "payment.confirmed",
                    entityType: "record",
                    entityId: String(record._id),
                    actor: "nedarim",
                    actorId: externalTransactionId,
                    actorLabel: "נדרים פלוס",
                    after: {
                        intentId: publicId,
                        externalTransactionId,
                        amount: campaignAmount,
                        providerAmount: callbackAmount,
                        paymentType,
                        installments,
                        itemId: intent.itemId ?? null,
                    },
                });
            }

            return res.status(200).send("OK");
        } catch (error) {
            console.error("Daycare donation callback failed:", error);
            return res.status(500).send("RETRY");
        }
    }
);

export { router as daycareDonationRoutes };
