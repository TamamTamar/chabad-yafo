import mongoose from "mongoose";
import { daycareTaskSchema } from "../schemas/daycareAdminSchemas";
import type { IDaycareTask } from "../types/daycareAdmin";

export const DaycareTask = mongoose.model<IDaycareTask>(
    "DaycareTask",
    daycareTaskSchema
);
