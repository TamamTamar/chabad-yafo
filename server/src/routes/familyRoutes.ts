import { Router } from "express";
import { Family } from "../models/Family";
import { requireAdmin } from "../middleware/adminAuth";

const router = Router();

// Create a new family form submission
router.post("/", async (req, res) => {
    try {
        console.log("📩 New family form submitted:", req.body);

        const family = await Family.create(req.body);

        return res.status(201).json({
            success: true,
            data: family,
        });
    } catch (error) {
        console.error("❌ Failed to create family");

        if (error instanceof Error) {
            console.error("Error name:", error.name);
            console.error("Error message:", error.message);
        } else {
            console.error("Unknown error:", error);
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