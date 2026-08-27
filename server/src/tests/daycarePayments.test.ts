import assert from "node:assert/strict";
import test from "node:test";
import type { Request } from "express";
import { DaycareOnboarding } from "../models/DaycareOnboarding";
import { DaycarePayment } from "../models/DaycarePayment";
import {
    buildSignedDaycareCallbackUrl,
    isTrustedNedarimCallbackRequest,
    isValidDaycareDonationIntentSignature,
} from "../services/daycareDonationCallbackSecurity";

test("existing onboarding records receive stable tuition defaults", () => {
    const monthly = DaycareOnboarding.schema.path("monthlyTuitionAmount") as unknown as {
        options: { default: number; min: number };
    };
    const status = DaycareOnboarding.schema.path("standingOrderStatus") as unknown as {
        options: { default: string; enum: string[] };
    };

    assert.equal(monthly.options.default, 5500);
    assert.equal(monthly.options.min, 1);
    assert.equal(status.options.default, "pending");
    assert.deepEqual(status.options.enum, ["pending", "active"]);
});

test("tuition callbacks accept only the configured Nedarim source address", () => {
    const previousAllowedIps = process.env.NEDARIM_CALLBACK_ALLOWED_IPS;
    process.env.NEDARIM_CALLBACK_ALLOWED_IPS = "18.194.219.73,203.0.113.8";
    try {
        const trusted = {
            ip: "::ffff:18.194.219.73",
            socket: { remoteAddress: "::ffff:18.194.219.73" },
        } as unknown as Request;
        const untrusted = {
            ip: "198.51.100.20",
            socket: { remoteAddress: "198.51.100.20" },
        } as unknown as Request;

        assert.equal(isTrustedNedarimCallbackRequest(trusted), true);
        assert.equal(isTrustedNedarimCallbackRequest(untrusted), false);
    } finally {
        if (previousAllowedIps === undefined) delete process.env.NEDARIM_CALLBACK_ALLOWED_IPS;
        else process.env.NEDARIM_CALLBACK_ALLOWED_IPS = previousAllowedIps;
    }
});

test("daycare payments are logically separate and transaction IDs are unique", () => {
    const paymentType = DaycarePayment.schema.path("paymentType") as unknown as {
        options: { default: string; enum: string[]; immutable: boolean };
    };
    const providerPaymentType = DaycarePayment.schema.path("providerPaymentType") as unknown as {
        options: { default: string; enum: string[]; immutable: boolean };
    };
    const installments = DaycarePayment.schema.path("installments") as unknown as {
        options: { default: number; enum: number[]; immutable: boolean };
    };
    const transactionIndex = DaycarePayment.schema.indexes().find(
        ([fields]) => fields.externalTransactionId === 1
    );

    assert.equal(paymentType.options.default, "daycare_payment");
    assert.deepEqual(paymentType.options.enum, ["daycare_payment"]);
    assert.equal(paymentType.options.immutable, true);
    assert.equal(providerPaymentType.options.default, "HK");
    assert.deepEqual(providerPaymentType.options.enum, ["HK"]);
    assert.equal(installments.options.default, 12);
    assert.deepEqual(installments.options.enum, [12]);
    assert.equal(transactionIndex?.[1].unique, true);
});

test("tuition callbacks use an intent-specific signed URL", () => {
    const previousSecret = process.env.DAYCARE_DONATION_CALLBACK_SECRET;
    const previousPublicApiUrl = process.env.PUBLIC_API_URL;
    process.env.DAYCARE_DONATION_CALLBACK_SECRET = "test-tuition-secret";
    process.env.PUBLIC_API_URL = "https://api.example.org/api";
    try {
        const intentId = "tuition-intent-123";
        const request = {
            protocol: "https",
            get: () => "unused.example.org",
        } as unknown as Request;
        const result = buildSignedDaycareCallbackUrl(
            request,
            intentId,
            "daycare-payments/nedarim-callback"
        );

        assert.match(
            result.callbackUrl,
            /^https:\/\/api\.example\.org\/api\/daycare-payments\/nedarim-callback\//
        );
        assert.equal(
            isValidDaycareDonationIntentSignature(intentId, result.signature),
            true
        );
        assert.equal(
            isValidDaycareDonationIntentSignature("another-intent", result.signature),
            false
        );
    } finally {
        if (previousSecret === undefined) delete process.env.DAYCARE_DONATION_CALLBACK_SECRET;
        else process.env.DAYCARE_DONATION_CALLBACK_SECRET = previousSecret;
        if (previousPublicApiUrl === undefined) delete process.env.PUBLIC_API_URL;
        else process.env.PUBLIC_API_URL = previousPublicApiUrl;
    }
});
