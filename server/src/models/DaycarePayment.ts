import mongoose from "mongoose";
import type { DaycarePaymentDocument } from "../types/daycarePayments";

const daycarePaymentSchema = new mongoose.Schema<DaycarePaymentDocument>(
    {
        paymentType: {
            type: String,
            enum: ["daycare_payment"],
            required: true,
            default: "daycare_payment",
            immutable: true,
            index: true,
        },
        providerPaymentType: {
            type: String,
            enum: ["HK"],
            required: true,
            default: "HK",
            immutable: true,
        },
        installments: {
            type: Number,
            enum: [12],
            required: true,
            default: 12,
            immutable: true,
        },
        publicId: { type: String, required: true, unique: true, index: true },
        onboardingId: { type: mongoose.Schema.Types.ObjectId, ref: "DaycareOnboarding", required: true, index: true },
        childId: { type: mongoose.Schema.Types.ObjectId, ref: "DaycareChild", required: false, index: true },
        childName: { type: String, required: true, trim: true },
        schoolYear: { type: String, required: true, trim: true },
        billingPeriod: { type: String, trim: true, maxlength: 80 },
        monthlyTuitionAmount: { type: Number, required: true, min: 1 },
        requestedAmount: { type: Number, required: true, min: 1 },
        paidAmount: { type: Number, min: 0 },
        payerName: { type: String, trim: true },
        payerPhone: { type: String, trim: true },
        payerEmail: { type: String, trim: true, lowercase: true },
        externalTransactionId: { type: String, trim: true },
        providerMessage: { type: String, trim: true },
        status: {
            type: String,
            enum: ["created", "confirmed", "failed", "expired"],
            required: true,
            default: "created",
            index: true,
        },
        expiresAt: { type: Date, required: true },
        paidAt: Date,
    },
    { timestamps: true }
);

daycarePaymentSchema.index(
    { externalTransactionId: 1 },
    { unique: true, partialFilterExpression: { externalTransactionId: { $type: "string" } } }
);
daycarePaymentSchema.index({ onboardingId: 1, createdAt: -1 });

export const DaycarePayment =
    (mongoose.models.DaycarePayment as mongoose.Model<DaycarePaymentDocument> | undefined) ??
    mongoose.model<DaycarePaymentDocument>("DaycarePayment", daycarePaymentSchema);
