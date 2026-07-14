import { Schema } from "mongoose";
import type {
    IDaycareFamilyAddress,
    IDaycareFamily,
    IDaycareGuardian,
} from "../types/daycareFamily";

const guardianSchema = new Schema<IDaycareGuardian>(
    {
        fullName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 160,
        },
        role: {
            type: String,
            required: true,
            trim: true,
            maxlength: 80,
        },
        roleDetails: {
            type: String,
            trim: true,
            maxlength: 100,
        },
        phone: {
            type: String,
            required: true,
            trim: true,
            maxlength: 30,
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
            maxlength: 254,
        },
    },
    { _id: false }
);

const familyAddressSchema = new Schema<IDaycareFamilyAddress>(
    {
        city: { type: String, required: true, trim: true, maxlength: 100 },
        street: { type: String, required: true, trim: true, maxlength: 160 },
        houseNumber: { type: String, required: true, trim: true, maxlength: 20 },
        apartment: { type: String, trim: true, maxlength: 20 },
    },
    { _id: false }
);

export const daycareFamilySchema = new Schema<IDaycareFamily>(
    {
        guardians: {
            type: [guardianSchema],
            required: true,
            validate: {
                validator: (guardians: IDaycareGuardian[]) =>
                    guardians.length > 0,
                message: "A daycare family must have at least one guardian",
            },
        },
        address: {
            type: familyAddressSchema,
            required: false,
        },
    },
    { timestamps: true }
);
