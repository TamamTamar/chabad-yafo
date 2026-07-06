import type {
    DaycareDocumentStatus,
    DaycareInterestLevel,
    DaycareLeadStatus,
    DaycarePriority,
    DaycarePriceFit,
    DaycareTaskCategory,
    DaycareTaskStage,
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

export const daycareTaskStages: DaycareTaskStage[] = [
    "עכשיו",
    "השבוע",
    "לפני פתיחה",
    "אחרי פתיחה",
    "התרחבות",
];

export const daycareLeadStatuses: DaycareLeadStatus[] = [
    "מתעניין",
    "שיחה בוצעה",
    "הגיע לראות",
    "רוצה להירשם",
    "נרשם",
    "לא רלוונטי",
];

export const daycareInterestLevels: DaycareInterestLevel[] = [
    "גבוה",
    "בינוני",
    "נמוך",
];

export const daycarePriceFits: DaycarePriceFit[] = ["כן", "לא"];

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
    stage: "לפני פתיחה",
    dueDate: "",
    notes: "",
    resourceLabel: "",
    resourceUrl: "",
} as const;

export const emptyLead = {
    childName: "",
    childAge: "",
    parentName: "",
    phone: "",
    area: "",
    status: "מתעניין",
    interestLevel: undefined,
    priceFits: undefined,
    desiredHours: "",
    parentPriority: "",
    inquiryDate: "",
    notes: "",
    callNotes: "",
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
