import mongoose from "mongoose";
import type { DaycareDonationCampaignDocument } from "../types/daycareDonations";

const visualSchema = new mongoose.Schema(
    {
        src: { type: String, trim: true },
        alt: { type: String, required: true, trim: true },
    },
    { _id: false }
);

const categorySchema = new mongoose.Schema(
    {
        id: { type: String, required: true, trim: true },
        title: { type: String, required: true, trim: true },
        shortTitle: { type: String, required: true, trim: true },
        description: { type: String, required: true, trim: true },
        goal: { type: Number, required: true, min: 0 },
        order: { type: Number, required: true, min: 0 },
        visual: { type: visualSchema, required: true },
    },
    { _id: false }
);

const itemSchema = new mongoose.Schema(
    {
        id: { type: String, required: true, trim: true },
        categoryId: { type: String, required: true, trim: true },
        title: { type: String, required: true, trim: true },
        description: { type: String, required: true, trim: true },
        goal: { type: Number, required: true, min: 0 },
        order: { type: Number, required: true, min: 0 },
        openingPriority: { type: Number, required: true, min: 0 },
        acceptingDonations: { type: Boolean, required: true, default: true },
        statusOverride: {
            type: String,
            enum: ["auto", "open", "closed"],
            required: true,
            default: "auto",
        },
        visual: { type: visualSchema, required: true },
    },
    { _id: false }
);

const daycareDonationCampaignSchema =
    new mongoose.Schema<DaycareDonationCampaignDocument>(
        {
            slug: { type: String, required: true, unique: true, trim: true },
            title: { type: String, required: true, trim: true },
            goal: { type: Number, required: true, min: 0 },
            active: { type: Boolean, required: true, default: true },
            categories: { type: [categorySchema], required: true },
            items: { type: [itemSchema], required: true },
        },
        { timestamps: true }
    );

export const DaycareDonationCampaign =
    (mongoose.models.DaycareDonationCampaign as
        | mongoose.Model<DaycareDonationCampaignDocument>
        | undefined) ??
    mongoose.model<DaycareDonationCampaignDocument>(
        "DaycareDonationCampaign",
        daycareDonationCampaignSchema
    );
