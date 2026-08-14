import mongoose from "mongoose";
import type { DaycareDonationIntentDocument } from "../types/daycareDonations";

const daycareDonationIntentSchema =
    new mongoose.Schema<DaycareDonationIntentDocument>(
        {
            publicId: {
                type: String,
                required: true,
                unique: true,
                trim: true,
                index: true,
            },
            campaignSlug: {
                type: String,
                required: true,
                trim: true,
                index: true,
            },
            mode: {
                type: String,
                enum: ["live", "diagnostic"],
                required: true,
                default: "live",
                index: true,
            },
            status: {
                type: String,
                enum: ["created", "submitted", "confirmed", "failed", "expired"],
                required: true,
                default: "created",
                index: true,
            },
            amount: { type: Number, required: true, min: 1 },
            itemId: { type: String, trim: true, index: true },
            donorName: { type: String, required: true, trim: true },
            displayDonorName: { type: Boolean, default: true },
            phone: { type: String, required: true, trim: true },
            email: {
                type: String,
                required: true,
                trim: true,
                lowercase: true,
            },
            dedication: { type: String, trim: true },
            ambassadorId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "DaycareDonationAmbassador",
                index: true,
            },
            externalTransactionId: { type: String, trim: true },
            providerMessage: { type: String, trim: true },
            expiresAt: { type: Date, required: true },
            confirmedAt: { type: Date },
        },
        { timestamps: true }
    );

daycareDonationIntentSchema.index(
    { expiresAt: 1 },
    { expireAfterSeconds: 60 * 60 * 24 * 30 }
);

export const DaycareDonationIntent =
    (mongoose.models.DaycareDonationIntent as
        | mongoose.Model<DaycareDonationIntentDocument>
        | undefined) ??
    mongoose.model<DaycareDonationIntentDocument>(
        "DaycareDonationIntent",
        daycareDonationIntentSchema
    );
