import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";
import type { IEncryptedPrivateValue } from "../types/daycareAgreement";
import { DaycareOnboardingServiceError } from "./daycareOnboardingService";

const getKeyVersion = () => process.env.DAYCARE_PII_ENCRYPTION_KEY_VERSION?.trim() || "v1";

const getEncryptionKey = () => {
    const encoded = process.env.DAYCARE_PII_ENCRYPTION_KEY?.trim();
    if (!encoded && process.env.NODE_ENV !== "production" && process.env.JWT_SECRET) {
        return createHash("sha256").update(`daycare-pii-development:${process.env.JWT_SECRET}`, "utf8").digest();
    }
    if (!encoded) {
        throw new DaycareOnboardingServiceError(
            "Online agreement signing is not configured",
            503,
            "AGREEMENT_SIGNING_NOT_CONFIGURED"
        );
    }
    const key = Buffer.from(encoded, "base64");
    if (key.length !== 32) {
        throw new DaycareOnboardingServiceError(
            "Online agreement signing is not configured",
            503,
            "AGREEMENT_SIGNING_NOT_CONFIGURED"
        );
    }
    return key;
};

export const isDaycarePiiEncryptionConfigured = () => {
    const encoded = process.env.DAYCARE_PII_ENCRYPTION_KEY?.trim();
    if (!encoded) return process.env.NODE_ENV !== "production" && Boolean(process.env.JWT_SECRET);
    try {
        return Buffer.from(encoded, "base64").length === 32;
    } catch {
        return false;
    }
};

export const encryptDaycarePrivateValue = (plaintext: string): IEncryptedPrivateValue => {
    const key = getEncryptionKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    return {
        algorithm: "aes-256-gcm",
        keyVersion: getKeyVersion(),
        iv: iv.toString("base64"),
        authTag: cipher.getAuthTag().toString("base64"),
        ciphertext: ciphertext.toString("base64"),
    };
};

export const decryptDaycarePrivateValue = (encrypted: IEncryptedPrivateValue) => {
    const decipher = createDecipheriv(
        "aes-256-gcm",
        getEncryptionKey(),
        Buffer.from(encrypted.iv, "base64")
    );
    decipher.setAuthTag(Buffer.from(encrypted.authTag, "base64"));
    return Buffer.concat([
        decipher.update(Buffer.from(encrypted.ciphertext, "base64")),
        decipher.final(),
    ]).toString("utf8");
};

export const fingerprintDaycareIsraeliId = (israeliId: string) =>
    createHmac("sha256", getEncryptionKey())
        .update(`daycare-signer-id:${israeliId}`, "utf8")
        .digest("hex");

export const normalizeIsraeliId = (value: string) => value.replace(/\D/g, "").padStart(9, "0");

export const isValidIsraeliId = (value: string) => {
    const normalized = normalizeIsraeliId(value);
    if (!/^\d{9}$/.test(normalized)) return false;
    const checksum = [...normalized].reduce((sum, character, index) => {
        const multiplied = Number(character) * ((index % 2) + 1);
        return sum + (multiplied > 9 ? multiplied - 9 : multiplied);
    }, 0);
    return checksum % 10 === 0;
};
