import { Router, type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import { downloadAdminDaycareHealthDeclaration, downloadBlankPublicDaycareHealthDeclaration, downloadPublicDaycareHealthDeclaration, getAdminDaycareHealthDeclaration, getPublicDaycareHealthDeclaration, reviewAdminDaycareHealthDeclaration, submitPublicDaycareHealthDeclaration, uploadPublicDaycareHealthDeclaration } from "../controllers/daycareHealthDeclarationController";
import { requireAdmin } from "../middleware/adminAuth";
import { requireSecureAdminMutation } from "../middleware/adminMutationSecurity";
import { publicOnboardingRateLimit, setPublicOnboardingSecurityHeaders } from "../middleware/publicOnboardingSecurity";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1 } });
const signatureUpload = (req: Request, res: Response, next: NextFunction) => upload.single("signature")(req, res, (error) => {
    if (error instanceof multer.MulterError) return res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ success: false, message: error.code === "LIMIT_FILE_SIZE" ? "החתימה גדולה מדי." : "לא הצלחנו לקבל את החתימה." });
    if (error) return next(error);
    return next();
});
const documentUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } });
const signedDocumentUpload = (req: Request, res: Response, next: NextFunction) => documentUpload.single("document")(req, res, (error) => {
    if (error instanceof multer.MulterError) return res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ success: false, message: error.code === "LIMIT_FILE_SIZE" ? "הקובץ גדול מדי. ניתן להעלות עד 10MB." : "לא הצלחנו לקבל את הקובץ." });
    if (error) return next(error);
    return next();
});

const publicRouter = Router();
publicRouter.use(setPublicOnboardingSecurityHeaders, publicOnboardingRateLimit);
publicRouter.get("/:token", getPublicDaycareHealthDeclaration);
publicRouter.get("/:token/blank-form", downloadBlankPublicDaycareHealthDeclaration);
publicRouter.post("/:token/submit", signatureUpload, submitPublicDaycareHealthDeclaration);
publicRouter.post("/:token/upload", signedDocumentUpload, uploadPublicDaycareHealthDeclaration);
publicRouter.get("/:token/signed-copy", downloadPublicDaycareHealthDeclaration);

const adminRouter = Router();
adminRouter.use(requireAdmin, requireSecureAdminMutation);
adminRouter.get("/by-onboarding/:onboardingId", getAdminDaycareHealthDeclaration);
adminRouter.patch("/:id/review", reviewAdminDaycareHealthDeclaration);
adminRouter.get("/:id/signed-copy", downloadAdminDaycareHealthDeclaration);

export { publicRouter as daycareHealthDeclarationPublicRoutes, adminRouter as daycareHealthDeclarationAdminRoutes };
