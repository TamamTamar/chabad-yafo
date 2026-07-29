import assert from "node:assert/strict";
import test from "node:test";
import { defaultDaycareDonationCampaign } from "../config/daycareDonationDefaults";
import {
    areDaycareDonationPaymentsEnabled,
    DAYCARE_NEDARIM_OFFICIAL_VERIFICATION_IMPLEMENTED,
} from "../config/daycareDonationSecurity";
import { DaycareDonationDiagnostic } from "../models/DaycareDonationDiagnostic";
import { DaycareDonationRecord } from "../models/DaycareDonationRecord";
import {
    calculateDaycareDonationTotals,
    deriveDaycareDonationGoals,
} from "../services/daycareDonationService";

test("daycare donation defaults preserve the approved 100,000 ILS budget", () => {
    const categoryGoal = defaultDaycareDonationCampaign.categories.reduce(
        (total, category) => total + category.goal,
        0
    );

    assert.equal(categoryGoal, defaultDaycareDonationCampaign.goal);

    defaultDaycareDonationCampaign.categories.forEach((category) => {
        const itemGoal = defaultDaycareDonationCampaign.items
            .filter((item) => item.categoryId === category.id)
            .reduce((total, item) => total + item.goal, 0);

        assert.equal(itemGoal, category.goal);
    });
});

test("confirmed donation totals separate general and allocated donations", () => {
    const result = calculateDaycareDonationTotals([
        { amount: 180 },
        { amount: 360, itemId: "painting" },
        { amount: 770, itemId: "painting" },
        { amount: 500, itemId: "plumbing" },
    ]);

    assert.equal(result.raised, 1_810);
    assert.equal(result.generalRaised, 180);
    assert.equal(result.raisedByItem.get("painting"), 1_130);
    assert.equal(result.raisedByItem.get("plumbing"), 500);
});

test("campaign and category goals are derived from item goals", () => {
    const result = deriveDaycareDonationGoals(
        [
            { id: "building", goal: 999 },
            { id: "yard", goal: 999 },
        ],
        [
            { categoryId: "building", goal: 10_000 },
            { categoryId: "building", goal: 2_000 },
            { categoryId: "yard", goal: 3_700 },
        ]
    );

    assert.equal(result.categoryGoals.get("building"), 12_000);
    assert.equal(result.categoryGoals.get("yard"), 3_700);
    assert.equal(result.campaignGoal, 15_700);
});

test("provider transaction ID has a unique database index", () => {
    const index = DaycareDonationRecord.schema
        .indexes()
        .find(([fields]) => fields.externalTransactionId === 1);

    assert.ok(index);
    assert.equal(index[1].unique, true);
    assert.deepEqual(index[1].partialFilterExpression, {
        externalTransactionId: { $type: "string" },
    });
});

test("diagnostics have an automatic expiry index", () => {
    const index = DaycareDonationDiagnostic.schema
        .indexes()
        .find(([fields]) => fields.expiresAt === 1);

    assert.ok(index);
    assert.equal(index[1].expireAfterSeconds, 0);
});

test("manual donation requires source and note or reference", async () => {
    const missingEvidence = new DaycareDonationRecord({
        campaignSlug: "daycare-2026",
        source: "manual",
        status: "confirmed",
        amount: 180,
        receivedAt: new Date(),
    });
    await assert.rejects(() => missingEvidence.validate());

    const validManualDonation = new DaycareDonationRecord({
        campaignSlug: "daycare-2026",
        source: "manual",
        manualSource: "bank_transfer",
        reference: "BANK-123",
        enteredById: "primary-admin",
        enteredByLabel: "מנהל ראשי",
        status: "confirmed",
        amount: 180,
        receivedAt: new Date(),
    });
    await validManualDonation.validate();
});

test("real payments stay fail-closed until official provider verification exists", () => {
    const previous = process.env.DAYCARE_DONATIONS_PAYMENT_ENABLED;
    process.env.DAYCARE_DONATIONS_PAYMENT_ENABLED = "true";

    try {
        assert.equal(
            DAYCARE_NEDARIM_OFFICIAL_VERIFICATION_IMPLEMENTED,
            false
        );
        assert.equal(areDaycareDonationPaymentsEnabled(), false);
    } finally {
        if (previous === undefined) {
            delete process.env.DAYCARE_DONATIONS_PAYMENT_ENABLED;
        } else {
            process.env.DAYCARE_DONATIONS_PAYMENT_ENABLED = previous;
        }
    }
});
