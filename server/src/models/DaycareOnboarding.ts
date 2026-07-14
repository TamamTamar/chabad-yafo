import mongoose from "mongoose";
import { daycareOnboardingSchema } from "../schemas/DaycareOnboardingSchema";
import type { IDaycareOnboarding } from "../types/daycareOnboarding";

export const DaycareOnboarding = mongoose.model<IDaycareOnboarding>(
    "DaycareOnboarding",
    daycareOnboardingSchema
);
