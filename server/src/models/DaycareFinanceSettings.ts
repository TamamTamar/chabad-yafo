import mongoose from "mongoose";
import { daycareFinanceSettingsSchema } from "../schemas/daycareAdminSchemas";
import type { IDaycareFinanceSettings } from "../types/daycareAdmin";

export const DaycareFinanceSettings = mongoose.model<IDaycareFinanceSettings>(
    "DaycareFinanceSettings",
    daycareFinanceSettingsSchema
);
