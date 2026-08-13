import mongoose from "mongoose";
import type { DaycareDonationLeadDocument } from "../types/daycareDonations";

const daycareDonationLeadSchema =
    new mongoose.Schema<DaycareDonationLeadDocument>(
        {
            campaignSlug: {
                type: String,
                required: true,
                trim: true,
                index: true,
            },
            donorName: {
                type: String,
                required: true,
                trim: true,
                maxlength: 160,
            },
            phone: {
                type: String,
                trim: true,
                maxlength: 40,
            },
            ambassadorId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "DaycareDonationAmbassador",
                index: true,
            },
            targetAmount: {
                type: Number,
                min: 0,
                max: 100_000_000,
            },
            pledgedAmount: {
                type: Number,
                min: 0,
                max: 100_000_000,
            },
            contactMethod: {
                type: String,
                enum: ["phone", "whatsapp", "meeting", "other"],
            },
            status: {
                type: String,
                enum: [
                    "new",
                    "contacted",
                    "waiting",
                    "pledged",
                    "completed",
                    "closed",
                ],
                required: true,
                default: "new",
                index: true,
            },
            lastContactAt: { type: Date },
            nextFollowUpAt: { type: Date, index: true },
            notes: {
                type: String,
                trim: true,
                maxlength: 1200,
            },
            createdById: { type: String, trim: true },
            createdByLabel: { type: String, trim: true },
        },
        { timestamps: true }
    );

daycareDonationLeadSchema.index({
    campaignSlug: 1,
    status: 1,
    nextFollowUpAt: 1,
});

export const DaycareDonationLead =
    (mongoose.models.DaycareDonationLead as
        | mongoose.Model<DaycareDonationLeadDocument>
        | undefined) ??
    mongoose.model<DaycareDonationLeadDocument>(
        "DaycareDonationLead",
        daycareDonationLeadSchema
    );
