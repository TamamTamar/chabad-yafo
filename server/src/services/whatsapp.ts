import twilio from "twilio";
import { env } from "../config/env";

const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

export const sendShabbatRegistrationWhatsApp = async (args: {
    fullName: string;
    phone: string;
    email: string;
    adults: string;
    children?: string;
    notes?: string;
}) => {
    const { fullName, phone, email, adults, children, notes } = args;

    const text =
        `📥 רישום חדש לסעודת שבת\n` +
        `שם: ${fullName}\n` +
        `טלפון: ${phone}\n` +
        `אימייל: ${email}\n` +
        `מבוגרים: ${adults}\n` +
        `ילדים: ${children || "0"}\n` +
        `הערות: ${notes || "—"}`;

    await client.messages.create({
        from: env.TWILIO_WHATSAPP_FROM, // למשל: whatsapp:+14155238886
        to: env.ADMIN_WHATSAPP_TO,        // למשל: whatsapp:+9725XXXXXXXX
        body: text,
    });
};
