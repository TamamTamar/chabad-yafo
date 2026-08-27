import { Router } from "express";
import { requireAdmin } from "../../middleware/adminAuth";
import { requireSecureAdminMutation } from "../../middleware/adminMutationSecurity";
import { registerDaycareDonationAmbassadorsAdminRoutes } from "./daycareDonationAmbassadorsAdminRoutes";
import { registerDaycareDonationCampaignAdminRoutes } from "./daycareDonationCampaignAdminRoutes";
import { registerDaycareDonationDiagnosticsAdminRoutes } from "./daycareDonationDiagnosticsAdminRoutes";
import { registerDaycareDonationLeadsAdminRoutes } from "./daycareDonationLeadsAdminRoutes";
import { registerDaycareDonationRecordsAdminRoutes } from "./daycareDonationRecordsAdminRoutes";

const router = Router();

router.use(requireAdmin);
router.use(requireSecureAdminMutation);

registerDaycareDonationCampaignAdminRoutes(router);
registerDaycareDonationRecordsAdminRoutes(router);
registerDaycareDonationAmbassadorsAdminRoutes(router);
registerDaycareDonationLeadsAdminRoutes(router);
registerDaycareDonationDiagnosticsAdminRoutes(router);

export { router as daycareDonationAdminRoutes };
