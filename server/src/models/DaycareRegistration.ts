import mongoose from "mongoose";
import { daycareRegistrationSchema } from "../schemas/DaycareRegistrationSchema";
import type { IDaycareRegistration } from "../types/daycareRegistration";

export const DaycareRegistration = mongoose.model<IDaycareRegistration>(
    "DaycareRegistration",
    daycareRegistrationSchema
);
