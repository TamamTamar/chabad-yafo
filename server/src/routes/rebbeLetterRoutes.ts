import express from "express";
import { createRebbeLetter } from "../services/rebbeLetterService";

const router = express.Router();

router.post("/", async (req, res) => {
    try {
        const {
            fullName,
            motherName,
            phone,
            email,
            letter,
            occasion,
            wantsUpdates,
        } = req.body;

        if (!fullName?.trim() || !motherName?.trim()) {
            return res.status(400).json({
                message: "שם מלא ושם האם הם שדות חובה",
            });
        }

        await createRebbeLetter({
            fullName,
            motherName,
            phone,
            email,
            letter,
            occasion,
            wantsUpdates,
        });

        return res.status(201).json({
            success: true,
            message: "המכתב נשמר בהצלחה",
        });
    } catch (error) {
        console.error("❌ Failed to save rebbe letter:", error);

        return res.status(500).json({
            success: false,
            message: "שגיאה בשמירת המכתב",
        });
    }
});

export { router as rebbeLetterRoutes };
