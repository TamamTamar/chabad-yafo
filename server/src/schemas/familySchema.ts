import { Schema } from "mongoose";

export const familySchema = new Schema(
    {
        parentName: {
            type: String,
            required: true,
        },
        phone: {
            type: String,
            required: true,
            unique: true,
        },
        area: {
            type: String,
            required: true,
        },
        ages: {
            type: [String],
            required: true,
            validate: {
                validator: (value: string[]) => value.length > 0,
                message: "יש לבחור לפחות קבוצת גיל אחת",
            },
        },

        interests: {
            type: [String],
            required: true,
            validate: {
                validator: (value: string[]) => value.length > 0,
                message: "יש לבחור לפחות תחום עניין אחד",
            },
        },
        missing: String,
        updates: Boolean,
    },
    {
        timestamps: true,
    }
);