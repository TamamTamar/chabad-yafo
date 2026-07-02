import type { DaycareEnrollmentStatus } from "../../types/daycareEnrollment";

export const genderOptions = [
    { value: "female", label: "נקבה" },
    { value: "male", label: "זכר" },
    { value: "other", label: "אחר" },
] as const;

export const healthFundOptions = [
    "כללית",
    "מכבי",
    "מאוחדת",
    "לאומית",
    "אחר",
];

export const enrollmentSteps = [
    "פרטי הילד/ה",
    "פרטי ההורים",
    "חירום",
    "מידע רפואי",
    "אישורים",
    "חתימה",
];

export const enrollmentStatuses: DaycareEnrollmentStatus[] = [
    "submitted",
    "reviewed",
    "approved",
    "missingDocuments",
    "rejected",
];
