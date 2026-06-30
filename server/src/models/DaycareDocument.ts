import mongoose from "mongoose";
import { daycareDocumentSchema } from "../schemas/daycareAdminSchemas";
import type { IDaycareDocument } from "../types/daycareAdmin";

export const DaycareDocument = mongoose.model<IDaycareDocument>(
    "DaycareDocument",
    daycareDocumentSchema
);
