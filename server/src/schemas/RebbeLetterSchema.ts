import { Schema } from "mongoose";
import type { RebbeLetter } from "../types/chabad";

export const rebbeLetterSchema = new Schema<RebbeLetter>(
    {
        fullName: {
            type: String,
            required: true,
            trim: true,
        },
        motherName: {
            type: String,
            required: true,
            trim: true,
        },
        phone: {
            type: String,
            trim: true,
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
        },
        letter: {
            type: String,
            trim: true,
            default: "",
        },
        occasion: {
            type: String,
            default: "general",
        },
        wantsUpdates: {
            type: Boolean,
            default: false,
        },
        status: {
            type: String,
            enum: ["new", "printed", "sentToOhel", "handled"],
            default: "new",
        },
        updatedStatusAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);