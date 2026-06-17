import { Router } from "express";
import { Family } from "../models/Family";
import { requireAdmin } from "../middleware/adminAuth";
import {

} from "../services/rebbeLetterService";
import { getAllRebbeLetters, isValidRebbeLetterStatus, updateRebbeLetterStatus } from "../services/adminService";

const router = Router();

router.get("/families", requireAdmin, async (_req, res) => {
    try {
        const families = await Family.find().sort({ createdAt: -1 });

        return res.json({
            success: true,
            data: families,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to get families",
        });
    }
});

router.get("/rebbe-letters", requireAdmin, async (_req, res) => {
    try {
        const letters = await getAllRebbeLetters();

        return res.json({
            success: true,
            data: letters,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to get rebbe letters",
        });
    }
});

router.patch("/rebbe-letters/:id/status", requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!isValidRebbeLetterStatus(status)) {
            return res.status(400).json({
                success: false,
                message: "סטטוס לא תקין",
            });
        }

        const updatedLetter = await updateRebbeLetterStatus(id, status);

        if (!updatedLetter) {
            return res.status(404).json({
                success: false,
                message: "המכתב לא נמצא",
            });
        }

        return res.json({
            success: true,
            data: updatedLetter,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "שגיאה בעדכון סטטוס",
        });
    }
});

export { router as adminRoutes };