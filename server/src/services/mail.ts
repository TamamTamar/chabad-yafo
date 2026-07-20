import nodemailer from "nodemailer";
import { env } from "../config/env";

const occasionLabels: Record<string, string> = {
    general: "כללי",
    gimmel_tammuz: "ג׳ תמוז",
    yud_shevat: "י׳ שבט",
};

const assertMailConfigured = () => {
    const missing: string[] = [];
    if (!env.SMTP_HOST) missing.push("SMTP_HOST");
    if (!env.SMTP_PORT) missing.push("SMTP_PORT");
    if (!env.SMTP_USER) missing.push("SMTP_USER");
    if (!env.SMTP_PASS) missing.push("SMTP_PASS");
    if (!env.ADMIN_EMAIL) missing.push("ADMIN_EMAIL");

    if (missing.length) {
        throw new Error(`SMTP is not configured. Missing: ${missing.join(", ")}`);
    }
};

const createTransporter = () => {
    assertMailConfigured();

    return nodemailer.createTransport({
        host: env.SMTP_HOST!,
        port: env.SMTP_PORT!,
        secure: env.SMTP_SECURE,
        auth: {
            user: env.SMTP_USER!,
            pass: env.SMTP_PASS!,
        },
    });
};

export const sendShabbatRegistrationMail = async (args: {
    fullName: string;
    phone: string;
    email: string;
    adults: string;
    children?: string;
    notes?: string;
}) => {
    const transporter = createTransporter();

    const { fullName, phone, email, adults, children, notes } = args;

    const subject = `רישום חדש לסעודת שבת - ${fullName}`;

    const text =
        `📥 רישום חדש לסעודת שבת\n\n` +
        `שם מלא: ${fullName}\n` +
        `טלפון: ${phone}\n` +
        `אימייל: ${email}\n` +
        `מבוגרים: ${adults}\n` +
        `ילדים: ${children || "0"}\n` +
        `הערות: ${notes || "-"}\n`;

    await transporter.sendMail({
        from: `Chabad Yafo <${env.SMTP_USER!}>`,
        to: env.ADMIN_EMAIL!,
        replyTo: email,
        subject,
        text,
    });
};

export const sendRebbeLetterMail = async (args: {
    fullName: string;
    motherName?: string;
    phone?: string;
    email?: string;
    letter: string;
    occasion: string;
    wantsUpdates?: boolean;
}) => {
    const transporter = createTransporter();

    const {
        fullName,
        motherName,
        phone,
        email,
        letter,
        occasion,
        wantsUpdates,
    } = args;

    const subject = `מכתב חדש לרבי - ${fullName}`;

    const text =
        `✍️ מכתב חדש לרבי\n\n` +
        `סיבת כתיבה: ${occasionLabels[occasion] || "כללי"}\n` +
        `שם מלא: ${fullName}\n` +
        `שם האם: ${motherName || "-"}\n` +
        `טלפון: ${phone || "-"}\n` +
        `אימייל: ${email || "-"}\n` +
        `מעוניין/ת בעדכונים: ${wantsUpdates ? "כן" : "לא"}\n\n` +
        `תוכן המכתב:\n${letter || "-"}\n`;

    await transporter.sendMail({
        from: `Chabad Yafo <${env.SMTP_USER!}>`,
        to: env.ADMIN_EMAIL!,
        replyTo: email || undefined,
        subject,
        text,
    });
};
