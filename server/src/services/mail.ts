import nodemailer from "nodemailer";
import { env } from "../config/env";



export const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
    },
});

export const sendShabbatRegistrationMail = async (args: {
    fullName: string;
    phone: string;
    email: string;
    adults: string;
    children?: string;
    notes?: string;
}) => {
    const { fullName, phone, email, adults, children, notes } = args;

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
        from: `Chabad Yafo <${env.SMTP_USER}>`,
        to: env.ADMIN_EMAIL,
        replyTo: email,
        subject,
        text,
    });
};
