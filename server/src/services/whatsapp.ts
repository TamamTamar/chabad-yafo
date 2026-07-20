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
        `הערות: ${notes || "-"}`;

    await client.messages.create({
        from: env.TWILIO_WHATSAPP_FROM, // למשל: whatsapp:+14155238886
        to: env.ADMIN_WHATSAPP_TO,        // למשל: whatsapp:+9725XXXXXXXX
        body: text,
    });
};
export const sendRebbeLetterWhatsApp = async (args: {
    fullName: string;
    motherName?: string;
    phone?: string;
    email?: string;
    letter: string;
    occasion: string;
}) => {
    const {
        fullName,
        motherName,
        phone,
        email,
        letter,
        occasion,
    } = args;

    const occasionLabels: Record<string, string> = {
        general: "כללי",
        gimmel_tammuz: "ג׳ תמוז",
        yud_shevat: "י׳ שבט",
    };

    const text =
        `✍️ מכתב חדש לרבי\n\n` +
        `🎯 סיבת כתיבה: ${occasionLabels[occasion] || "כללי"}\n\n` +
        `👤 שם: ${fullName}\n` +
        `👩 שם האם: ${motherName || "-"}\n` +
        `📞 טלפון: ${phone || "-"}\n` +
        `📧 אימייל: ${email || "-"}\n\n` +
        `📝 תוכן המכתב:\n${letter}`;

    await client.messages.create({
        from: env.TWILIO_WHATSAPP_FROM,
        to: env.ADMIN_WHATSAPP_TO,
        body: text,
    });
};

export const sendDaycareRegistrationWhatsApp = async (args: {
    parentName: string;
    phone: string;
    email?: string;
    childName?: string;
    birthDate?: string;
    childAge?: string;
    requiredHours: string;
    requiredHoursOther?: string;
    fridayCare?: string;
    costApproval?: boolean;
    notes?: string;
}) => {
    const {
        parentName,
        phone,
        childAge,
        requiredHours,
        requiredHoursOther,
        notes,
    } = args;
    const requiredHoursText =
        requiredHours === "אחר" && requiredHoursOther
            ? `${requiredHours} - ${requiredHoursOther}`
            : requiredHours;

    const text =
        `🏫 רישום מוקדם חדש למעון בצפון יפו\n\n` +
        `👤 הורה: ${parentName}\n` +
        `📞 טלפון: ${phone}\n` +
        `👶 גיל הילד/ה: ${childAge || "-"}\n` +
        `שעות מועדפות: ${requiredHoursText}\n\n` +
        `הערות: ${notes || "-"}`;

    await client.messages.create({
        from: env.TWILIO_WHATSAPP_FROM,
        to: env.ADMIN_WHATSAPP_TO,
        body: text,
    });
};
