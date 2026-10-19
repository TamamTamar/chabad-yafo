import { Router } from 'express';
import { requireAdmin } from '../../middleware/adminAuth';
import { requireSecureAdminMutation } from '../../middleware/adminMutationSecurity';
import { initializeDaycareDefaults } from './daycareInitializationService';

const router = Router();
// No UI calls this endpoint automatically. Requires deliberate confirmation even
// from an authenticated admin. Do not run it as a migration or on application start.
router.post('/daycare/initialize', requireAdmin, requireSecureAdminMutation, async (req, res) => {
    if (req.body?.confirmation !== 'INITIALIZE_DAYCARE_DEFAULTS') {
        return res.status(400).json({ success: false, message: 'Explicit initialization confirmation is required' });
    }
    try {
        return res.json({ success: true, data: await initializeDaycareDefaults() });
    } catch {
        return res.status(500).json({ success: false, message: 'Failed to initialize daycare defaults' });
    }
});
export { router as daycareInitializationRoutes };
