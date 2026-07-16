import { Router } from "express";
import { requireAdmin } from "../../middleware/adminAuth";
import { DaycareRegistration } from "../../models/DaycareRegistration";
import { Family } from "../../models/Family";
import {
    getAllPayments,
    getAllRebbeLetters,
    isValidRebbeLetterStatus,
    updateRebbeLetterStatus,
} from "../../services/adminService";

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

router.get("/daycare-registrations", requireAdmin, async (_req, res) => {
    try {
        const registrations = await DaycareRegistration.find().sort({
            createdAt: -1,
        });

        return res.json({
            success: true,
            data: registrations,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to get daycare registrations",
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

router.get("/payments", requireAdmin, async (_req, res) => {
    try {
        const payments = await getAllPayments();

        return res.json({
            success: true,
            data: payments,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to get payments",
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

export { router as generalAdminRoutes };
