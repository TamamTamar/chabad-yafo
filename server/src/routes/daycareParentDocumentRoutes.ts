import { Router } from "express";
import { downloadAdminParentDocument, downloadCurrentParentDocument, downloadParentDocumentForToken, getCurrentParentDocuments, getParentDocumentsForToken, listAdminParentDocumentYears, saveAdminParentDocumentYear, unlockAdminParentDocumentYear, updateAdminParentDocumentSharing } from "../controllers/daycareParentDocumentController";
import { publicOnboardingRateLimit, setPublicOnboardingSecurityHeaders } from "../middleware/publicOnboardingSecurity";
import { requireAdmin } from "../middleware/adminAuth";
import { requireSecureAdminMutation } from "../middleware/adminMutationSecurity";
import { downloadSharedDaycareAnnualPlanForToken } from "../controllers/daycareAnnualPlanController";

const router = Router();
router.use(setPublicOnboardingSecurityHeaders, publicOnboardingRateLimit);
router.get("/current", getCurrentParentDocuments);
router.get("/current/:key/pdf", downloadCurrentParentDocument);
router.get("/public/:token", getParentDocumentsForToken);
router.get("/public/:token/annualPlan/pdf", downloadSharedDaycareAnnualPlanForToken);
router.get("/public/:token/:key/pdf", downloadParentDocumentForToken);

const adminRouter = Router();
adminRouter.use(requireAdmin, requireSecureAdminMutation);
adminRouter.get("/", listAdminParentDocumentYears);
adminRouter.get("/:schoolYear/:key/pdf", downloadAdminParentDocument);
adminRouter.patch("/:schoolYear/:key/sharing", updateAdminParentDocumentSharing);
adminRouter.post("/:schoolYear/unlock", unlockAdminParentDocumentYear);
adminRouter.put("/:schoolYear", saveAdminParentDocumentYear);

export { router as daycareParentDocumentRoutes, adminRouter as daycareParentDocumentAdminRoutes };
