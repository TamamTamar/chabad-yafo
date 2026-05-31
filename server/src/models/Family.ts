import mongoose from "mongoose";
import { familySchema } from "../schemas/familySchema";
import type { IFamily } from "../types/family";

export const Family = mongoose.model<IFamily>(
    "Family",
    familySchema
);