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
export type DaycareTaskStage =
    | "עכשיו"
    | "השבוע"
    | "לפני פתיחה"
    | "אחרי פתיחה"
    | "התרחבות";

export interface IDaycareTask {
    title: string;
    category: DaycareTaskCategory;
    status: DaycareTaskStatus;
    priority: DaycarePriority;
    stage?: DaycareTaskStage;
    subtasks?: Array<{
        title: string;
        completed: boolean;
        exists?: boolean;
        donated?: boolean;
        ordered?: boolean;
        installed?: boolean;
        actualCost?: number;
    }>;
    dueDate?: Date;
    notes?: string;
    resourceLabel?: string;
    resourceUrl?: string;
}

export type DaycareLeadStatus =
    | "מתעניין"
    | "שיחה בוצעה"
    | "הגיע לראות"
    | "רוצה להירשם"
    | "נרשם"
    | "לא רלוונטי";
export type DaycareInterestLevel = "גבוה" | "בינוני" | "נמוך";
export type DaycarePriceFit = "כן" | "לא";

export interface IDaycareLead {
    childName: string;
    childAge?: string;
    parentName: string;
    phone: string;
    area?: string;
    status: DaycareLeadStatus;
    interestLevel?: DaycareInterestLevel;
    priceFits?: DaycarePriceFit;
    desiredHours?: string;
    parentPriority?: string;
    inquiryDate?: Date;
    notes?: string;
    callNotes?: string;
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
    renovationKitchen: number;
    renovationYard: number;
    renovationConstruction: number;
    renovationSafety: number;
    renovationEquipment: number;
    renovationLabor: number;
    renovationOther: number;
    monthlyCashflows?: Array<{
        month: string;
        children: number;
        pricePerChild: number;
        income: number;
        extraIncome: number;
        rent: number;
        directorSalary: number;
        staffSalaries: number;
        food: number;
        supplies: number;
        insuranceAndPermits: number;
        extraExpenses: number;
        renovationKitchen: number;
        renovationYard: number;
        renovationConstruction: number;
        renovationSafety: number;
        renovationEquipment: number;
        renovationLabor: number;
        renovationOther: number;
        renovationRepayment: number;
    }>;
}
