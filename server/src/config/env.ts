import dotenv from "dotenv";
dotenv.config();

const required = (key: string) => {
    const val = process.env[key];
    if (!val) throw new Error(`Missing env var: ${key}`);
    return val;
};

export const env = {
    PORT: Number(process.env.PORT ?? "4000"),
    CLIENT_ORIGIN: process.env.CLIENT_ORIGIN ?? "",

    // ✅ SMTP (optional)
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined,
    SMTP_SECURE: process.env.SMTP_SECURE === "true",
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,

    // ✅ Twilio WhatsApp (required)
    TWILIO_ACCOUNT_SID: required("TWILIO_ACCOUNT_SID"),
    TWILIO_AUTH_TOKEN: required("TWILIO_AUTH_TOKEN"),
    TWILIO_WHATSAPP_FROM: required("TWILIO_WHATSAPP_FROM"),
    ADMIN_WHATSAPP_TO: required("ADMIN_WHATSAPP_TO"),
};
