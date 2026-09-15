import { Router, type Request, type Response, type NextFunction } from 'express';
import { requireAdmin } from '../middleware/adminAuth';
import { requireSecureAdminMutation } from '../middleware/adminMutationSecurity';
import { ArbaatHaminimSettings } from '../models/ArbaatHaminimSettings';
import { parseSaleContent, parseRevision } from '../services/arbaatHaminimValidation';

export const arbaatHaminimPublicRoutes = Router();
export const arbaatHaminimAdminRoutes = Router();
const handle = (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => { void fn(req, res).catch(next); };
const conflict = (res: Response) => res.status(409).json({ success: false, message: 'פרטי המכירה השתנו בחלון אחר. יש לרענן את העמוד לפני שמירה.' });

arbaatHaminimPublicRoutes.get('/', handle(async (_req, res) => {
    res.set('Cache-Control', 'no-store');
    const settings = await ArbaatHaminimSettings.findById('current').lean();
    return res.json({ success: true, data: settings?.content ?? null });
}));
arbaatHaminimAdminRoutes.use(requireAdmin, requireSecureAdminMutation);
arbaatHaminimAdminRoutes.get('/', handle(async (_req, res) => {
    res.set('Cache-Control', 'no-store');
    const settings = await ArbaatHaminimSettings.findById('current').lean();
    return res.json({ success: true, data: settings ? { content: settings.content, revision: settings.revision } : null });
}));
arbaatHaminimAdminRoutes.put('/', handle(async (req, res) => {
    let content, revision;
    try {
        content = parseSaleContent(req.body.content);
        revision = req.body.revision === null ? null : parseRevision(req.body.revision);
    } catch (error) { return res.status(400).json({ success: false, message: (error as Error).message }); }
    if (revision === null) {
        try {
            const settings = await ArbaatHaminimSettings.create({ _id: 'current', content, revision: 0 });
            return res.json({ success: true, data: { content: settings.content, revision: settings.revision } });
        } catch (error) {
            if ((error as { code?: number }).code === 11000) return conflict(res);
            throw error;
        }
    }
    const settings = await ArbaatHaminimSettings.findOneAndUpdate(
        { _id: 'current', revision }, { $set: { content }, $inc: { revision: 1 } }, { returnDocument: 'after' }
    );
    if (!settings) return conflict(res);
    return res.json({ success: true, data: { content: settings.content, revision: settings.revision } });
}));
const reportError = (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Arbaat haminim content request failed', error);
    res.status(500).json({ success: false, message: 'לא ניתן לגשת לתוכן כרגע. נסו שוב בהמשך.' });
};
arbaatHaminimPublicRoutes.use(reportError);
arbaatHaminimAdminRoutes.use(reportError);
