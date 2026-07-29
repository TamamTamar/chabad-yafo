import mongoose from "mongoose";

const diagnosticRetentionHours = 24;

type DaycareDonationDiagnosticDocument = {
    campaignSlug: string;
    intentPublicId: string;
    status: string;
    fields: string[];
    values: Record<string, string>;
    receivedAt: Date;
    expiresAt: Date;
    createdAt?: Date;
    updatedAt?: Date;
};

const daycareDonationDiagnosticSchema =
    new mongoose.Schema<DaycareDonationDiagnosticDocument>(
        {
            campaignSlug: {
                type: String,
                required: true,
                trim: true,
                index: true,
            },
            intentPublicId: {
                type: String,
                required: true,
                trim: true,
                index: true,
            },
            status: { type: String, required: true, trim: true },
            fields: { type: [String], required: true },
            values: {
                type: mongoose.Schema.Types.Mixed,
                required: true,
            },
            receivedAt: { type: Date, required: true, default: Date.now },
            expiresAt: {
                type: Date,
                required: true,
                default: () =>
                    new Date(
                        Date.now() +
                            diagnosticRetentionHours * 60 * 60 * 1000
                    ),
            },
        },
        { timestamps: true }
    );

daycareDonationDiagnosticSchema.index(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 }
);

export const DaycareDonationDiagnostic =
    (mongoose.models.DaycareDonationDiagnostic as
        | mongoose.Model<DaycareDonationDiagnosticDocument>
        | undefined) ??
    mongoose.model<DaycareDonationDiagnosticDocument>(
        "DaycareDonationDiagnostic",
        daycareDonationDiagnosticSchema
    );
