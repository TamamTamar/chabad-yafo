import mongoose from "mongoose";
import type { DaycareDonationAuditDocument } from "../types/daycareDonations";

const daycareDonationAuditSchema =
    new mongoose.Schema<DaycareDonationAuditDocument>(
        {
            campaignSlug: {
                type: String,
                required: true,
                trim: true,
                index: true,
            },
            action: { type: String, required: true, trim: true },
            entityType: {
                type: String,
                enum: [
                    "campaign",
                    "category",
                    "item",
                    "record",
                    "intent",
                    "ambassador",
                    "fieldUpdate",
                    "lead",
                ],
                required: true,
            },
            entityId: { type: String, required: true, trim: true },
            actor: {
                type: String,
                enum: ["admin", "nedarim", "system"],
                required: true,
            },
            actorId: { type: String, trim: true },
            actorLabel: { type: String, trim: true },
            reason: { type: String, trim: true },
            before: { type: mongoose.Schema.Types.Mixed },
            after: { type: mongoose.Schema.Types.Mixed },
        },
        { timestamps: true }
    );

daycareDonationAuditSchema.index({ campaignSlug: 1, createdAt: -1 });

export const DaycareDonationAudit =
    (mongoose.models.DaycareDonationAudit as
        | mongoose.Model<DaycareDonationAuditDocument>
        | undefined) ??
    mongoose.model<DaycareDonationAuditDocument>(
        "DaycareDonationAudit",
        daycareDonationAuditSchema
    );
