import type { Types } from "mongoose";
import type { DaycareParentDocumentBundle } from "../config/daycareParentDocuments";

export interface IDaycareParentDocumentYear extends DaycareParentDocumentBundle {
    lockedAt?: Date;
    lockedByAgreementId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

