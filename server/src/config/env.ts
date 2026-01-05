import dotenv from "dotenv";
dotenv.config();

const required = (key: string) => {
    const val = process.env[key];
    if (!val) throw new Error(`Missing env var: ${key}`);
    return val;
};

export const env = {
    PORT: Number(process.env.PORT ?? "4000"),

    CLIENT_ORIGIN: process.env.CLIENT_ORIGIN ?? "", // נעדיף להגדיר ב-Railway

    SMTP_HOST: required("SMTP_HOST"),
    SMTP_PORT: Number(required("SMTP_PORT")),
    SMTP_SECURE: process.env.SMTP_SECURE === "true",
    SMTP_USER: required("SMTP_USER"),
    SMTP_PASS: required("SMTP_PASS"),

    ADMIN_EMAIL: required("ADMIN_EMAIL"),
};
