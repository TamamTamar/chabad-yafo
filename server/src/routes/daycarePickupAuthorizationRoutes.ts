import { Router, type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import { downloadAdminDaycarePickupAuthorization, downloadBlankPublicDaycarePickupAuthorization, downloadPublicDaycarePickupAuthorization, getAdminDaycarePickupAuthorization, getPublicDaycarePickupAuthorization, reviewAdminDaycarePickupAuthorization, submitPublicDaycarePickupAuthorization, uploadPublicDaycarePickupAuthorization } from "../controllers/daycarePickupAuthorizationController";
import { requireAdmin } from "../middleware/adminAuth";
import { requireSecureAdminMutation } from "../middleware/adminMutationSecurity";
import { publicOnboardingRateLimit, setPublicOnboardingSecurityHeaders } from "../middleware/publicOnboardingSecurity";

const signatureStorage = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1 } });
const documentStorage = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } });
const receive = (field: "signature" | "document", manual: boolean) => (req: Request, res: Response, next: NextFunction) => (manual ? documentStorage : signatureStorage).single(field)(req, res, (error) => { if (error instanceof multer.MulterError) return res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ success: false, message: error.code === "LIMIT_FILE_SIZE" ? `הקובץ גדול מדי. ניתן להעלות עד ${manual ? "10MB" : "2MB"}.` : "לא הצלחנו לקבל את הקובץ." }); if (error) return next(error); return next(); });

const publicRouter = Router(); publicRouter.use(setPublicOnboardingSecurityHeaders, publicOnboardingRateLimit);
publicRouter.get("/:token", getPublicDaycarePickupAuthorization);
publicRouter.get("/:token/blank-form", downloadBlankPublicDaycarePickupAuthorization);
publicRouter.post("/:token/submit", receive("signature", false), submitPublicDaycarePickupAuthorization);
publicRouter.post("/:token/upload", receive("document", true), uploadPublicDaycarePickupAuthorization);
publicRouter.get("/:token/signed-copy", downloadPublicDaycarePickupAuthorization);

const adminRouter = Router(); adminRouter.use(requireAdmin, requireSecureAdminMutation);
adminRouter.get("/by-onboarding/:onboardingId", getAdminDaycarePickupAuthorization);
adminRouter.patch("/:id/review", reviewAdminDaycarePickupAuthorization);
adminRouter.get("/:id/signed-copy", downloadAdminDaycarePickupAuthorization);

export { publicRouter as daycarePickupAuthorizationPublicRoutes, adminRouter as daycarePickupAuthorizationAdminRoutes };
