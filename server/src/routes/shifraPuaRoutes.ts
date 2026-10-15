import { Router, type Request, type Response, type NextFunction } from 'express';
import mongoose from 'mongoose';
import { ShifraPuaRegistration as Registration } from '../models/ShifraPuaRegistration';
import { requireAdmin } from '../middleware/adminAuth';
import { requireSecureAdminMutation } from '../middleware/adminMutationSecurity';
import { publicOnboardingRateLimit, setPublicOnboardingSecurityHeaders } from '../middleware/publicOnboardingSecurity';
import { nextWednesday, parseRegistration, parseAdminUpdate, parseDate, statuses } from '../services/shifraPuaValidation';

export const shifraPuaPublicRoutes = Router();
export const shifraPuaAdminRoutes = Router();
const handle = (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => { void fn(req, res).catch(next); };
const invalid = (res: Response, error: unknown) => res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'הפרטים אינם תקינים' });
shifraPuaPublicRoutes.use(setPublicOnboardingSecurityHeaders, publicOnboardingRateLimit);
shifraPuaPublicRoutes.post('/', handle(async (req, res) => {
    let payload;
    try { payload = parseRegistration(req.body); } catch (error) { return invalid(res, error); }
    try {
        await Registration.create({ ...payload, deliveryDate: nextWednesday() });
    } catch (error) {
        // The unique index is also the idempotency boundary for simultaneous/retried requests.
        if ((error as { code?: number }).code !== 11000) throw error;
    }
    return res.status(200).json({ success: true });
}));
shifraPuaAdminRoutes.use(requireAdmin, requireSecureAdminMutation, setPublicOnboardingSecurityHeaders);
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
shifraPuaAdminRoutes.get('/', handle(async (req, res) => {
    const filter: Record<string, unknown> = {};
    const preparation = req.query.view === 'preparation';
    try {
        if (preparation) {
            filter.deliveryDate = parseDate(req.query.deliveryDate, 'תאריך חלוקה');
            filter.status = 'coordinated';
        } else {
            if (req.query.status) {
                if (!statuses.includes(req.query.status as typeof statuses[number])) throw new Error('סטטוס אינו תקין');
                filter.status = req.query.status;
            }
            if (req.query.from || req.query.to) {
                const from = req.query.from ? parseDate(req.query.from) : undefined;
                const to = req.query.to ? parseDate(req.query.to) : undefined;
                if (from && to && from > to) throw new Error('טווח התאריכים אינו תקין');
                const localDay = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Jerusalem' } };
                filter.$expr = { $and: [...(from ? [{ $gte: [localDay, from] }] : []), ...(to ? [{ $lte: [localDay, to] }] : [])] };
            }
        }
        if (req.query.q) {
            if (typeof req.query.q !== 'string' || req.query.q.length > 120) throw new Error('חיפוש אינו תקין');
            const pattern = escapeRegex(req.query.q.trim());
            filter.$or = ['motherName', 'phone', 'address', 'contactName', 'contactPhone'].map(field => ({ [field]: { $regex: pattern, $options: 'i' } }));
        }
    } catch (error) { return invalid(res, error); }
    const page = Number(req.query.page ?? 1);
    if (!Number.isInteger(page) || page < 1 || page > 100000) return invalid(res, new Error('עמוד אינו תקין'));
    const pageSize = 30;
    const [items, total, pending, mealCount] = await Promise.all([
        Registration.find(filter).sort(preparation ? { address: 1, _id: 1 } : { createdAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
        Registration.countDocuments(filter), Registration.countDocuments({ status: 'new' }),
        preparation ? Registration.countDocuments({ status: 'coordinated', deliveryDate: filter.deliveryDate as string }) : Promise.resolve(0),
    ]);
    const phones = [...new Set(items.map(item => item.phone))];
    const history = await Registration.aggregate<{ _id: string; count: number }>([
        { $match: { phone: { $in: phones } } },
        { $group: { _id: '$phone', count: { $sum: { $size: { $ifNull: ['$mealHistory', []] } } } } },
    ]);
    const counts = new Map(history.map(item => [item._id, item.count]));
    return res.json({ success: true, data: { items: items.map(item => ({ ...item, previousMeals: (counts.get(item.phone) ?? 0) - item.mealHistory.length })), total, pending, mealCount, page, pageSize } });
}));
shifraPuaAdminRoutes.get('/:id/history', handle(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return invalid(res, new Error('מזהה אינו תקין'));
    const current = await Registration.findById(req.params.id).lean();
    if (!current) return res.status(404).json({ success: false, message: 'הרשמה לא נמצאה' });
    const items = await Registration.find({ phone: current.phone }).select('motherName birthDate status mealHistory createdAt').sort({ birthDate: -1 }).lean();
    return res.json({ success: true, data: items });
}));
shifraPuaAdminRoutes.patch('/:id', handle(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return invalid(res, new Error('מזהה אינו תקין'));
    let update;
    try { update = parseAdminUpdate(req.body); } catch (error) { return invalid(res, error); }
    const current = await Registration.findById(req.params.id).lean();
    if (!current) return res.status(404).json({ success: false, message: 'הרשמה לא נמצאה' });
    const { revision, ...fields } = update;
    const actor = res.locals.adminActor.id as string;
    const meal = current.status !== 'delivered' && fields.status === 'delivered'
        ? { deliveryDate: fields.deliveryDate, address: fields.address, recordedAt: new Date(), recordedBy: actor } : null;
    try {
        const saved = await Registration.findOneAndUpdate({ _id: current._id, revision }, {
            $set: { ...fields, updatedBy: actor }, $inc: { revision: 1 }, ...(meal ? { $push: { mealHistory: meal } } : {}),
        }, { returnDocument: 'after', runValidators: true });
        if (!saved) return res.status(409).json({ success: false, message: 'הרשומה השתנתה. רעננו לפני שמירה נוספת.' });
        return res.json({ success: true });
    } catch (error) {
        if ((error as { code?: number }).code === 11000) return res.status(409).json({ success: false, message: 'כבר קיימת הרשמה עם אותו טלפון ותאריך לידה. טפלו בהרשמה הקיימת.' });
        throw error;
    }
}));
const reportError = (_error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    // Do not log database errors: validation/index errors can include personal details.
    console.error('Shifra Pua request failed');
    res.status(500).json({ success: false, message: 'לא ניתן להשלים את הפעולה כרגע. נסו שוב בהמשך.' });
};
shifraPuaPublicRoutes.use(reportError);
shifraPuaAdminRoutes.use(reportError);
