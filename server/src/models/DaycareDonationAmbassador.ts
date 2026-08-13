import mongoose from "mongoose";
import type { DaycareDonationAmbassadorDocument } from "../types/daycareDonations";

const daycareDonationAmbassadorSchema =
    new mongoose.Schema<DaycareDonationAmbassadorDocument>(
        {
            name: {
                type: String,
                required: true,
                trim: true,
                maxlength: 160,
            },
            linkSlug: {
                type: String,
                lowercase: true,
                trim: true,
                maxlength: 60,
                match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
                unique: true,
                sparse: true,
                index: true,
            },
            refCode: {
                type: String,
                required: true,
                unique: true,
                lowercase: true,
                trim: true,
                match: /^[a-z0-9]{4,32}$/,
                index: true,
            },
            goal: {
                type: Number,
                required: true,
                min: 0,
                max: 100_000_000,
                default: 0,
            },
            active: {
                type: Boolean,
                required: true,
                default: true,
                index: true,
            },
            ownerLabel: {
                type: String,
                trim: true,
                maxlength: 160,
            },
            notes: {
                type: String,
                trim: true,
                maxlength: 800,
            },
        },
        { timestamps: true }
    );

export const DaycareDonationAmbassador =
    (mongoose.models.DaycareDonationAmbassador as
        | mongoose.Model<DaycareDonationAmbassadorDocument>
        | undefined) ??
    mongoose.model<DaycareDonationAmbassadorDocument>(
        "DaycareDonationAmbassador",
        daycareDonationAmbassadorSchema
    );
