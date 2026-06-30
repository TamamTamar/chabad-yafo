export type DaycareTaskCategory =
    | "תכנון"
    | "שיפוץ"
    | "בטיחות"
    | "אישורים"
    | "כוח אדם"
    | "ציוד"
    | "שיווק"
    | "הרשמות";

export type DaycareTaskStatus = "לא התחיל" | "בטיפול" | "הושלם";
export type DaycarePriority = "נמוכה" | "רגילה" | "דחופה";

export interface IDaycareTask {
    title: string;
    category: DaycareTaskCategory;
    status: DaycareTaskStatus;
    priority: DaycarePriority;
    dueDate?: Date;
    notes?: string;
}

export type DaycareLeadStatus =
    | "מתעניין"
    | "שיחה בוצעה"
    | "הגיע לראות"
    | "רוצה להירשם"
    | "נרשם"
    | "לא רלוונטי";

export interface IDaycareLead {
    childName: string;
    childAge?: string;
    parentName: string;
    phone: string;
    area?: string;
    status: DaycareLeadStatus;
    inquiryDate?: Date;
    notes?: string;
    followUpDate?: Date;
}

export type DaycareDocumentStatus = "חסר" | "בטיפול" | "קיים";

export interface IDaycareDocument {
    name: string;
    status: DaycareDocumentStatus;
    dueDate?: Date;
    notes?: string;
    fileUrl?: string;
}

export interface IDaycareFinanceSettings {
    pricePerChild: number;
    currentChildren: number;
    targetChildren: number;
    rent: number;
    directorSalary: number;
    staffSalaries: number;
    food: number;
    supplies: number;
    insuranceAndPermits: number;
    extraExpenses: number;
}
