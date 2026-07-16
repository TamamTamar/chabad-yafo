import { Router } from "express";
import { downloadCurrentParentDocument, downloadParentDocumentForToken, getCurrentParentDocuments, getParentDocumentsForToken, listAdminParentDocumentYears, saveAdminParentDocumentYear } from "../controllers/daycareParentDocumentController";
import { publicOnboardingRateLimit, setPublicOnboardingSecurityHeaders } from "../middleware/publicOnboardingSecurity";
import { requireAdmin } from "../middleware/adminAuth";
import { requireSecureAdminMutation } from "../middleware/adminMutationSecurity";

const router = Router();
router.use(setPublicOnboardingSecurityHeaders, publicOnboardingRateLimit);
router.get("/current", getCurrentParentDocuments);
router.get("/current/:key/pdf", downloadCurrentParentDocument);
router.get("/public/:token", getParentDocumentsForToken);
router.get("/public/:token/:key/pdf", downloadParentDocumentForToken);

const adminRouter = Router();
adminRouter.use(requireAdmin, requireSecureAdminMutation);
adminRouter.get("/", listAdminParentDocumentYears);
adminRouter.put("/:schoolYear", saveAdminParentDocumentYear);

export { router as daycareParentDocumentRoutes, adminRouter as daycareParentDocumentAdminRoutes };
