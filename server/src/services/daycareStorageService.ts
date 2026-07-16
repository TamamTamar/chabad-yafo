import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { IStoredPrivateFile } from "../types/daycareAgreement";

type StoredFileInput = {
    bytes: Buffer;
    mimeType: string;
    originalName?: string;
    category: "signatures" | "signed-agreements" | "health-signatures" | "health-declarations" | "pickup-signatures" | "pickup-authorizations";
};

type StorageProvider = {
    provider: IStoredPrivateFile["provider"];
    upload(input: StoredFileInput): Promise<IStoredPrivateFile>;
    download(storageKey: string): Promise<Buffer>;
    delete(storageKey: string): Promise<void>;
};

const sha256 = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const extensionForMime = (mimeType: string) =>
    mimeType === "image/png" ? ".png" : mimeType === "application/pdf" ? ".pdf" : "";
const createStorageKey = (input: StoredFileInput) =>
    `daycare/${input.category}/${randomUUID()}${extensionForMime(input.mimeType)}`;

const getS3Configuration = () => {
    const endpoint =
        process.env.BUCKET_ENDPOINT ??
        process.env.ENDPOINT ??
        process.env.AWS_ENDPOINT_URL;
    const accessKeyId =
        process.env.BUCKET_ACCESS_KEY_ID ??
        process.env.ACCESS_KEY_ID ??
        process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey =
        process.env.BUCKET_SECRET_ACCESS_KEY ??
        process.env.SECRET_ACCESS_KEY ??
        process.env.AWS_SECRET_ACCESS_KEY;
    const bucket =
        process.env.BUCKET_NAME ??
        process.env.BUCKET ??
        process.env.AWS_S3_BUCKET_NAME;
    const region =
        process.env.BUCKET_REGION ??
        process.env.REGION ??
        process.env.AWS_DEFAULT_REGION ??
        "auto";
    return endpoint && accessKeyId && secretAccessKey && bucket
        ? { endpoint, accessKeyId, secretAccessKey, bucket, region }
        : null;
};

const createRailwayProvider = (): StorageProvider | null => {
    const config = getS3Configuration();
    if (!config) return null;
    const client = new S3Client({
        endpoint: config.endpoint,
        region: config.region,
        credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    });

    return {
        provider: "railway",
        async upload(input) {
            const storageKey = createStorageKey(input);
            await client.send(new PutObjectCommand({
                Bucket: config.bucket,
                Key: storageKey,
                Body: input.bytes,
                ContentType: input.mimeType,
                Metadata: { sha256: sha256(input.bytes) },
            }));
            return {
                provider: "railway",
                storageKey,
                originalName: input.originalName,
                mimeType: input.mimeType,
                size: input.bytes.length,
                sha256: sha256(input.bytes),
                createdAt: new Date(),
            };
        },
        async download(storageKey) {
            const response = await client.send(new GetObjectCommand({ Bucket: config.bucket, Key: storageKey }));
            if (!response.Body) throw new Error("Stored file is unavailable");
            return Buffer.from(await response.Body.transformToByteArray());
        },
        async delete(storageKey) {
            await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: storageKey }));
        },
    };
};

const localRoot = path.resolve(process.cwd(), "private-uploads");
const createLocalProvider = (): StorageProvider => ({
    provider: "local",
    async upload(input) {
        const storageKey = createStorageKey(input);
        const filePath = path.join(localRoot, storageKey);
        await mkdir(path.dirname(filePath), { recursive: true });
        await writeFile(filePath, input.bytes, { flag: "wx" });
        return {
            provider: "local",
            storageKey,
            originalName: input.originalName,
            mimeType: input.mimeType,
            size: input.bytes.length,
            sha256: sha256(input.bytes),
            createdAt: new Date(),
        };
    },
    async download(storageKey) {
        if (!/^daycare\/(signatures|signed-agreements|health-signatures|health-declarations|pickup-signatures|pickup-authorizations)\/[a-f0-9-]+\.(png|pdf)$/.test(storageKey)) {
            throw new Error("Invalid storage key");
        }
        return readFile(path.join(localRoot, storageKey));
    },
    async delete(storageKey) {
        if (!/^daycare\/(signatures|signed-agreements|health-signatures|health-declarations|pickup-signatures|pickup-authorizations)\/[a-f0-9-]+\.(png|pdf)$/.test(storageKey)) {
            throw new Error("Invalid storage key");
        }
        await unlink(path.join(localRoot, storageKey)).catch((error: NodeJS.ErrnoException) => {
            if (error.code !== "ENOENT") throw error;
        });
    },
});

export const getDaycareStorageProvider = () => {
    const railway = createRailwayProvider();
    if (railway) return railway;
    if (process.env.NODE_ENV === "production") {
        throw new Error("Private daycare storage is not configured");
    }
    return createLocalProvider();
};

export const isDaycareStorageConfigured = () =>
    Boolean(getS3Configuration()) || process.env.NODE_ENV !== "production";
