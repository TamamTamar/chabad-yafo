import mongoose from "mongoose";
import type { DaycareDonationRecordDocument } from "../types/daycareDonations";

const daycareDonationRecordSchema =
    new mongoose.Schema<DaycareDonationRecordDocument>(
        {
            campaignSlug: {
                type: String,
                required: true,
                trim: true,
                index: true,
            },
            source: {
                type: String,
                enum: ["manual", "nedarim"],
                required: true,
            },
            status: {
                type: String,
                enum: ["confirmed", "refunded", "cancelled"],
                required: true,
                default: "confirmed",
                index: true,
            },
            amount: { type: Number, required: true, min: 0.01 },
            originalAmount: { type: Number, min: 0.01 },
            originalCurrency: {
                type: String,
                enum: ["ILS", "USD", "EUR"],
            },
            exchangeRate: { type: Number, min: 0.0001 },
            paymentType: {
                type: String,
                enum: ["HK", "Ragil"],
            },
            installments: { type: Number, min: 1, max: 12 },
            itemId: { type: String, trim: true, index: true },
            allocations: [
                {
                    _id: false,
                    itemId: { type: String, required: true, trim: true },
                    amount: { type: Number, required: true, min: 0.01 },
                },
            ],
            donorName: { type: String, trim: true },
            displayDonorName: { type: Boolean, default: true },
            phone: { type: String, trim: true },
            email: { type: String, trim: true, lowercase: true },
            dedication: { type: String, trim: true },
            note: { type: String, trim: true },
            manualSource: {
                type: String,
                enum: ["bank_transfer", "cash", "check", "other"],
            },
            reference: { type: String, trim: true },
            enteredById: { type: String, trim: true },
            enteredByLabel: { type: String, trim: true },
            providerIntentId: { type: String, trim: true, index: true },
            externalTransactionId: { type: String, trim: true },
            ambassadorId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "DaycareDonationAmbassador",
                index: true,
            },
            receivedAt: { type: Date, required: true, default: Date.now },
        },
        { timestamps: true }
    );

daycareDonationRecordSchema.index(
    { externalTransactionId: 1 },
    {
        unique: true,
        partialFilterExpression: {
            externalTransactionId: { $type: "string" },
        },
    }
);

daycareDonationRecordSchema.pre("validate", function (this: {
    source?: string;
    manualSource?: string;
    note?: string;
    reference?: string;
    enteredById?: string;
    enteredByLabel?: string;
    invalidate: (path: string, message: string) => void;
}) {
    if (this.source !== "manual") return;

    if (!this.manualSource) {
        this.invalidate(
            "manualSource",
            "Manual donation source is required"
        );
    }
    if (!this.enteredById || !this.enteredByLabel) {
        this.invalidate(
            "enteredById",
            "Manual donation administrator identity is required"
        );
    }
    if (!this.note && !this.reference) {
        this.invalidate(
            "reference",
            "Manual donation note or reference is required"
        );
    }
});

export const DaycareDonationRecord =
    (mongoose.models.DaycareDonationRecord as
        | mongoose.Model<DaycareDonationRecordDocument>
        | undefined) ??
    mongoose.model<DaycareDonationRecordDocument>(
        "DaycareDonationRecord",
        daycareDonationRecordSchema
    );
