import { Schema } from "mongoose";
import type { IDaycareChild } from "../types/daycareChild";

const legacySourceSchema = new Schema(
    {
        type: {
            type: String,
            required: true,
            enum: ["daycareEnrollment"],
            immutable: true,
        },
        recordId: {
            type: Schema.Types.ObjectId,
            required: true,
            immutable: true,
            ref: "DaycareEnrollment",
        },
    },
    { _id: false }
);

export const daycareChildSchema = new Schema<IDaycareChild>(
    {
        familyId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: "DaycareFamily",
            index: true,
            immutable: true,
        },
        firstName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },
        lastName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },
        birthDate: Date,
        legacySource: {
            type: legacySourceSchema,
            required: false,
        },
    },
    { timestamps: true }
);

daycareChildSchema.index(
    {
        "legacySource.type": 1,
        "legacySource.recordId": 1,
    },
    {
        unique: true,
        partialFilterExpression: {
            "legacySource.type": "daycareEnrollment",
            "legacySource.recordId": { $exists: true },
        },
    }
);
