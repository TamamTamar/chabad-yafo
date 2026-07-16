export type RequiredHours = "עד 15:30" | "עד 16:00" | "אחר";
export type FridayCare = "כן" | "לא";
export type DaycareInterestStatus =
    | "מתעניין"
    | "שיחה בוצעה"
    | "הגיע לראות"
    | "רוצה להירשם"
    | "נרשם"
    | "לא רלוונטי";
export type DaycareInterestLevel = "גבוה" | "בינוני" | "נמוך";
export type DaycarePriceFit = "כן" | "לא";

export interface IDaycareRegistration {
    parentName: string;
    phone: string;
    childAge: string;
    requiredHours: RequiredHours;
    requiredHoursOther?: string;
    notes?: string;
    email?: string;
    childName?: string;
    birthDate?: Date;
    fridayCare?: FridayCare;
    costApproval?: boolean;
    status?: DaycareInterestStatus;
    interestLevel?: DaycareInterestLevel;
    priceFits?: DaycarePriceFit;
    desiredHours?: string;
    parentPriority?: string;
    callNotes?: string;
    daycareFamilyId?: import("mongoose").Types.ObjectId;
    daycareChildId?: import("mongoose").Types.ObjectId;
}
