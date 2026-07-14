import mongoose from "mongoose";
import { daycareAgreementSchema } from "../schemas/DaycareAgreementSchema";
import type { IDaycareAgreement } from "../types/daycareAgreement";

export const DaycareAgreement = mongoose.model<IDaycareAgreement>("DaycareAgreement", daycareAgreementSchema);
