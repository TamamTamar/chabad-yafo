import mongoose, { type ClientSession } from 'mongoose';
import { createHmac } from 'node:crypto';
import { AUCTION_ID, MaftirYonaAuction } from '../models/MaftirYonaAuction';
import { MaftirYonaBid, MaftirYonaRateLimit } from '../models/MaftirYonaBid';
import { AuctionError, integer, israelDate, minimumBid, parseBid, publicBid, validateOffer } from './maftirYonaRules';

export function abuseHash(value: string) {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required');
    return createHmac('sha256', process.env.JWT_SECRET).update(`maftir-yona:${value}`).digest('hex');
}
export async function rateLimit(key: string, maximum: number, now = Date.now()) {
    const window = Math.floor(now / 60000);
    const id = `${key}:${window}`;
    try {
        const counter = await MaftirYonaRateLimit.findOneAndUpdate({ _id: id }, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((window + 2) * 60000) } }, { upsert: true, returnDocument: 'after' });
        if (counter!.count > maximum) throw new AuctionError(429, 'בוצעו יותר מדי ניסיונות. המתינו דקה ונסו שוב.');
    } catch (error) {
        if ((error as { code?: number }).code === 11000) return rateLimit(key, maximum, now);
        throw error;
    }
}
async function transaction<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
    const session = await mongoose.startSession();
    try { return (await session.withTransaction(() => fn(session), { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } }))!; }
    finally { await session.endSession(); }
}
// Every mutation writes the auction first. MongoDB retries conflicting transactions,
// then validation runs again against the newly committed leader, settings and time.
async function lockAuction(session: ClientSession) {
    const auction = await MaftirYonaAuction.findOneAndUpdate({ _id: AUCTION_ID }, { $inc: { revision: 1 } }, { session, returnDocument: 'after' });
    if (!auction) throw new AuctionError(409, 'המכירה טרם נפתחה');
    return auction;
}
async function snapshot(session: ClientSession, admin: boolean) {
    const auction = await MaftirYonaAuction.findById(AUCTION_ID).session(session).lean();
    const now = new Date();
    if (!auction) {
        const defaults = new MaftirYonaAuction().toObject();
        return { ...publicAuction(defaults, now), initialized: false, leadingBid: null, winner: null, bids: [], minimumBid: defaults.openingPrice };
    }
    const leading = auction.leadingBidId ? await MaftirYonaBid.findById(auction.leadingBidId).session(session).lean() : null;
    const bids = await MaftirYonaBid.find({ auctionId: AUCTION_ID, ...(admin ? {} : { status: 'active' }) }).sort({ receivedAt: -1, _id: -1 }).limit(admin ? 0 : 5).session(session).lean();
    const status = auction.endsAt <= now ? 'ended' : auction.status;
    return {
        ...publicAuction(auction, now), status, initialized: true,
        minimumBid: minimumBid(auction, leading?.amount),
        leadingBid: publicBid(leading),
        winner: status === 'ended' ? (admin ? adminBid(leading) : publicBid(leading)) : null,
        bids: admin ? bids.map(adminBid) : bids.map(publicBid),
    };
}
function publicAuction(a: { name: string; openingPrice: number; minimumIncrement: number; opensAt: Date; endsAt: Date; extensionMs: number; extensionWindowMs: number; status: string; revision: number }, now: Date) {
    return { name: a.name, openingPrice: a.openingPrice, minimumIncrement: a.minimumIncrement, opensAt: a.opensAt, endsAt: a.endsAt, extensionMs: a.extensionMs, extensionWindowMs: a.extensionWindowMs, status: a.status, revision: a.revision, serverTime: now };
}
function adminBid(b: { _id: unknown; firstName: string; lastName: string; phone: string; amount: number; receivedAt: Date; status: string } | null) {
    return b ? { ...publicBid(b), firstName: b.firstName, lastName: b.lastName, phone: b.phone, status: b.status } : null;
}
export async function getAuction(admin = false) {
    // Atomic deadline finalization also runs after a server restart. A simultaneous
    // extension changes endsAt and makes this predicate fail instead of closing early.
    await MaftirYonaAuction.updateOne({ _id: AUCTION_ID, status: { $ne: 'ended' }, endsAt: { $lte: new Date() } }, [{ $set: { status: 'ended', winnerBidId: '$leadingBidId', revision: { $add: ['$revision', 1] } } }], { updatePipeline: true });
    return transaction(session => snapshot(session, admin));
}
export async function submitBid(body: Record<string, unknown>, ipHash: string) {
    const input = parseBid(body);
    await rateLimit(`phone:${abuseHash(input.phone)}`, 6);
    return transaction(async session => {
        const auction = await lockAuction(session);
        const existing = await MaftirYonaBid.findOne({ auctionId: AUCTION_ID, requestId: input.requestId }).session(session);
        if (existing) {
            if (existing.phone !== input.phone || existing.amount !== input.amount || existing.firstName !== input.firstName || existing.lastName !== input.lastName) throw new AuctionError(409, 'מזהה הבקשה כבר בשימוש');
            auction.revision -= 1;
            await auction.save({ session });
            return { data: await snapshot(session, false), acceptedBidId: String(existing._id), duplicate: true };
        }
        if (auction.revision - 1 !== input.revision) throw new AuctionError(409, 'פרטי המכירה השתנו. בדקו את הסכום המוביל ואת המינימום החדש ואשרו מחדש.');
        const leading = auction.leadingBidId ? await MaftirYonaBid.findById(auction.leadingBidId).session(session) : null;
        const receivedAt = new Date();
        const endsAt = validateOffer(auction, input.amount, leading?.amount, receivedAt);
        const [bid] = await MaftirYonaBid.create([{ auctionId: AUCTION_ID, firstName: input.firstName, lastName: input.lastName, phone: input.phone, amount: input.amount, requestId: input.requestId, receivedAt, ipHash, status: 'active' }], { session });
        auction.leadingBidId = bid._id;
        auction.endsAt = endsAt;
        await auction.save({ session });
        return { data: await snapshot(session, false), acceptedBidId: String(bid._id), duplicate: false };
    });
}
export async function initializeAuction() {
    // Explicit admin action only; public reads never seed a campaign or auction.
    await MaftirYonaAuction.updateOne({ _id: AUCTION_ID }, { $setOnInsert: { _id: AUCTION_ID } }, { upsert: true });
    return getAuction(true);
}
export async function manageAuction(body: Record<string, unknown>, actor: string) {
    return transaction(async session => {
        const auction = await lockAuction(session);
        if (body.revision !== auction.revision - 1) throw new AuctionError(409, 'המכירה השתנתה. יש לרענן לפני ביצוע הפעולה.');
        const now = new Date();
        if (auction.endsAt <= now) { auction.status = 'ended'; auction.winnerBidId = auction.leadingBidId; }
        switch (body.action) {
            case 'settings': {
                if (auction.status === 'ended') throw new AuctionError(409, 'לא ניתן לשנות הגדרות של מכירה שהסתיימה');
                auction.openingPrice = integer(body.openingPrice, 'מחיר פתיחה');
                auction.minimumIncrement = integer(body.minimumIncrement, 'תוספת מינימלית');
                const endsAt = israelDate(body.endsAtIsrael);
                if (endsAt <= now) throw new AuctionError(400, 'יש לבחור מועד סיום עתידי. לסיום מיידי השתמשו בסגירה.');
                auction.endsAt = endsAt;
                break;
            }
            case 'open':
                if (auction.status === 'ended') throw new AuctionError(409, 'מכירה שהסתיימה אינה ניתנת לפתיחה מחדש');
                if (auction.endsAt <= now) throw new AuctionError(400, 'יש לעדכן את מועד הסיום לפני הפתיחה');
                auction.status = 'open'; auction.opensAt = now; break;
            case 'pause':
                if (auction.status !== 'open') throw new AuctionError(409, 'אפשר לעצור רק מכירה פתוחה');
                auction.status = 'paused'; break;
            case 'extend':
                if (auction.status === 'ended') throw new AuctionError(409, 'המכירה כבר הסתיימה');
                if (integer(body.minutes, 'דקות הארכה') > 525600) throw new AuctionError(400, 'הארכה מרבית היא שנה');
                auction.endsAt = new Date(auction.endsAt.getTime() + Number(body.minutes) * 60000); break;
            case 'close':
                auction.status = 'ended'; auction.endsAt = now; auction.winnerBidId = auction.leadingBidId; break;
            case 'invalidate': {
                if (typeof body.bidId !== 'string' || !mongoose.isValidObjectId(body.bidId)) throw new AuctionError(400, 'הצעה לא תקינה');
                const bid = await MaftirYonaBid.findOneAndUpdate({ _id: body.bidId, auctionId: AUCTION_ID, status: 'active' }, { $set: { status: 'invalid', invalidatedAt: now, invalidatedBy: actor } }, { session });
                if (!bid) throw new AuctionError(409, 'ההצעה אינה פעילה');
                const next = await MaftirYonaBid.findOne({ auctionId: AUCTION_ID, status: 'active' }).sort({ amount: -1, receivedAt: 1, _id: 1 }).session(session);
                auction.leadingBidId = next?._id ?? null;
                if (auction.status === 'ended') auction.winnerBidId = auction.leadingBidId;
                break;
            }
            default: throw new AuctionError(400, 'פעולה לא תקינה');
        }
        await auction.save({ session });
        return snapshot(session, true);
    });
}
