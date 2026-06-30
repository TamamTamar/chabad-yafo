import type { DaycareRegistrationAdmin } from "../../../types/daycareRegistration";

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

export type DaycareTask = {
    _id: string;
    title: string;
    category: DaycareTaskCategory;
    status: DaycareTaskStatus;
    priority: DaycarePriority;
    dueDate?: string;
    notes?: string;
};

export type DaycareLeadStatus =
    | "מתעניין"
    | "שיחה בוצעה"
    | "הגיע לראות"
    | "רוצה להירשם"
    | "נרשם"
    | "לא רלוונטי";

export type DaycareLead = {
    _id: string;
    childName: string;
    childAge?: string;
    parentName: string;
    phone: string;
    area?: string;
    status: DaycareLeadStatus;
    inquiryDate?: string;
    notes?: string;
    followUpDate?: string;
};

export type DaycareDocumentStatus = "חסר" | "בטיפול" | "קיים";

export type DaycareDocument = {
    _id: string;
    name: string;
    status: DaycareDocumentStatus;
    dueDate?: string;
    notes?: string;
    fileUrl?: string;
};

export type DaycareFinanceSettings = {
    _id?: string;
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
};

export type DaycareOverview = {
    openingTargetChildren: number;
    actualRegistrations: number;
    interestedCount: number;
    openTasks: number;
    completedTasks: number;
    generalStatus: "בהכנה" | "מוכן לפתיחה" | "דורש טיפול";
    targetOpeningDate: string;
    linkedPublicRegistrations: number;
    expansion: {
        thresholdChildren: number;
        trackedChildren: number;
        alertActive: boolean;
        status: "במעקב" | "מוכן להתרחבות" | "דורש טיפול לפני הרחבה";
        readyItems: number;
        totalItems: number;
        items: Array<{
            key: string;
            label: string;
            ready: boolean;
        }>;
    };
};

export type DaycareRegistrationsResponse = {
    leads: DaycareLead[];
    publicRegistrations: DaycareRegistrationAdmin[];
};

export type EditableDaycareTask = Omit<DaycareTask, "_id"> & {
    _id?: string;
};

export type EditableDaycareLead = Omit<DaycareLead, "_id"> & {
    _id?: string;
};

export type EditableDaycareDocument = Omit<DaycareDocument, "_id"> & {
    _id?: string;
};
