import assert from "node:assert/strict";
import test from "node:test";
import { Types } from "mongoose";
import { DAYCARE_ONBOARDING_AUDIT_ACTIONS } from "../config/daycareOnboardingAuditActions";
import { DAYCARE_ONBOARDING_STEP_DEFINITIONS } from "../config/daycareOnboardingDefaults";
import { DAYCARE_PARENT_DOCUMENTS_2026_2027 } from "../config/daycareParentDocuments";
import { DaycareChild } from "../models/DaycareChild";
import { DaycareAgreement } from "../models/DaycareAgreement";
import { DaycareAgreementVersion } from "../models/DaycareAgreementVersion";
import { DaycareEnrollment } from "../models/DaycareEnrollment";
import { DaycareFamily } from "../models/DaycareFamily";
import { DaycareHealthDeclaration } from "../models/DaycareHealthDeclaration";
import { DaycareOnboarding } from "../models/DaycareOnboarding";
import { DaycareOnboardingAudit } from "../models/DaycareOnboardingAudit";
import { DaycarePickupAuthorization } from "../models/DaycarePickupAuthorization";
import {
    isValidSchoolYear,
    parseAdminAccessPatch,
    parseAdminOverallStatusPatch,
    parseAdminStepPatch,
    parseCreateOnboardingFromInquiry,
    parseDeleteOnboarding,
    parseLegacyOnboardingImport,
    parsePublicDaycareProfile,
} from "../schemas/daycareOnboardingValidation";
import {
    applyAdminStepPatch,
    buildParentAccessUrl,
    calculateParentSubmissionProgress,
    calculateOnboardingProgress,
    calculateOverallStatus,
    canSubmitParentBundle,
    createDefaultOnboarding,
    getEffectiveOverallStatus,
    hashParentAccessToken,
    isParentAccessAllowed,
    isParentBundleSubmitted,
    isParentAccessTokenFormatValid,
    parentTokenMatchesHash,
    regenerateParentAccess,
    toPublicOnboardingDto,
} from "../services/daycareOnboardingService";
import { mapLegacyEnrollmentToIdentity } from "../services/legacyDaycareEnrollmentImportService";
import { buildDefaultAgreementDraft, hashAgreementContent, hashSignedAgreementSnapshot, ONLINE_AGREEMENT_ACCEPTANCE_STATEMENT } from "../services/daycareAgreementService";
import { createAgreementPdf, createParentDocumentPdf, createSignedAgreementPdf } from "../services/daycareAgreementPdfService";
import { isFatherCollectorForFamily } from "../services/daycarePickupAuthorizationService";
import { mergeGuardiansForSibling } from "../services/daycareOnboarding/publicFlow";
import { convertHealthImageUploadToPdf, createBlankHealthDeclarationPdf, createSignedHealthDeclarationPdf } from "../services/daycareHealthDeclarationPdfService";
import { convertPickupImageUploadToPdf, createBlankPickupAuthorizationPdf, createSignedPickupAuthorizationPdf } from "../services/daycarePickupAuthorizationPdfService";
import { hashParentDocumentBundle } from "../services/daycareParentDocumentService";
import { decryptDaycarePrivateValue, encryptDaycarePrivateValue, fingerprintDaycareIsraeliId, isValidIsraeliId, normalizeIsraeliId } from "../services/daycarePiiEncryptionService";
import type { IDaycareEnrollment } from "../types/daycareEnrollment";
import type {
    IDaycareOnboarding,
    IOnboardingStep,
} from "../types/daycareOnboarding";
import { legacyOnboardingStepKeys } from "../types/daycareOnboarding";

import {
    childId,
    createLegacyEnrollmentFixture,
    createOnboardingFixture,
    createdAt,
    familyId,
    legacyEnrollmentId,
    onboardingId,
    tokenA,
    tokenB,
    withDefaultTokenLifetime,
} from "./daycareOnboarding.fixtures";

test("legacy import maps only approved identity fields", () => {
    const identity = mapLegacyEnrollmentToIdentity(
        createLegacyEnrollmentFixture()
    );
    const serialized = JSON.stringify(identity);

    assert.deepEqual(identity.child, {
        firstName: "אורי",
        lastName: "כהן",
        birthDate: new Date("2024-01-01T00:00:00.000Z"),
    });
    assert.deepEqual(identity.guardians, [
        {
            fullName: "שרה כהן",
            role: "mother",
            phone: "0501234567",
            email: "sara@example.com",
        },
        {
            fullName: "דוד כהן",
            role: "father",
            phone: "0521234567",
            email: "david@example.com",
        },
    ]);
    assert.equal(serialized.includes("123456782"), false);
    assert.equal(serialized.includes("מידע רפואי"), false);
    assert.equal(serialized.includes("signature"), false);
    assert.equal(serialized.includes("payment"), false);
});

test("only a father collector is eligible to join the daycare family", () => {
    assert.equal(isFatherCollectorForFamily({
        fullName: "ישראל ישראלי",
        relationship: "אבא",
        relationshipType: "father",
        phone: "0501234567",
        israeliId: "123456782",
    }), true);
    assert.equal(isFatherCollectorForFamily({
        fullName: "שרה ישראלי",
        relationship: "סבתא",
        relationshipType: "other",
        phone: "0501234568",
        israeliId: "039999995",
    }), false);
});

test("linking a sibling merges submitted parents without removing an existing father", () => {
    const merged = mergeGuardiansForSibling(
        [
            { fullName: "רחל ישראלי", role: "mother", phone: "0501111111" },
            { fullName: "ישראל ישראלי", role: "father", phone: "0502222222" },
        ],
        [
            { fullName: "רחל ישראלי", role: "mother", phone: "0501111111", email: "rachel@example.com" },
        ]
    );

    assert.equal(merged.length, 2);
    assert.equal(merged.find((guardian) => guardian.role === "father")?.fullName, "ישראל ישראלי");
    assert.equal(merged.find((guardian) => guardian.role === "mother")?.email, "rachel@example.com");
});

test("deleting an onboarding requires the exact Hebrew confirmation phrase", () => {
    assert.deepEqual(parseDeleteOnboarding({ confirmation: "מחיקת תיק" }), {
        success: true,
        data: { confirmation: "מחיקת תיק" },
    });
    assert.equal(
        parseDeleteOnboarding({ confirmation: "מחיקה" }).success,
        false
    );
    assert.equal(
        parseDeleteOnboarding({ confirmation: "מחיקת תיק", force: true }).success,
        false
    );
});

test("validates the public child and guardian profile without accepting extra fields", () => {
    const validProfile = {
        child: {
            firstName: "יוסף יהודה",
            lastName: "תמם",
            birthDate: "2024-02-29",
        },
        guardians: [
            {
                fullName: "תמר תמם",
                role: "mother",
                phone: "0542193770",
                email: "TAMAR@example.com",
            },
            {
                fullName: "ישראל תמם",
                role: "other",
                roleDetails: "דוד ואפוטרופוס",
                phone: "+972-52-123-4567",
            },
        ],
        address: {
            city: "תל אביב-יפו",
            street: "יפת",
            houseNumber: "10",
            apartment: "2",
        },
    };
    const parsed = parsePublicDaycareProfile(
        validProfile,
        new Date("2026-07-13T12:00:00.000Z")
    );

    assert.equal(parsed.success, true);
    if (parsed.success) {
        assert.equal(parsed.data.guardians[0].email, "tamar@example.com");
        assert.equal(parsed.data.child.birthDate.toISOString().slice(0, 10), "2024-02-29");
    }
    assert.equal(
        parsePublicDaycareProfile({ ...validProfile, paymentApproved: true }).success,
        false
    );
    assert.equal(
        parsePublicDaycareProfile({
            ...validProfile,
            child: { ...validProfile.child, birthDate: "2030-01-01" },
        }).success,
        false
    );
    assert.equal(
        parsePublicDaycareProfile({
            ...validProfile,
            guardians: [{ ...validProfile.guardians[0], phone: "123" }],
        }).success,
        false
    );
});

test("new onboardings configure identity and agreement actions without broken future actions", () => {
    const { onboarding } = createOnboardingFixture();
    const identityStep = onboarding.steps.find(
        (step) => step.key === "childAndGuardianDetails"
    );
    const agreementStep = onboarding.steps.find(
        (step) => step.key === "agreementSigned"
    );
    const otherAvailableSteps = onboarding.steps.filter(
        (step) =>
            step.key !== "childAndGuardianDetails" &&
            step.key !== "agreementSigned" &&
            step.isAvailable
    );

    assert.equal(identityStep?.actionType, "openForm");
    assert.equal(identityStep?.isAvailable, true);
    assert.equal(agreementStep?.actionType, "openAgreement");
    assert.equal(agreementStep?.requiresAdminApproval, true);
    assert.equal(otherAvailableSteps.length, 0);
});
