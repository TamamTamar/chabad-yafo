import type {
    DaycareDocumentStatus,
    DaycareLeadStatus,
    DaycarePriority,
    DaycareTaskCategory,
    DaycareTaskStatus,
} from "./types";

export const daycareTaskCategories: DaycareTaskCategory[] = [
    "תכנון",
    "שיפוץ",
    "בטיחות",
    "אישורים",
    "כוח אדם",
    "ציוד",
    "שיווק",
    "הרשמות",
];

export const daycareTaskStatuses: DaycareTaskStatus[] = [
    "לא התחיל",
    "בטיפול",
    "הושלם",
];

export const daycarePriorities: DaycarePriority[] = [
    "נמוכה",
    "רגילה",
    "דחופה",
];

export const daycareLeadStatuses: DaycareLeadStatus[] = [
    "מתעניין",
    "שיחה בוצעה",
    "הגיע לראות",
    "רוצה להירשם",
    "נרשם",
    "לא רלוונטי",
];

export const daycareDocumentStatuses: DaycareDocumentStatus[] = [
    "חסר",
    "בטיפול",
    "קיים",
];

export const emptyTask = {
    title: "",
    category: "תכנון",
    status: "לא התחיל",
    priority: "רגילה",
    dueDate: "",
    notes: "",
} as const;

export const emptyLead = {
    childName: "",
    childAge: "",
    parentName: "",
    phone: "",
    area: "",
    status: "מתעניין",
    inquiryDate: "",
    notes: "",
    followUpDate: "",
} as const;

export const emptyDocument = {
    name: "",
    status: "חסר",
    dueDate: "",
    notes: "",
    fileUrl: "",
} as const;

export const financeScenarioChildren = [6, 8, 10, 12, 15];
