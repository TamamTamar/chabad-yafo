import mongoose from "mongoose";
import { daycareLeadSchema } from "../schemas/daycareAdminSchemas";
import type { IDaycareLead } from "../types/daycareAdmin";

export const DaycareLead = mongoose.model<IDaycareLead>(
    "DaycareLead",
    daycareLeadSchema
);
