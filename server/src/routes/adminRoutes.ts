import { Router } from "express";
import { daycareDocumentRoutes } from "./admin/daycareDocumentRoutes";
import { daycareFinanceRoutes } from "./admin/daycareFinanceRoutes";
import { daycareOverviewRoutes } from "./admin/daycareOverviewRoutes";
import { daycareRegistrationAdminRoutes } from "./admin/daycareRegistrationAdminRoutes";
import { daycareTaskRoutes } from "./admin/daycareTaskRoutes";
import { financeAdminRoutes } from "./admin/financeAdminRoutes";
import { generalAdminRoutes } from "./admin/generalAdminRoutes";

const router = Router();

router.use(generalAdminRoutes);
router.use(daycareOverviewRoutes);
router.use(daycareTaskRoutes);
router.use(daycareRegistrationAdminRoutes);
router.use(daycareDocumentRoutes);
router.use(daycareFinanceRoutes);
router.use(financeAdminRoutes);

export { router as adminRoutes };
