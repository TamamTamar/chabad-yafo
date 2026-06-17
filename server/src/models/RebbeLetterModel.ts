import mongoose from "mongoose";

import type { RebbeLetter } from "../types/chabad";
import { rebbeLetterSchema } from "../schemas/RebbeLetterSchema";




export const rebbeLetter = mongoose.model<RebbeLetter>("RebbeLetter", rebbeLetterSchema);