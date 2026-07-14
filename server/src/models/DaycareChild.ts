import mongoose from "mongoose";
import { daycareChildSchema } from "../schemas/DaycareChildSchema";
import type { IDaycareChild } from "../types/daycareChild";

export const DaycareChild = mongoose.model<IDaycareChild>(
    "DaycareChild",
    daycareChildSchema
);
