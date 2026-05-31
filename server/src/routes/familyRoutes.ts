import { Router } from "express";
import { Family } from "../models/Family";

const router = Router();

router.post("/", async (req, res) => {
    try {
        const family = await Family.create(req.body);

        res.status(201).json({
            success: true,
            data: family,
        });
    } catch (error) {
        console.error(error);

        if ((error as any).code === 11000) {
            return res.status(409).json({
                success: false,
                message: "הטלפון הזה כבר רשום במערכת",
            });
        }

        res.status(500).json({
            success: false,
            message: "אירעה שגיאה בשמירת הפרטים",
        });
    }
});

export { router as familyRoutes };