import mongoose from "mongoose";
import { daycareAgreementVersionSchema } from "../schemas/DaycareAgreementVersionSchema";
import type { IDaycareAgreementVersion } from "../types/daycareAgreement";

export const DaycareAgreementVersion = mongoose.model<IDaycareAgreementVersion>("DaycareAgreementVersion", daycareAgreementVersionSchema);
