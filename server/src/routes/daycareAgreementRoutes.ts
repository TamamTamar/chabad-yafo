import { Router, type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import { requireAdmin } from "../middleware/adminAuth";
import { requireSecureAdminMutation } from "../middleware/adminMutationSecurity";
import { publicOnboardingRateLimit, setPublicOnboardingSecurityHeaders } from "../middleware/publicOnboardingSecurity";
import {
    createAdminAgreementDraft, downloadAdminAgreementFile, downloadAdminAgreementReviewPdf, downloadPublicDaycareAgreementPdf, downloadPublicSignedAgreement, getAdminAgreementByOnboarding, getPublicDaycareAgreement,
    listAdminAgreementVersions, patchAdminAgreementDraft, publishAdminAgreementDraft,
    reviewAdminAgreement, signPublicDaycareAgreement, uploadPublicSignedAgreement,
} from "../controllers/daycareAgreementController";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } });
const singlePrivateFile = (fieldName: string) =>
    (req: Request, res: Response, next: NextFunction) => {
        upload.single(fieldName)(req, res, (error) => {
            if (error instanceof multer.MulterError) {
                const tooLarge = error.code === "LIMIT_FILE_SIZE";
                return res.status(tooLarge ? 413 : 400).json({
                    success: false,
                    code: tooLarge ? "FILE_TOO_LARGE" : "INVALID_UPLOAD",
                    message: tooLarge
                        ? "הקובץ גדול מ־10MB. יש לבחור קובץ קטן יותר."
                        : "לא הצלחנו לקבל את הקובץ.",
                });
            }
            if (error) return next(error);
            return next();
        });
    };
const publicRouter = Router();
publicRouter.use(setPublicOnboardingSecurityHeaders, publicOnboardingRateLimit);
publicRouter.get("/:token", getPublicDaycareAgreement);
publicRouter.get("/:token/pdf", downloadPublicDaycareAgreementPdf);
publicRouter.get("/:token/signed-copy", downloadPublicSignedAgreement);
publicRouter.post("/:token/sign", singlePrivateFile("signature"), signPublicDaycareAgreement);
publicRouter.post("/:token/upload-signed-pdf", singlePrivateFile("file"), uploadPublicSignedAgreement);

const adminRouter = Router();
adminRouter.use(requireAdmin, requireSecureAdminMutation);
adminRouter.get("/versions", listAdminAgreementVersions);
adminRouter.get("/by-onboarding/:onboardingId", getAdminAgreementByOnboarding);
adminRouter.post("/versions", createAdminAgreementDraft);
adminRouter.patch("/versions/:id", patchAdminAgreementDraft);
adminRouter.post("/versions/:id/publish", publishAdminAgreementDraft);
adminRouter.get("/versions/:id/review-pdf", downloadAdminAgreementReviewPdf);
adminRouter.patch("/:id/review", reviewAdminAgreement);
adminRouter.get("/:id/files/:kind", downloadAdminAgreementFile);

export { publicRouter as daycareAgreementPublicRoutes, adminRouter as daycareAgreementAdminRoutes };
