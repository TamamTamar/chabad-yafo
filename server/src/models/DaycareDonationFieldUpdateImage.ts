import mongoose from "mongoose";

export type DaycareDonationFieldUpdateImageDocument = {
    storageKey: string;
    bytes: Buffer;
    mimeType: string;
    originalName?: string;
    size: number;
    sha256: string;
    createdAt?: Date;
    updatedAt?: Date;
};

const daycareDonationFieldUpdateImageSchema =
    new mongoose.Schema<DaycareDonationFieldUpdateImageDocument>(
        {
            storageKey: {
                type: String,
                required: true,
                unique: true,
                trim: true,
            },
            bytes: {
                type: Buffer,
                required: true,
                select: false,
            },
            mimeType: { type: String, required: true, trim: true },
            originalName: { type: String, trim: true },
            size: { type: Number, required: true, min: 1 },
            sha256: { type: String, required: true, trim: true },
        },
        { timestamps: true }
    );

export const DaycareDonationFieldUpdateImage =
    (mongoose.models.DaycareDonationFieldUpdateImage as
        | mongoose.Model<DaycareDonationFieldUpdateImageDocument>
        | undefined) ??
    mongoose.model<DaycareDonationFieldUpdateImageDocument>(
        "DaycareDonationFieldUpdateImage",
        daycareDonationFieldUpdateImageSchema
    );
