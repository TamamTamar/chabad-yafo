import { Router } from "express";
import { requireAdmin } from "../../middleware/adminAuth";
import { DaycareFinanceSettings } from "../../models/DaycareFinanceSettings";
import {
    getDaycareTaskActualCosts,
    getFinanceSettings,
    getFinanceUpdatePayload,
} from "./daycareAdminService";

const router = Router();

router.get("/daycare/finance", requireAdmin, async (_req, res) => {
    try {
        const [settings, taskActualCosts] = await Promise.all([
            getFinanceSettings(),
            getDaycareTaskActualCosts(),
        ]);

        return res.json({
            success: true,
            data: {
                ...settings.toObject(),
                taskActualCosts,
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to get daycare finance settings",
        });
    }
});

router.patch("/daycare/finance", requireAdmin, async (req, res) => {
    try {
        const currentSettings = await getFinanceSettings();
        const [settings, taskActualCosts] = await Promise.all([
            DaycareFinanceSettings.findByIdAndUpdate(
                currentSettings._id,
                getFinanceUpdatePayload(req.body),
                {
                    new: true,
                    runValidators: true,
                }
            ),
            getDaycareTaskActualCosts(),
        ]);

        return res.json({
            success: true,
            data: settings
                ? {
                      ...settings.toObject(),
                      taskActualCosts,
                  }
                : settings,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: "Failed to update daycare finance settings",
        });
    }
});

export { router as daycareFinanceRoutes };
