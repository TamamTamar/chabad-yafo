import { Router } from "express";
import {
    createLegacyDaycareOnboarding,
    createDaycareOnboardingFromRegistration,
    deleteAdminDaycareOnboarding,
    getAdminDaycareOnboarding,
    getAdminDaycareOnboardingAudit,
    getPublicDaycareOnboarding,
    listAdminDaycareOnboardings,
    listAdminDaycareOnboardingFamilies,
    patchAdminDaycareOnboarding,
    patchAdminDaycareOnboardingAccess,
    patchAdminDaycareOnboardingStep,
    regenerateAdminDaycareOnboardingLink,
    submitPublicDaycareOnboardingProfile,
    submitPublicDaycareOnboardingBundle,
} from "../controllers/daycareOnboardingController";
import { requireAdmin } from "../middleware/adminAuth";
import { requireSecureAdminMutation } from "../middleware/adminMutationSecurity";
import {
    publicOnboardingRateLimit,
    setPublicOnboardingSecurityHeaders,
} from "../middleware/publicOnboardingSecurity";

const publicRouter = Router();

publicRouter.use(setPublicOnboardingSecurityHeaders);
publicRouter.use(publicOnboardingRateLimit);
publicRouter.get("/:token", getPublicDaycareOnboarding);
publicRouter.put("/:token/profile", submitPublicDaycareOnboardingProfile);
publicRouter.post("/:token/submit", submitPublicDaycareOnboardingBundle);

const adminRouter = Router();

adminRouter.use(requireAdmin);
adminRouter.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store, max-age=0");
    res.setHeader("Pragma", "no-cache");
    next();
});
adminRouter.use(requireSecureAdminMutation);
adminRouter.get("/", listAdminDaycareOnboardings);
adminRouter.get("/families", listAdminDaycareOnboardingFamilies);
adminRouter.post(
    "/import/:enrollmentId",
    createLegacyDaycareOnboarding
);
adminRouter.post(
    "/from-registration/:registrationId",
    createDaycareOnboardingFromRegistration
);
adminRouter.get("/:id/audit", getAdminDaycareOnboardingAudit);
adminRouter.get("/:id", getAdminDaycareOnboarding);
adminRouter.delete("/:id", deleteAdminDaycareOnboarding);
adminRouter.patch("/:id", patchAdminDaycareOnboarding);
adminRouter.patch(
    "/:id/steps/:stepKey",
    patchAdminDaycareOnboardingStep
);
adminRouter.post(
    "/:id/regenerate-link",
    regenerateAdminDaycareOnboardingLink
);
adminRouter.post(
    "/:id/create-link",
    regenerateAdminDaycareOnboardingLink
);
adminRouter.patch("/:id/access", patchAdminDaycareOnboardingAccess);

export {
    adminRouter as daycareOnboardingAdminRoutes,
    publicRouter as daycareOnboardingPublicRoutes,
};
