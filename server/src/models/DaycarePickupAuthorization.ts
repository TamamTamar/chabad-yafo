import { model, models } from "mongoose";
import { daycarePickupAuthorizationSchema } from "../schemas/DaycarePickupAuthorizationSchema";
import type { IDaycarePickupAuthorization } from "../types/daycarePickupAuthorization";

export const DaycarePickupAuthorization = models.DaycarePickupAuthorization
    ?? model<IDaycarePickupAuthorization>("DaycarePickupAuthorization", daycarePickupAuthorizationSchema);
