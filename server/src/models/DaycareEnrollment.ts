import mongoose from "mongoose";
import { daycareEnrollmentSchema } from "../schemas/DaycareEnrollmentSchema";
import type { IDaycareEnrollment } from "../types/daycareEnrollment";

export const DaycareEnrollment = mongoose.model<IDaycareEnrollment>(
    "DaycareEnrollment",
    daycareEnrollmentSchema
);
