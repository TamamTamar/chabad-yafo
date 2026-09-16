export class AuctionError extends Error {
    constructor(public statusCode: number, message: string) { super(message); }
}
export function integer(value: unknown, label: string): number {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1 || value > 1000000000) {
        throw new AuctionError(400, `${label}: יש להזין מספר שלם בין 1 ל־1,000,000,000`);
    }
    return value;
}
export function normalizePhone(value: unknown): string {
    if (typeof value !== 'string' || value.length > 30 || !/^[+\d\s()-]+$/.test(value)) throw new AuctionError(400, 'מספר טלפון לא תקין');
    let phone = value.replace(/[\s()-]/g, '');
    phone = phone.replace(/^00972/, '+972');
    if (/^\+[1-9]\d{7,14}$/.test(phone)) return phone;
    if (!/^0(?:[23489]|[57]\d)\d{7}$/.test(phone)) throw new AuctionError(400, 'מספר טלפון לא תקין');
    return `+972${phone.slice(1)}`;
}
export function parseBid(body: Record<string, unknown>) {
    const name = (value: unknown) => {
        if (typeof value !== 'string' || !/^[\p{L}\p{M} '\u05f3\u05f4’־-]{1,50}$/u.test(value.trim()) || !/\p{L}/u.test(value)) throw new AuctionError(400, 'יש להזין שם תקין, עד 50 תווים');
        return value.trim().replace(/\s+/g, ' ');
    };
    if (body.accepted !== true) throw new AuctionError(400, 'יש לאשר את ההתחייבות');
    if (typeof body.requestId !== 'string' || !/^[a-f0-9-]{36}$/i.test(body.requestId)) throw new AuctionError(400, 'מזהה בקשה לא תקין');
    if (!Number.isSafeInteger(body.revision) || Number(body.revision) < 0) throw new AuctionError(400, 'גרסת מכירה לא תקינה');
    return { firstName: name(body.firstName), lastName: name(body.lastName), phone: normalizePhone(body.phone), amount: integer(body.amount, 'סכום ההצעה'), requestId: body.requestId, revision: Number(body.revision) };
}
export type AuctionRules = { status: string; opensAt: Date; endsAt: Date; openingPrice: number; minimumIncrement: number; extensionMs: number; extensionWindowMs: number };
export const minimumBid = (auction: AuctionRules, leadingAmount?: number) => leadingAmount === undefined ? auction.openingPrice : Math.max(auction.openingPrice, leadingAmount + auction.minimumIncrement);
export function validateOffer(auction: AuctionRules, amount: number, leadingAmount: number | undefined, now: Date) {
    if (auction.status !== 'open' || now < auction.opensAt || now >= auction.endsAt) throw new AuctionError(409, 'המכירה אינה פתוחה להצעות');
    const minimum = minimumBid(auction, leadingAmount);
    if (amount < minimum) throw new AuctionError(409, `הסכום המינימלי כעת הוא ${minimum.toLocaleString('he-IL')} ₪`);
    return auction.endsAt.getTime() - now.getTime() <= auction.extensionWindowMs ? new Date(now.getTime() + auction.extensionMs) : auction.endsAt;
}
export function publicBid(bid: { _id: unknown; firstName: string; lastName: string; amount: number; receivedAt: Date } | null) {
    return bid ? { id: String(bid._id), name: `${bid.firstName} ${Array.from(bid.lastName)[0]}׳`, amount: bid.amount, receivedAt: bid.receivedAt } : null;
}
const israelFormatter = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
export function israelDate(value: unknown): Date {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new AuctionError(400, 'מועד הסיום אינו תקין');
    const naive = Date.parse(`${value}:00Z`);
    const candidates = [2, 3].map(offset => new Date(naive - offset * 3600000)).filter(date => Number.isFinite(date.getTime()) && israelFormatter.format(date).replace(' ', 'T') === value);
    if (candidates.length !== 1) throw new AuctionError(400, 'שעה לא קיימת או כפולה במעבר שעון ישראל; בחרו שעה אחרת');
    return candidates[0];
}
