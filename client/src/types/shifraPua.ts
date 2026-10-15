export const shifraStatuses = { new: 'חדשה', coordinated: 'תואמה', delivered: 'הארוחה נמסרה', cancelled: 'בוטלה' } as const;
export type ShifraStatus = keyof typeof shifraStatuses;
export type RegistrationInput = {
    motherName: string; phone: string; address: string; birthDate: string; dietaryNotes: string;
    filledBy: 'mother' | 'other'; contactName: string; contactPhone: string; consent: boolean;
};
export type Meal = { deliveryDate: string; address: string; recordedAt: string };
export type ShifraRegistration = RegistrationInput & {
    _id: string; status: ShifraStatus; deliveryDate: string; adminNotes: string; revision: number;
    createdAt: string; mealHistory: Meal[]; previousMeals: number;
};
export type RegistrationList = { items: ShifraRegistration[]; total: number; pending: number; mealCount: number; page: number; pageSize: number };
export type BirthHistory = Pick<ShifraRegistration, '_id' | 'birthDate' | 'status' | 'mealHistory'>;
export function israelToday() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
export function defaultDeliveryDate() {
    const date = new Date(`${israelToday()}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + (3 - date.getUTCDay() + 7) % 7);
    return date.toISOString().slice(0, 10);
}
export const phonePattern = /^(?:0|\+?972|00972)(?:5\d{8}|[23489]\d{7}|7\d{8})$/;
export const validPhone = (value: string) => /^[+\d\s()-]+$/.test(value) && phonePattern.test(value.replace(/[\s()-]/g, ''));
export const formatDate = (value: string) => new Intl.DateTimeFormat('he-IL', { timeZone: 'Asia/Jerusalem' }).format(new Date(value.length === 10 ? `${value}T12:00:00Z` : value));
