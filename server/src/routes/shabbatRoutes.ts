import { Router } from "express";
import { sendShabbatRegistrationWhatsApp } from "../services/whatsapp";

const router = Router();

router.post("/", async (req, res) => {
    try {
        const { fullName, phone, email, adults, children, notes } = req.body;

        if (!fullName || fullName.trim().length < 2) return res.status(400).json({ message: "Invalid fullName" });
        if (!phone || phone.replace(/\D/g, "").length < 9) return res.status(400).json({ message: "Invalid phone" });
        if (!email || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: "Invalid email" });
        if (!adults || Number(adults) < 1) return res.status(400).json({ message: "Invalid adults" });

        // ✅ אם הוואטסאפ נכשל → מחזירים 500 (כמו שרצית: בלי התראה אין רישום)
        await sendShabbatRegistrationWhatsApp({ fullName, phone, email, adults, children, notes });

        res.json({ ok: true });
    } catch (err) {
        console.error("WHATSAPP ERROR:", err);
        res.status(500).json({ message: "WhatsApp send failed" });
    }
});

export { router as shabbatRoutes };
