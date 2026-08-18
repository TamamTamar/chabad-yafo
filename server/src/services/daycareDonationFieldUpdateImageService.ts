import { createHash, randomUUID } from "node:crypto";
import { DaycareDonationFieldUpdateImage } from "../models/DaycareDonationFieldUpdateImage";
import { getDaycareStorageProvider } from "./daycareStorageService";

const mongoStoragePrefix = "mongo/daycare/campaign-updates/";

const extensionForMime = (mimeType: string) =>
    mimeType === "image/png"
        ? ".png"
        : mimeType === "image/jpeg"
          ? ".jpg"
          : mimeType === "image/webp"
            ? ".webp"
            : "";

export const isMongoFieldUpdateImage = (storageKey: string) =>
    storageKey.startsWith(mongoStoragePrefix);

export const uploadDaycareDonationFieldUpdateImage = async (input: {
    bytes: Buffer;
    mimeType: string;
    originalName?: string;
}) => {
    const storageKey = `${mongoStoragePrefix}${randomUUID()}${extensionForMime(input.mimeType)}`;
    const sha256 = createHash("sha256").update(input.bytes).digest("hex");
    const createdAt = new Date();

    await DaycareDonationFieldUpdateImage.create({
        storageKey,
        bytes: input.bytes,
        mimeType: input.mimeType,
        originalName: input.originalName,
        size: input.bytes.length,
        sha256,
        createdAt,
    });

    return {
        storageKey,
        mimeType: input.mimeType,
        originalName: input.originalName,
        size: input.bytes.length,
        sha256,
        createdAt,
    };
};

export const downloadDaycareDonationFieldUpdateImage = async (
    storageKey: string
) => {
    if (!isMongoFieldUpdateImage(storageKey)) {
        return getDaycareStorageProvider().download(storageKey);
    }

    const image = await DaycareDonationFieldUpdateImage.findOne({ storageKey })
        .select("+bytes");
    if (!image?.bytes) throw new Error("Field update image was not found");
    return Buffer.from(image.bytes);
};

export const deleteDaycareDonationFieldUpdateImage = async (
    storageKey: string
) => {
    if (!isMongoFieldUpdateImage(storageKey)) {
        await getDaycareStorageProvider().delete(storageKey);
        return;
    }
    await DaycareDonationFieldUpdateImage.deleteOne({ storageKey });
};
