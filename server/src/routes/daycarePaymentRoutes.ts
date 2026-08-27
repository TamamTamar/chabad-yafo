import { randomUUID } from "crypto";
import express, { Router } from "express";
import { Types } from "mongoose";
import { areDaycareDonationPaymentsEnabled } from "../config/daycareDonationSecurity";
import { requireAdmin } from "../middleware/adminAuth";
import { requireSecureAdminMutation } from "../middleware/adminMutationSecurity";
import {
    publicOnboardingRateLimit,
    setPublicOnboardingSecurityHeaders,
} from "../middleware/publicOnboardingSecurity";
import { DaycareChild } from "../models/DaycareChild";
import { DaycareFamily } from "../models/DaycareFamily";
import { DaycareOnboarding } from "../models/DaycareOnboarding";
import { DaycarePayment } from "../models/DaycarePayment";
import {
    buildSignedDaycareCallbackUrl,
    isDaycareDonationCallbackConfigured,
    isTrustedNedarimCallbackRequest,
    isValidDaycareDonationIntentSignature,
} from "../services/daycareDonationCallbackSecurity";
import { resolveNedarimExternalTransactionId } from "../services/daycareDonationProvider";
import { DaycareOnboardingServiceError } from "../services/daycareOnboarding/core";
import { getPublicOnboardingDocumentByToken } from "../services/daycareOnboarding/publicFlow";

const publicRouter = Router();
const adminRouter = Router();
const DEFAULT_TUITION = 5500;

const cleanText = (value: unknown, maxLength: number) =>
    String(value ?? "").trim().slice(0, maxLength);

const toAmount = (value: unknown) => {
    const amount = Number.parseFloat(String(value ?? "").replace(/[^\d.-]/g, ""));
    return Number.isFinite(amount) ? amount : 0;
};

publicRouter.post(
    "/onboarding/:token/intents",
    setPublicOnboardingSecurityHeaders,
    publicOnboardingRateLimit,
    async (req, res) => {
        try {
            if (!areDaycareDonationPaymentsEnabled()) {
                return res.status(503).json({
                    success: false,
                    message: "שירות התשלום אינו זמין כרגע",
                });
            }

            // The amount is intentionally never read from the request. The current
            // record is reloaded from Mongo immediately before creating the intent.
            const onboarding = await getPublicOnboardingDocumentByToken(
                req.params.token,
                new Date()
            );
            if ((onboarding.standingOrderStatus ?? "pending") === "active") {
                return res.status(409).json({
                    success: false,
                    message: "החיוב הנוכחי כבר שולם",
                });
            }

            const requestedAmount =
                onboarding.monthlyTuitionAmount ?? DEFAULT_TUITION;
            if (
                !Number.isFinite(requestedAmount) ||
                requestedAmount < 1 ||
                requestedAmount > 1_000_000
            ) {
                return res.status(409).json({
                    success: false,
                    message: "סכום החיוב אינו תקין",
                });
            }

            const [child, family] = await Promise.all([
                onboarding.childId
                    ? DaycareChild.findById(onboarding.childId)
                          .select("firstName lastName")
                          .lean()
                    : null,
                onboarding.familyId
                    ? DaycareFamily.findById(onboarding.familyId)
                          .select("guardians")
                          .lean()
                    : null,
            ]);
            if (onboarding.childId && !child) {
                return res.status(409).json({
                    success: false,
                    message: "רשומת הילד אינה זמינה",
                });
            }

            const payer = family?.guardians?.[0];
            const childName = child
                ? `${child.firstName} ${child.lastName}`.trim()
                : "הרישום האישי";
            const publicId = randomUUID();
            const payment = await DaycarePayment.create({
                paymentType: "daycare_payment",
                providerPaymentType: "HK",
                installments: 12,
                publicId,
                onboardingId: onboarding._id,
                childId: onboarding.childId,
                childName,
                schoolYear: onboarding.schoolYear,
                monthlyTuitionAmount:
                    onboarding.monthlyTuitionAmount ?? DEFAULT_TUITION,
                requestedAmount,
                payerName: payer?.fullName ?? onboarding.temporaryParentName,
                payerPhone: payer?.phone ?? onboarding.temporaryParentPhone,
                payerEmail: payer?.email,
                status: "created",
                expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            });
            const { callbackUrl, signature } = buildSignedDaycareCallbackUrl(
                req,
                publicId,
                "daycare-payments/nedarim-callback"
            );

            res.setHeader("Cache-Control", "no-store");
            return res.status(201).json({
                success: true,
                data: {
                    intentId: publicId,
                    amount: requestedAmount,
                    childName,
                    payer: {
                        name: payer?.fullName ?? onboarding.temporaryParentName ?? "",
                        phone: payer?.phone ?? onboarding.temporaryParentPhone ?? "",
                        email: payer?.email ?? "",
                    },
                    callbackUrl,
                    param1: publicId,
                    param2: signature,
                    expiresAt: payment.expiresAt,
                },
            });
        } catch (error) {
            if (error instanceof DaycareOnboardingServiceError) {
                return res.status(error.statusCode).json({
                    success: false,
                    code: error.code,
                    message: error.message,
                });
            }
            console.error("Failed to prepare daycare tuition payment:", error);
            return res.status(400).json({
                success: false,
                message: "לא הצלחנו להכין את התשלום",
            });
        }
    }
);

publicRouter.post(
    "/nedarim-callback/:intent/:signature",
    express.urlencoded({ extended: false }),
    async (req, res) => {
        const publicId = cleanText(req.params.intent, 80);
        const signature = cleanText(req.params.signature, 128);
        if (!publicId) {
            return res.status(401).send("INVALID");
        }
        if (!isTrustedNedarimCallbackRequest(req)) {
            return res.status(403).send("UNTRUSTED_SOURCE");
        }
        if (
            isDaycareDonationCallbackConfigured() &&
            !isValidDaycareDonationIntentSignature(publicId, signature)
        ) {
            return res.status(401).send("INVALID");
        }

        try {
            const payment = await DaycarePayment.findOne({ publicId, paymentType: "daycare_payment" });
            if (!payment) return res.status(404).send("NOT_FOUND");
            if (payment.status === "confirmed") return res.status(200).send("OK");
            const body = (req.body ?? {}) as Record<string, unknown>;
            const status = cleanText(body.Status, 40).toUpperCase();
            const providerMessage = cleanText(body.Message ?? body.Result ?? body.Error, 300);
            if (status !== "OK") {
                payment.status = "failed";
                payment.providerMessage = providerMessage || "Payment declined";
                await payment.save();
                return res.status(200).send("OK");
            }

            const callbackAmount = toAmount(body.Amount);
            if (callbackAmount <= 0 || Math.abs(callbackAmount - payment.requestedAmount) > 0.009) {
                payment.status = "failed";
                payment.providerMessage = "Callback amount mismatch";
                await payment.save();
                return res.status(409).send("AMOUNT_MISMATCH");
            }

            const externalTransactionId = resolveNedarimExternalTransactionId({
                body,
                paymentType: "HK",
                intentPublicId: publicId,
            });
            if (!externalTransactionId) {
                payment.status = "failed";
                payment.providerMessage = "Provider transaction ID missing";
                await payment.save();
                return res.status(409).send("TRANSACTION_ID_MISSING");
            }

            const transactionOwner = await DaycarePayment.findOne({
                externalTransactionId,
                publicId: { $ne: publicId },
            }).select("_id");
            if (transactionOwner) {
                payment.status = "failed";
                payment.providerMessage = "Transaction ID is already linked to another payment";
                await payment.save();
                return res.status(409).send("TRANSACTION_CONFLICT");
            }

            const paidAt = new Date();
            const onboardingUpdate = await DaycareOnboarding.updateOne(
                {
                    _id: payment.onboardingId,
                    standingOrderStatus: { $ne: "active" },
                    monthlyTuitionAmount: payment.requestedAmount,
                },
                {
                    $set: {
                        standingOrderStatus: "active",
                        standingOrderEstablishedAt: paidAt,
                        standingOrderTransactionId: externalTransactionId,
                        "steps.$[paymentStep].status": "pendingReview",
                        "steps.$[paymentStep].source": "online",
                        "steps.$[paymentStep].updatedAt": paidAt,
                        "steps.$[paymentStep].updatedBy": "nedarim",
                    },
                    $unset: {
                        "steps.$[paymentStep].completedAt": "",
                    },
                },
                {
                    arrayFilters: [
                        { "paymentStep.key": "registrationFeeReceived" },
                    ],
                }
            );
            if (onboardingUpdate.modifiedCount !== 1) {
                const current = await DaycareOnboarding.findById(payment.onboardingId)
                    .select("standingOrderStatus standingOrderTransactionId")
                    .lean();
                if (current?.standingOrderTransactionId !== externalTransactionId) {
                    payment.status = "failed";
                    payment.providerMessage = "Current charge changed before payment confirmation";
                    await payment.save();
                    return res.status(409).send("CHARGE_CHANGED");
                }
            }

            payment.status = "confirmed";
            payment.paidAmount = callbackAmount;
            payment.paidAt = paidAt;
            payment.externalTransactionId = externalTransactionId;
            payment.providerMessage = providerMessage || undefined;
            await payment.save();
            return res.status(200).send("OK");
        } catch (error) {
            console.error("Daycare tuition callback failed:", error);
            return res.status(500).send("RETRY");
        }
    }
);

adminRouter.use(requireAdmin, requireSecureAdminMutation);

adminRouter.patch("/onboarding/:id/settings", async (req, res) => {
    if (!Types.ObjectId.isValid(req.params.id)) {
        return res.status(404).json({ success: false, message: "Onboarding not found" });
    }
    const monthlyTuitionAmount = Number(req.body.monthlyTuitionAmount);
    if (
        !Number.isFinite(monthlyTuitionAmount) ||
        monthlyTuitionAmount < 1 ||
        monthlyTuitionAmount > 1_000_000
    ) {
        return res.status(400).json({ success: false, message: "Invalid tuition amount" });
    }
    const onboarding = await DaycareOnboarding.findById(req.params.id);
    if (!onboarding) return res.status(404).json({ success: false, message: "Onboarding not found" });
    if (
        (onboarding.standingOrderStatus ?? "pending") === "active" &&
        monthlyTuitionAmount !== onboarding.monthlyTuitionAmount
    ) {
        return res.status(409).json({
            success: false,
            message: "לא ניתן לשנות סכום לאחר שהוראת הקבע הופעלה",
        });
    }
    if (monthlyTuitionAmount !== (onboarding.monthlyTuitionAmount ?? DEFAULT_TUITION)) {
        const activeIntent = await DaycarePayment.exists({
            onboardingId: onboarding._id,
            status: "created",
            expiresAt: { $gt: new Date() },
        });
        if (activeIntent) {
            return res.status(409).json({
                success: false,
                message: "לא ניתן לשנות סכום בזמן שחלון תשלום פעיל. נסו שוב לאחר שיפוג.",
            });
        }
    }
    onboarding.monthlyTuitionAmount = monthlyTuitionAmount;
    await onboarding.save();
    return res.json({ success: true });
});

adminRouter.get("/onboarding/:id/history", async (req, res) => {
    if (!Types.ObjectId.isValid(req.params.id)) {
        return res.status(404).json({ success: false, message: "Onboarding not found" });
    }
    const payments = await DaycarePayment.find({ onboardingId: req.params.id })
        .sort({ createdAt: -1 })
        .lean();
    return res.json({ success: true, data: payments });
});

export { adminRouter as daycarePaymentAdminRoutes, publicRouter as daycarePaymentPublicRoutes };
