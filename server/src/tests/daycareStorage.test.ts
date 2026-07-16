import assert from "node:assert/strict";
import test from "node:test";
import { isDaycareStorageConfigured } from "../services/daycareStorageService";

const storageEnvironmentKeys = [
    "NODE_ENV",
    "BUCKET_ENDPOINT",
    "ENDPOINT",
    "AWS_ENDPOINT_URL",
    "BUCKET_ACCESS_KEY_ID",
    "ACCESS_KEY_ID",
    "AWS_ACCESS_KEY_ID",
    "BUCKET_SECRET_ACCESS_KEY",
    "SECRET_ACCESS_KEY",
    "AWS_SECRET_ACCESS_KEY",
    "BUCKET_NAME",
    "BUCKET",
    "AWS_S3_BUCKET_NAME",
] as const;

test("recognizes Railway AWS bucket variables in production", () => {
    const previousEnvironment = Object.fromEntries(
        storageEnvironmentKeys.map((key) => [key, process.env[key]])
    );

    try {
        for (const key of storageEnvironmentKeys) {
            delete process.env[key];
        }
        process.env.NODE_ENV = "production";

        assert.equal(isDaycareStorageConfigured(), false);

        process.env.AWS_ENDPOINT_URL = "https://example.storage.invalid";
        process.env.AWS_ACCESS_KEY_ID = "test-access-key";
        process.env.AWS_SECRET_ACCESS_KEY = "test-secret-key";
        process.env.AWS_S3_BUCKET_NAME = "test-bucket";

        assert.equal(isDaycareStorageConfigured(), true);
    } finally {
        for (const key of storageEnvironmentKeys) {
            const previousValue = previousEnvironment[key];
            if (previousValue === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = previousValue;
            }
        }
    }
});
