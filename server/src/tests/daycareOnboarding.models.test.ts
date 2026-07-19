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

test("creates valid minimal Family and Child identity documents without forbidden data", async () => {
    const family = new DaycareFamily({
        guardians: [
            {
                fullName: "שרה כהן",
                role: "mother",
                phone: "0501234567",
                email: "sara@example.com",
                israeliId: "must-be-discarded",
            },
        ],
        medical: "must-be-discarded",
    });
    const child = new DaycareChild({
        familyId,
        firstName: "אורי",
        lastName: "כהן",
        birthDate: new Date("2024-01-01T00:00:00.000Z"),
        israeliId: "must-be-discarded",
        legacySource: {
            type: "daycareEnrollment",
            recordId: legacyEnrollmentId,
        },
    });

    await family.validate();
    await child.validate();

    const familyJson = JSON.stringify(family.toObject());
    const childJson = JSON.stringify(child.toObject());
    assert.equal(familyJson.includes("israeliId"), false);
    assert.equal(familyJson.includes("medical"), false);
    assert.equal(childJson.includes("israeliId"), false);
    assert.equal(child.familyId.equals(familyId), true);
    assert.equal(child.legacySource?.recordId.equals(legacyEnrollmentId), true);
});

test("defines unique indexes for child/year, origin/year and legacy child source", async () => {
    type SchemaIndex = [
        Record<string, unknown>,
        {
            unique?: boolean;
            partialFilterExpression?: Record<string, unknown>;
        },
    ];
    const onboardingIndexes =
        DaycareOnboarding.schema.indexes() as SchemaIndex[];
    const childIndexes = DaycareChild.schema.indexes() as SchemaIndex[];
    const onboardingIndex = onboardingIndexes.find(
        ([fields]) =>
            fields.childId === 1 && fields.schoolYear === 1
    );
    const legacySourceIndex = childIndexes.find(
        ([fields]) =>
            fields["legacySource.type"] === 1 &&
            fields["legacySource.recordId"] === 1
    );
    const originIndex = onboardingIndexes.find(
        ([fields]) =>
            fields["origin.type"] === 1 &&
            fields["origin.recordId"] === 1 &&
            fields.schoolYear === 1
    );

    assert.ok(onboardingIndex);
    assert.equal(onboardingIndex[1].unique, true);
    assert.deepEqual(onboardingIndex[1].partialFilterExpression, {
        childId: { $exists: true },
    });
    assert.ok(originIndex);
    assert.equal(originIndex[1].unique, true);
    assert.ok(legacySourceIndex);
    assert.equal(legacySourceIndex[1].unique, true);

    const firstYear = new DaycareOnboarding(
        createOnboardingFixture(tokenA, "2026-2027").onboarding
    );
    const nextYear = new DaycareOnboarding(
        createOnboardingFixture(tokenB, "2027-2028").onboarding
    );
    await firstYear.validate();
    await nextYear.validate();
});

test("existing legacy step templates remain valid without migration", async () => {
    const templateStep = createOnboardingFixture().onboarding.steps[0];
    const legacySteps = legacyOnboardingStepKeys.map((key, index) => ({
        ...templateStep,
        key,
        order: index + 1,
    }));
    const document = new DaycareOnboarding({
        ...createOnboardingFixture().onboarding,
        steps: legacySteps,
    });

    await document.validate();
    assert.equal(document.steps[0].key, "initialRegistrationReceived");
});

test("schema rejects invalid school years and incomplete or duplicate step sets", async () => {
    const invalidYear = new DaycareOnboarding({
        ...createOnboardingFixture().onboarding,
        schoolYear: "2026-2029",
    });
    const incompleteSteps = new DaycareOnboarding({
        ...createOnboardingFixture().onboarding,
        steps: createOnboardingFixture().onboarding.steps.slice(0, -1),
    });
    const duplicateSteps = createOnboardingFixture().onboarding.steps.map(
        (step) => ({ ...step })
    );
    duplicateSteps[6] = {
        ...duplicateSteps[6],
        key: duplicateSteps[5].key,
    };
    const duplicateStepDocument = new DaycareOnboarding({
        ...createOnboardingFixture().onboarding,
        steps: duplicateSteps,
    });

    await assert.rejects(() => invalidYear.validate());
    await assert.rejects(() => incompleteSteps.validate());
    await assert.rejects(() => duplicateStepDocument.validate());
    assert.equal(isValidSchoolYear("2026-2027"), true);
    assert.equal(isValidSchoolYear("2026-2029"), false);
});

test("inquiry onboarding validation accepts an optional existing family link", () => {
    const parsed = parseCreateOnboardingFromInquiry({
        schoolYear: "2026-2027",
        internalNote: "הוחלט להתקדם לאחר שיחה",
    });

    assert.equal(parsed.success, true);
    assert.equal(
        parseCreateOnboardingFromInquiry({
            schoolYear: "2026-2027",
            existingFamilyId: familyId.toString(),
        }).success,
        true
    );
    assert.equal(
        parseCreateOnboardingFromInquiry({
            schoolYear: "2026-2027",
            existingFamilyId: "not-an-id",
        }).success,
        false
    );
    assert.equal(
        parseCreateOnboardingFromInquiry({
            firstName: "אורי",
            schoolYear: "2026-2027",
        }).success,
        false
    );
});

test("legacy import validation requires a consecutive school year and an explicit optional family", () => {
    assert.deepEqual(
        parseLegacyOnboardingImport({
            schoolYear: "2026-2027",
            existingFamilyId: familyId.toString(),
        }),
        {
            success: true,
            data: {
                schoolYear: "2026-2027",
                existingFamilyId: familyId.toString(),
            },
        }
    );
    assert.equal(
        parseLegacyOnboardingImport({ schoolYear: "2026-2029" })
            .success,
        false
    );
    assert.equal(
        parseLegacyOnboardingImport({
            schoolYear: "2026-2027",
            phone: "0501234567",
        }).success,
        false
    );
});

test("public profile serializes Mongoose address subdocuments without internal metadata", () => {
    const { onboarding } = createOnboardingFixture();
    const family = new DaycareFamily({
        guardians: [
            {
                fullName: "תמר תמם",
                role: "mother",
                phone: "0542193770",
            },
        ],
        address: {
            city: "תל אביב-יפו",
            street: "יפת",
            houseNumber: "10",
            apartment: "2",
        },
    });
    const child = new DaycareChild({
        familyId: family._id,
        firstName: "יוסף יהודה",
        lastName: "תמם",
        birthDate: new Date("2024-01-01T00:00:00.000Z"),
    });

    const serialized = JSON.stringify(
        toPublicOnboardingDto(onboarding, child, family)
    );
    const parsed = JSON.parse(serialized) as {
        profile?: { address?: { city?: string } };
    };

    assert.equal(parsed.profile?.address?.city, "תל אביב-יפו");
    assert.equal(serialized.includes("$__parent"), false);
    assert.equal(serialized.includes("$isNew"), false);
    assert.equal(serialized.includes("_doc"), false);
});

test("Mongoose serialization and selection protect the token hash", () => {
    const document = new DaycareOnboarding(
        createOnboardingFixture().onboarding
    );
    const serialized = JSON.stringify(document.toJSON());
    const tokenPath = DaycareOnboarding.schema.path(
        "parentAccessTokenHash"
    );

    assert.equal(serialized.includes("parentAccessTokenHash"), false);
    assert.equal(serialized.includes(hashParentAccessToken(tokenA)), false);
    assert.equal(tokenPath.options.select, false);
});

test("creates a valid immutable Audit entry without token material", async () => {
    const entry = new DaycareOnboardingAudit({
        onboardingId,
        actorType: "admin",
        actorLabel: "shared-admin",
        action: DAYCARE_ONBOARDING_AUDIT_ACTIONS.onboardingCreated,
        newValue: { schoolYear: "2026-2027" },
        createdAt,
    });
    const serialized = JSON.stringify(entry.toObject());

    await entry.validate();
    assert.equal(entry.actorLabel, "shared-admin");
    assert.equal(serialized.includes(tokenA), false);
    assert.equal(serialized.includes(hashParentAccessToken(tokenA)), false);
    assert.ok(
        Object.values(DAYCARE_ONBOARDING_AUDIT_ACTIONS).includes(
            "parentLinkRegenerated"
        )
    );
});

test("DaycareEnrollment remains a Legacy-only schema", () => {
    assert.equal(DaycareEnrollment.schema.path("onboarding"), undefined);
    assert.equal(DaycareChild.schema.path("israeliId"), undefined);
    assert.equal(
        DaycareOnboarding.schema.path("steps.attachments"),
        undefined
    );
});

test("future related records remain references rather than embedded form content", async () => {
    const { onboarding } = createOnboardingFixture();
    const step: IOnboardingStep = {
        ...onboarding.steps[3],
        relatedRecord: {
            type: "agreement",
            recordId: new Types.ObjectId(),
            formKey: "agreementForm",
            documentKey: "daycareAgreement",
        },
    };
    const document = new DaycareOnboarding({
        ...onboarding,
        steps: onboarding.steps.map((candidate) =>
            candidate.key === step.key ? step : candidate
        ),
    } satisfies IDaycareOnboarding);

    await document.validate();
    assert.equal(
        "content" in (document.steps[3].relatedRecord ?? {}),
        false
    );
});
