import mongoose from "mongoose";
import { daycareParentDocumentYearSchema } from "../schemas/DaycareParentDocumentYearSchema";
import type { IDaycareParentDocumentYear } from "../types/daycareParentDocuments";

export const DaycareParentDocumentYear = mongoose.model<IDaycareParentDocumentYear>("DaycareParentDocumentYear", daycareParentDocumentYearSchema);

