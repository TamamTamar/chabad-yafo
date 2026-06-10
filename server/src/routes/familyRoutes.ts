import { Router } from "express";
import { Family } from "../models/Family";
import { requireAdmin } from "../middleware/adminAuth";

const router = Router();

// Create a new family form submission
router.post("/", async (req, res) => {
    try {
        logger.log("📩 New family form submitted:", req.body);

        const family = await Family.create(req.body);

        return res.status(201).json({
            success: true,
            data: family,
        });
    } catch (error) {
        logger.error("❌ Failed to create family");

        if (error instanceof Error) {
            logger.error("Error name:", error.name);
            logger.error("Error message:", error.message);
        } else {
            logger.error("Unknown error:", error);
        }

        if ((error as any).code === 11000) {
            return res.status(409).json({
                success: false,
                message: "הטלפון הזה כבר רשום במערכת",
            });
        }

        return res.status(500).json({
            success: false,
            message: "אירעה שגיאה בשמירת הפרטים",
        });
    }
});


export { router as familyRoutes };