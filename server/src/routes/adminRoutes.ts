import { Router } from "express";
import { Family } from "../models/Family";
import { requireAdmin } from "../middleware/adminAuth";

const router = Router();

router.get("/families", requireAdmin, async (_req, res) => {
    try {
        const families = await Family.find().sort({ createdAt: -1 });

        res.json({
            success: true,
            data: families,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to get families",
        });
    }
});

export { router as adminRoutes };