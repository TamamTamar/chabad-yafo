export type RequiredHours = "עד 15:30" | "עד 16:00" | "אחר";
export type FridayCare = "כן" | "לא";

export interface IDaycareRegistration {
    parentName: string;
    phone: string;
    email?: string;
    childName?: string;
    birthDate?: Date;
    childAge: string;
    requiredHours: RequiredHours;
    requiredHoursOther?: string;
    fridayCare: FridayCare;
    costApproval?: boolean;
    notes?: string;
}
