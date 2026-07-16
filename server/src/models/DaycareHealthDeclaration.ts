import mongoose from "mongoose";
import { daycareHealthDeclarationSchema } from "../schemas/DaycareHealthDeclarationSchema";
import type { IDaycareHealthDeclaration } from "../types/daycareHealthDeclaration";

export const DaycareHealthDeclaration = mongoose.model<IDaycareHealthDeclaration>("DaycareHealthDeclaration", daycareHealthDeclarationSchema);
