export type RequiredHours = "עד 15:30" | "עד 16:00" | "אחר";
export type FridayCare = "כן" | "לא";

export type DaycareRegistrationFormValues = {
    parentName: string;
    phone: string;
    email?: string;
    childName?: string;
    birthDate?: string;
    childAge: string;
    requiredHours: RequiredHours;
    requiredHoursOther?: string;
    fridayCare: FridayCare;
    costApproval?: boolean;
    notes?: string;
};

export type DaycareRegistrationAdmin = DaycareRegistrationFormValues & {
    _id: string;
    createdAt?: string;
    updatedAt?: string;
};
