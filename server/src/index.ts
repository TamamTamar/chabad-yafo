import express, { Request, Response } from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN }));
app.use(express.json());

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

type ShabbatRegistration = {
    fullName: string;
    phone: string;
    email: string;
    adults: string;
    children?: string;
    notes?: string;
};

app.get("/health", (_req: Request, res: Response) => {
    res.json({ ok: true });
});

app.post("/api/shabbat-registrations", async (req: Request, res: Response) => {
    try {
        const { fullName, phone, email, adults, children, notes } =
            req.body as ShabbatRegistration;

        // Validation בסיסי
        if (!fullName || fullName.trim().length < 2) {
            return res.status(400).json({ message: "Invalid fullName" });
        }
        if (!phone || phone.replace(/\D/g, "").length < 9) {
            return res.status(400).json({ message: "Invalid phone" });
        }
        if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
            return res.status(400).json({ message: "Invalid email" });
        }

        const subject = `רישום חדש לסעודת שבת – ${fullName}`;

        const text =
            `📥 רישום חדש לסעודת שבת\n\n` +
            `שם מלא: ${fullName}\n` +
            `טלפון: ${phone}\n` +
            `אימייל: ${email}\n` +
            `מבוגרים: ${adults}\n` +
            `ילדים: ${children || "0"}\n` +
            `הערות: ${notes || "—"}\n`;

        await transporter.sendMail({
            from: `Chabad Yafo <${process.env.SMTP_USER}>`,
            to: process.env.ADMIN_EMAIL,
            replyTo: email,
            subject,
            text,
        });

        res.json({ ok: true });
    } catch (err) {
        console.error("MAIL ERROR:", err);
        res.status(500).json({ message: "Mail send failed" });
    }
});

app.listen(Number(process.env.PORT), () => {
    console.log(`📨 Mail server running on http://localhost:${process.env.PORT}`);
});
