import mongoose from "mongoose";
import { daycareOnboardingAuditSchema } from "../schemas/DaycareOnboardingAuditSchema";
import type { IDaycareOnboardingAudit } from "../types/daycareOnboardingAudit";

export const DaycareOnboardingAudit =
    mongoose.model<IDaycareOnboardingAudit>(
        "DaycareOnboardingAudit",
        daycareOnboardingAuditSchema
    );
