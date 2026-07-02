import mongoose from "mongoose";

import type { FinanceEntry } from "../types/financeEntry";

const FinanceEntrySchema = new mongoose.Schema<FinanceEntry>(
    {
        type: {
            type: String,
            enum: ["income", "expense"],
            required: true,
        },
        source: {
            type: String,
            enum: [
                "website",
                "cash",
                "bit",
                "credit",
                "bank",
                "check",
                "nedarim",
                "manual",
                "other",
            ],
            required: true,
            default: "cash",
        },
        category: {
            type: String,
            required: true,
            trim: true,
            default: "כללי",
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        occurredAt: {
            type: Date,
            required: true,
            default: Date.now,
        },
        donorName: {
            type: String,
            trim: true,
            default: "",
        },
        notes: {
            type: String,
            trim: true,
            default: "",
        },
    },
    {
        timestamps: true,
    }
);

export const FinanceEntryModel = mongoose.model(
    "FinanceEntry",
    FinanceEntrySchema
);
