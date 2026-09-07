import { Router, type Request, type Response, type NextFunction } from 'express';
import { isValidObjectId } from 'mongoose';
import { requireAdmin } from '../middleware/adminAuth';
import { requireSecureAdminMutation } from '../middleware/adminMutationSecurity';
import { ArbaatHaminimSeason, ArbaatHaminimPublication } from '../models/ArbaatHaminimSeason';
import { parseSaleContent, parseRevision } from '../services/arbaatHaminimValidation';

export const arbaatHaminimPublicRoutes = Router();
export const arbaatHaminimAdminRoutes = Router();
const handle = (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => { void fn(req, res).catch(next); };

arbaatHaminimPublicRoutes.get('/', handle(async (_req, res) => {
    res.set('Cache-Control', 'no-store');
    const publication = await ArbaatHaminimPublication.findById('current').lean();
    return res.json({ success: true, data: publication?.content ?? null });
}));

arbaatHaminimAdminRoutes.use(requireAdmin, requireSecureAdminMutation);
arbaatHaminimAdminRoutes.get('/', handle(async (_req, res) => {
    res.set('Cache-Control', 'no-store');
    const [seasons, publication] = await Promise.all([
        ArbaatHaminimSeason.find().sort({ updatedAt: -1 }).lean(),
        ArbaatHaminimPublication.findById('current').lean(),
    ]);
    return res.json({ success: true, data: { seasons, publication } });
}));
arbaatHaminimAdminRoutes.post('/', handle(async (req, res) => {
    let content;
    try { content = parseSaleContent(req.body.content); } catch (error) { return res.status(400).json({ success: false, message: (error as Error).message }); }
    const season = await ArbaatHaminimSeason.create({ content });
    return res.status(201).json({ success: true, data: season });
}));
arbaatHaminimAdminRoutes.put('/:id', handle(async (req, res) => {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'מזהה עונה אינו תקין' });
    let content, revision;
    try { content = parseSaleContent(req.body.content); revision = parseRevision(req.body.revision); } catch (error) { return res.status(400).json({ success: false, message: (error as Error).message }); }
    const season = await ArbaatHaminimSeason.findOneAndUpdate({ _id: req.params.id, revision }, { $set: { content }, $inc: { revision: 1 } }, { new: true });
    if (!season) return res.status(409).json({ success: false, message: 'העונה השתנתה בחלון אחר. יש לטעון אותה מחדש לפני שמירה.' });
    return res.json({ success: true, data: season });
}));
arbaatHaminimAdminRoutes.post('/:id/publish', handle(async (req, res) => {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'מזהה עונה אינו תקין' });
    let revision;
    try { revision = parseRevision(req.body.revision); } catch (error) { return res.status(400).json({ success: false, message: (error as Error).message }); }
    const season = await ArbaatHaminimSeason.findOne({ _id: req.params.id, revision }).lean();
    if (!season) return res.status(409).json({ success: false, message: 'הטיוטה השתנתה. יש לטעון אותה מחדש לפני פרסום.' });
    const publication = await ArbaatHaminimPublication.findOneAndUpdate({ _id: 'current' }, { $set: { seasonId: String(season._id), revision: season.revision, content: season.content } }, { new: true, upsert: true });
    return res.json({ success: true, data: publication });
}));
const reportError = (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Arbaat haminim content request failed', error);
    res.status(500).json({ success: false, message: 'לא ניתן לגשת לתוכן כרגע. נסו שוב בהמשך.' });
};
arbaatHaminimPublicRoutes.use(reportError);
arbaatHaminimAdminRoutes.use(reportError);
