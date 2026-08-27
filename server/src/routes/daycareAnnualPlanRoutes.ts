import { Router } from "express";
import { deleteAdminDaycareAnnualPlan, downloadAdminDaycareAnnualPlan, listAdminDaycareAnnualPlans, previewAdminDaycareAnnualPlan, saveAdminDaycareAnnualPlan, syncAdminDaycareAnnualPlanHolidays, updateAdminDaycareAnnualPlanSharing } from "../controllers/daycareAnnualPlanController";
import { requireAdmin } from "../middleware/adminAuth";
import { requireSecureAdminMutation } from "../middleware/adminMutationSecurity";

const router = Router();
router.use(requireAdmin, requireSecureAdminMutation);
router.get("/", listAdminDaycareAnnualPlans);
router.post("/preview", previewAdminDaycareAnnualPlan);
router.post("/:schoolYear/sync-holidays", syncAdminDaycareAnnualPlanHolidays);
router.patch("/:schoolYear/sharing", updateAdminDaycareAnnualPlanSharing);
router.get("/:schoolYear/pdf", downloadAdminDaycareAnnualPlan);
router.put("/:schoolYear", saveAdminDaycareAnnualPlan);
router.delete("/:schoolYear", deleteAdminDaycareAnnualPlan);

export { router as daycareAnnualPlanAdminRoutes };
