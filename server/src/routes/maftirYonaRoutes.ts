import { Router, type Request, type Response } from 'express';
import { requireAdmin } from '../middleware/adminAuth';
import { requireSecureAdminMutation } from '../middleware/adminMutationSecurity';
import { abuseHash, getAuction, initializeAuction, manageAuction, rateLimit, submitBid } from '../services/maftirYonaService';
import { AuctionError } from '../services/maftirYonaRules';
import { logger } from '../utils/logger';
import { createFailureLogGate, requestDiagnostics } from '../utils/auctionRequestDiagnostics';

export const maftirYonaPublicRoutes = Router();
export const maftirYonaAdminRoutes = Router();
const pollingFailures = createFailureLogGate();
const handle = (fn: (req: Request, res: Response) => Promise<unknown>) => async (req: Request, res: Response) => {
    // Route templates only: no query strings, request bodies or user identifiers.
    const endpoint = `${req.baseUrl}${req.route.path}`;
    const key = `${req.method} ${endpoint}`;
    res.set('Cache-Control', 'no-store');
    try { await fn(req, res); if (req.method === 'GET') pollingFailures.succeeded(key); }
    catch (error) {
        const status = error instanceof AuctionError ? error.statusCode : 503;
        if (!(error instanceof AuctionError)) {
            const details = requestDiagnostics(error, endpoint, req.method, status);
            if (req.method !== 'GET' || pollingFailures.failed(key, details)) logger.error('Maftir Yona request failed', details);
        }
        if (status === 429) res.set('Retry-After', '60');
        res.status(status).json({ success: false, message: error instanceof AuctionError ? error.message : 'המכירה אינה זמינה כרגע. נסו שוב בעוד רגע.' });
    }
};
maftirYonaPublicRoutes.get('/', handle(async (_req, res) => { res.json({ success: true, data: await getAuction() }); }));
maftirYonaPublicRoutes.post('/bids', handle(async (req, res) => {
    const ipHash = abuseHash(req.ip || req.socket.remoteAddress || 'unknown');
    await rateLimit(`ip:${ipHash}`, 20);
    const result = await submitBid(req.body ?? {}, ipHash);
    res.status(result.duplicate ? 200 : 201).json({ success: true, ...result });
}));
maftirYonaAdminRoutes.use(requireAdmin, requireSecureAdminMutation);
maftirYonaAdminRoutes.get('/', handle(async (_req, res) => { res.json({ success: true, data: await getAuction(true) }); }));
maftirYonaAdminRoutes.post('/initialize', handle(async (_req, res) => { res.json({ success: true, data: await initializeAuction() }); }));
maftirYonaAdminRoutes.post('/manage', handle(async (req, res) => { res.json({ success: true, data: await manageAuction(req.body ?? {}, res.locals.adminActor.id) }); }));
