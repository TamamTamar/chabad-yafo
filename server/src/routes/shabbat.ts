import { Router } from "express";
import { sendShabbatRegistrationMail } from "../services/mail";

const router = Router();

router.post("/api/shabbat-registrations", async (req, res) => {
    try {
        const { fullName, phone, email, adults, children, notes } = req.body;

        if (!fullName || fullName.trim().length < 2) {
            return res.status(400).json({ message: "Invalid fullName" });
        }
        if (!phone || phone.replace(/\D/g, "").length < 9) {
            return res.status(400).json({ message: "Invalid phone" });
        }
        if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
            return res.status(400).json({ message: "Invalid email" });
        }
        if (!adults || Number(adults) < 1) {
            return res.status(400).json({ message: "Invalid adults" });
        }

        await sendShabbatRegistrationMail({
            fullName,
            phone,
            email,
            adults,
            children,
            notes,
        });

        res.json({ ok: true });
    } catch (err) {
        console.error("MAIL ERROR:", err);
        res.status(500).json({ message: "Mail send failed" });
    }
});

export default router;
