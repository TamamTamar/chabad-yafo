import express from "express";
import { sendRebbeLetterWhatsApp } from "../services/whatsapp";
import { createRebbeLetter } from "../services/rebbeLetterService";
import { sendRebbeLetterMail } from "../services/mail";

const router = express.Router();

const sendRebbeLetterNotifications = async (
    savedLetter: Awaited<ReturnType<typeof createRebbeLetter>>
) => {
    const notificationData = {
        fullName: savedLetter.fullName,
        motherName: savedLetter.motherName,
        phone: savedLetter.phone,
        email: savedLetter.email,
        letter: savedLetter.letter || "",
        occasion: savedLetter.occasion,
    };

    const results = await Promise.allSettled([
        sendRebbeLetterWhatsApp(notificationData),
        sendRebbeLetterMail({
            ...notificationData,
            wantsUpdates: savedLetter.wantsUpdates,
        }),
    ]);

    const [whatsAppResult, mailResult] = results;

    if (whatsAppResult.status === "rejected") {
        console.error("WHATSAPP ERROR:", whatsAppResult.reason);
    }

    if (mailResult.status === "rejected") {
        console.error("MAIL ERROR:", mailResult.reason);
    }
};

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

        const savedLetter = await createRebbeLetter({
            fullName,
            motherName,
            phone,
            email,
            letter,
            occasion,
            wantsUpdates,
        });

        void sendRebbeLetterNotifications(savedLetter);

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
