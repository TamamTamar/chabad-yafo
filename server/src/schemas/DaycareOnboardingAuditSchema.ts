import { Schema } from "mongoose";
import {
    onboardingAuditActorTypes,
    type IDaycareOnboardingAudit,
} from "../types/daycareOnboardingAudit";

export const daycareOnboardingAuditSchema =
    new Schema<IDaycareOnboardingAudit>(
        {
            onboardingId: {
                type: Schema.Types.ObjectId,
                required: true,
                ref: "DaycareOnboarding",
                immutable: true,
            },
            actorType: {
                type: String,
                required: true,
                enum: onboardingAuditActorTypes,
                immutable: true,
            },
            actorId: {
                type: String,
                trim: true,
                maxlength: 160,
                immutable: true,
            },
            actorLabel: {
                type: String,
                trim: true,
                maxlength: 160,
                immutable: true,
            },
            action: {
                type: String,
                required: true,
                trim: true,
                maxlength: 160,
                immutable: true,
            },
            stepKey: {
                type: String,
                trim: true,
                maxlength: 120,
                immutable: true,
            },
            previousValue: {
                type: Schema.Types.Mixed,
                immutable: true,
            },
            newValue: {
                type: Schema.Types.Mixed,
                immutable: true,
            },
            createdAt: {
                type: Date,
                required: true,
                default: Date.now,
                immutable: true,
            },
        },
        {
            versionKey: false,
        }
    );

daycareOnboardingAuditSchema.index({ onboardingId: 1, createdAt: -1 });
