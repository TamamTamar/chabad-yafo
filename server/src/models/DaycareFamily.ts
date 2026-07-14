import mongoose from "mongoose";
import { daycareFamilySchema } from "../schemas/DaycareFamilySchema";
import type { IDaycareFamily } from "../types/daycareFamily";

export const DaycareFamily = mongoose.model<IDaycareFamily>(
    "DaycareFamily",
    daycareFamilySchema
);
