export const statuses = ['new', 'coordinated', 'delivered', 'cancelled'] as const;
export type ShifraStatus = typeof statuses[number];

export function dateInIsrael(now = new Date()) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export function nextWednesday(now = new Date()) {
    const date = new Date(`${dateInIsrael(now)}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + (3 - date.getUTCDay() + 7) % 7);
    return date.toISOString().slice(0, 10);
}
export function parseDate(value: unknown, label = 'תאריך') {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw new Error(`${label} אינו תקין`);
    return value;
}
function text(value: unknown, label: string, max: number, required = true) {
    if (value === undefined && !required) return '';
    if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) throw new Error(`יש להזין ${label} תקין (עד ${max} תווים)`);
    return value.trim();
}
export function normalizePhone(value: unknown) {
    const raw = text(value, 'מספר טלפון', 30);
    if (!/^[+\d\s()-]+$/.test(raw)) throw new Error('מספר הטלפון אינו תקין');
    let phone = raw.replace(/\D/g, '');
    if (phone.startsWith('00972')) phone = `0${phone.slice(5)}`;
    else if (phone.startsWith('972')) phone = `0${phone.slice(3)}`;
    if (!/^0(?:5\d{8}|[23489]\d{7}|7\d{8})$/.test(phone)) throw new Error('יש להזין מספר טלפון ישראלי תקין');
    return phone;
}
export function parseRegistration(input: unknown) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('הפרטים אינם תקינים');
    const body = input as Record<string, unknown>;
    const birthDate = parseDate(body.birthDate, 'תאריך הלידה');
    if (birthDate > dateInIsrael() || birthDate < '1900-01-01') throw new Error('תאריך הלידה חייב להיות בעבר או היום');
    if (body.filledBy !== 'mother' && body.filledBy !== 'other') throw new Error('בחרי מי ממלאת את הטופס');
    if (body.filledBy === 'other' && body.consent !== true) throw new Error('נדרשת הסכמת היולדת למסירת פרטיה');
    return {
        motherName: text(body.motherName, 'שם יולדת', 120), phone: normalizePhone(body.phone),
        address: text(body.address, 'כתובת ביפו', 300), birthDate,
        dietaryNotes: text(body.dietaryNotes, 'רגישויות ובקשות', 2000, false), filledBy: body.filledBy as 'mother' | 'other',
        contactName: body.filledBy === 'other' ? text(body.contactName, 'שם פונה', 120) : '',
        contactPhone: body.filledBy === 'other' ? normalizePhone(body.contactPhone) : '',
        consent: body.filledBy === 'other',
    };
}
export function parseAdminUpdate(input: unknown) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('עדכון אינו תקין');
    const body = input as Record<string, unknown>;
    const registration = parseRegistration(body);
    if (!statuses.includes(body.status as ShifraStatus)) throw new Error('סטטוס אינו תקין');
    if (!Number.isInteger(body.revision) || (body.revision as number) < 0) throw new Error('גרסת הרשומה אינה תקינה');
    return { ...registration, status: body.status as ShifraStatus, deliveryDate: parseDate(body.deliveryDate, 'תאריך חלוקה'), adminNotes: text(body.adminNotes, 'הערות ניהול', 3000, false), revision: body.revision as number };
}
