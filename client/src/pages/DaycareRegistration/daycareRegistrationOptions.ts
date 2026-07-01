import type { RequiredHours } from "../../types/daycareRegistration";

export const DAYCARE_MONTHLY_COST = 5500;
export const DAYCARE_MONTHLY_COST_LABEL = `${DAYCARE_MONTHLY_COST.toLocaleString(
    "he-IL"
)} ₪`;

export const requiredHoursOptions: RequiredHours[] = [
    "עד 15:30",
    "עד 16:00",
    "אחר",
];
