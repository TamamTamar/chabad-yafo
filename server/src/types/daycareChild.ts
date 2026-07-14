import type { Types } from "mongoose";

export interface IDaycareChildLegacySource {
    type: "daycareEnrollment";
    recordId: Types.ObjectId;
}

export interface IDaycareChild {
    familyId: Types.ObjectId;
    firstName: string;
    lastName: string;
    birthDate?: Date;
    legacySource?: IDaycareChildLegacySource;
    createdAt: Date;
    updatedAt: Date;
}
