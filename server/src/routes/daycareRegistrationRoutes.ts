import { Router } from "express";
import { DaycareRegistration } from "../models/DaycareRegistration";
import { sendDaycareRegistrationWhatsApp } from "../services/whatsapp";
import { logger } from "../utils/logger";

const router = Router();

router.post("/", async (req, res) => {
    try {
        const payload = {
            ...req.body,
            phone:
                typeof req.body.phone === "string"
                    ? req.body.phone.replace(/\D/g, "")
                    : req.body.phone,
        };
        const registration = await DaycareRegistration.create(payload);

        sendDaycareRegistrationWhatsApp(payload).catch((error) => {
            logger.error("❌ Failed to send daycare registration WhatsApp");
            logger.error(error);
        });

        return res.status(201).json({
            success: true,
            data: registration,
        });
    } catch (error) {
        logger.error("❌ Failed to create daycare registration");

        if (error instanceof Error) {
            logger.error("Error name:", error.name);
            logger.error("Error message:", error.message);
        }

        return res.status(400).json({
            success: false,
            message: "אירעה שגיאה בשמירת הפרטים. בדקו את השדות ונסו שוב.",
        });
    }
});

export { router as daycareRegistrationRoutes };
