import mongoose from "mongoose";

import type { PaymentDataToSave } from "../types/payment";

export const PaymentSchema = new mongoose.Schema<PaymentDataToSave>(
  {
    FirstName: {
      type: String,
      required: true,
      trim: true,
    },

    LastName: {
      type: String,
      required: true,
      trim: true,
    },

    Phone: {
      type: String,
      trim: true,
    },

    Mail: {
      type: String,
      trim: true,
      lowercase: true,
    },

    PaymentType: {
      type: String,
      enum: ["HK", "Ragil"],
      required: true,
    },

    Amount: {
      type: Number,
      required: true,
    },

    Tashlumim: {
      type: Number,
      required: true,
      default: 1,
    },

    NormalizedTotal: {
      type: Number,
      required: true,
    },

    lizchut: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<PaymentDataToSave>("Payment", PaymentSchema);