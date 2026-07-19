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

test("creates the simplified default steps and completes only onboardingOpened", () => {
    const { onboarding, rawToken } = createOnboardingFixture();

    assert.equal(rawToken, tokenA);
    assert.equal(onboarding.familyId, familyId);
    assert.equal(onboarding.childId, childId);
    assert.equal(onboarding.schoolYear, "2026-2027");
    assert.equal(onboarding.steps.length, 7);
    assert.deepEqual(
        onboarding.steps.map((step) => step.key),
        DAYCARE_ONBOARDING_STEP_DEFINITIONS.map(
            (definition) => definition.key
        )
    );

    const initialStep = onboarding.steps[0];
    assert.equal(initialStep.key, "onboardingOpened");
    assert.equal(initialStep.status, "completed");
    assert.equal(initialStep.source, "automatic");
    assert.equal(initialStep.responsibleParty, "automatic");
    assert.deepEqual(initialStep.completedAt, createdAt);
    assert.ok(
        onboarding.steps
            .slice(1)
            .every((step) => step.status === "notStarted")
    );
    assert.equal(
        onboarding.steps.find((step) => step.key === "childAndGuardianDetails")
            ?.isAvailable,
        true
    );
    assert.deepEqual(
        onboarding.steps.map((step) => step.key),
        [
            "onboardingOpened",
            "childAndGuardianDetails",
            "agreementSigned",
            "healthDeclarationSubmitted",
            "pickupAuthorizationSubmitted",
            "registrationFeeReceived",
            "registrationApproved",
        ]
    );
    assert.equal(
        onboarding.steps.find((step) => step.key === "registrationFeeReceived")
            ?.isVisibleToParent,
        true
    );
    assert.ok(
        onboarding.steps
            .filter(
                (step) =>
                    step.key !== "childAndGuardianDetails" &&
                    step.key !== "agreementSigned"
            )
            .every((step) => !step.isAvailable)
    );
    const agreementStep = onboarding.steps.find(
        (step) => step.key === "agreementSigned"
    );
    assert.equal(agreementStep?.actionType, "openAgreement");
    assert.equal(agreementStep?.isAvailable, true);
});

test("uses a 90-day parent link by default and stores only its hash", () => {
    const { onboarding, rawToken } = createOnboardingFixture();
    const expectedExpiry = new Date(
        createdAt.getTime() + 90 * 24 * 60 * 60 * 1000
    );

    assert.equal(
        onboarding.parentAccessTokenHash,
        hashParentAccessToken(rawToken)
    );
    assert.notEqual(onboarding.parentAccessTokenHash, rawToken);
    assert.deepEqual(onboarding.parentAccessTokenExpiresAt, expectedExpiry);
    assert.equal(onboarding.parentAccessEnabled, true);
});

test("builds parent links for the trusted admin origin", () => {
    assert.equal(
        buildParentAccessUrl(tokenA, "http://localhost:5173"),
        `http://localhost:5173/daycare/onboarding/${tokenA}`
    );
    assert.equal(
        buildParentAccessUrl(tokenA, "https://www.chabadyafo.org"),
        `https://www.chabadyafo.org/daycare/onboarding/${tokenA}`
    );
});

test("creates an incomplete onboarding without Family or Child", () => {
    const { onboarding } = withDefaultTokenLifetime(() =>
        createDefaultOnboarding(
            {
                schoolYear: "2026-2027",
                origin: {
                    type: "daycareRegistration",
                    recordId: legacyEnrollmentId,
                },
                temporaryParentName: "שרה כהן",
                temporaryParentPhone: "0501234567",
                temporaryChildAge: "שנתיים",
                profileStatus: "incomplete",
            },
            createdAt,
            tokenA
        )
    );

    assert.equal(onboarding.familyId, undefined);
    assert.equal(onboarding.childId, undefined);
    assert.equal(onboarding.profileStatus, "incomplete");
    assert.equal(onboarding.temporaryParentName, "שרה כהן");
    assert.equal(onboarding.steps[0].key, "onboardingOpened");
    assert.equal(onboarding.steps[0].status, "completed");
    assert.ok(onboarding.steps.slice(1).every((step) => step.status === "notStarted"));
});

test("validates, compares, revokes and expires parent tokens", () => {
    const { onboarding } = createOnboardingFixture();

    assert.equal(isParentAccessTokenFormatValid(tokenA), true);
    assert.equal(isParentAccessTokenFormatValid("too-short"), false);
    assert.equal(
        parentTokenMatchesHash(
            tokenA,
            onboarding.parentAccessTokenHash
        ),
        true
    );
    assert.equal(
        parentTokenMatchesHash(
            tokenB,
            onboarding.parentAccessTokenHash
        ),
        false
    );
    assert.equal(isParentAccessAllowed(onboarding, createdAt), true);

    onboarding.parentAccessEnabled = false;
    assert.equal(isParentAccessAllowed(onboarding, createdAt), false);

    onboarding.parentAccessEnabled = true;
    onboarding.parentAccessTokenExpiresAt = new Date(
        createdAt.getTime() - 1
    );
    assert.equal(isParentAccessAllowed(onboarding, createdAt), false);

    onboarding.parentAccessTokenExpiresAt = undefined;
    assert.equal(isParentAccessAllowed(onboarding, createdAt), false);
});

test("regenerating a link invalidates the previous token and resets access metadata", () => {
    const { onboarding } = createOnboardingFixture(tokenA);
    onboarding.parentAccessEnabled = false;
    onboarding.lastParentAccessAt = createdAt;
    const regeneratedAt = new Date("2026-07-14T09:00:00.000Z");
    const regenerated = withDefaultTokenLifetime(() =>
        regenerateParentAccess(onboarding, regeneratedAt, tokenB)
    );

    assert.equal(
        parentTokenMatchesHash(
            tokenA,
            regenerated.onboarding.parentAccessTokenHash
        ),
        false
    );
    assert.equal(
        parentTokenMatchesHash(
            tokenB,
            regenerated.onboarding.parentAccessTokenHash
        ),
        true
    );
    assert.equal(regenerated.onboarding.parentAccessEnabled, true);
    assert.equal(regenerated.onboarding.lastParentAccessAt, undefined);
    assert.deepEqual(
        regenerated.onboarding.parentAccessTokenExpiresAt,
        new Date(regeneratedAt.getTime() + 90 * 24 * 60 * 60 * 1000)
    );
    assert.equal(onboarding.parentAccessEnabled, false);
});

test("progress includes only visible required steps and rounds to an integer", () => {
    const { onboarding } = createOnboardingFixture();
    onboarding.steps[1].isVisibleToParent = false;
    onboarding.steps[2].status = "notRequired";
    onboarding.steps[4].status = "completed";

    assert.deepEqual(calculateOnboardingProgress(onboarding.steps), {
        completedSteps: 1,
        totalSteps: 4,
        percentage: 25,
    });
});

test("final parent submission progress includes only the four parent forms", () => {
    const { onboarding } = createOnboardingFixture();
    const parentStepKeys = new Set([
        "childAndGuardianDetails",
        "agreementSigned",
        "healthDeclarationSubmitted",
        "pickupAuthorizationSubmitted",
    ]);

    for (const step of onboarding.steps) {
        if (parentStepKeys.has(step.key)) {
            step.status = "pendingReview";
        } else {
            step.status = "notStarted";
        }
    }

    assert.deepEqual(calculateParentSubmissionProgress(onboarding.steps), {
        completedSteps: 4,
        totalSteps: 4,
        percentage: 100,
    });
    assert.equal(canSubmitParentBundle(onboarding.steps), true);
    assert.equal(isParentBundleSubmitted(onboarding), false);

    onboarding.parentSubmittedAt = new Date("2026-07-16T12:00:00.000Z");
    assert.equal(isParentBundleSubmitted(onboarding), true);
    onboarding.parentSubmittedAt = undefined;

    const agreementStep = onboarding.steps.find(
        (step) => step.key === "agreementSigned"
    );
    assert.ok(agreementStep);
    agreementStep.status = "requiresCorrection";
    assert.equal(canSubmitParentBundle(onboarding.steps), false);
    assert.equal(isParentBundleSubmitted(onboarding), false);
});

test("overall status distinguishes parent work, admin review and completion", () => {
    const { onboarding } = createOnboardingFixture();

    assert.equal(
        calculateOverallStatus(onboarding.steps),
        "waitingForParent"
    );

    for (const step of onboarding.steps) {
        if (
            step.responsibleParty === "parent" ||
            step.responsibleParty === "both"
        ) {
            step.status = "completed";
        }
    }

    assert.equal(
        calculateOverallStatus(onboarding.steps),
        "waitingForAdmin"
    );

    const parentStep = onboarding.steps.find(
        (step) => step.responsibleParty === "parent"
    );
    assert.ok(parentStep);
    parentStep.status = "pendingReview";
    assert.equal(
        calculateOverallStatus(onboarding.steps),
        "waitingForAdmin"
    );
    parentStep.status = "requiresCorrection";
    assert.equal(
        calculateOverallStatus(onboarding.steps),
        "waitingForParent"
    );

    for (const step of onboarding.steps) {
        step.status = "completed";
    }
    assert.equal(calculateOverallStatus(onboarding.steps), "completed");
});

test("an explicit overall status override wins and can be cleared", () => {
    const { onboarding } = createOnboardingFixture();
    onboarding.overallStatusOverride = "cancelled";
    assert.equal(getEffectiveOverallStatus(onboarding), "cancelled");

    onboarding.overallStatusOverride = undefined;
    assert.equal(
        getEffectiveOverallStatus(onboarding),
        "waitingForParent"
    );

    assert.deepEqual(parseAdminOverallStatusPatch({
        overallStatusOverride: "cancelled",
    }), {
        success: true,
        data: { overallStatusOverride: "cancelled" },
    });
    assert.deepEqual(parseAdminOverallStatusPatch({
        clearOverallStatusOverride: true,
    }), {
        success: true,
        data: { overallStatusOverride: null },
    });
});

test("admin step updates set completion metadata and reopening clears it", () => {
    const { onboarding } = createOnboardingFixture();
    const original = onboarding.steps[4];
    const completedAt = new Date("2026-07-15T10:00:00.000Z");
    const completed = applyAdminStepPatch(
        original,
        {
            status: "completed",
            source: "admin",
            responsibleParty: "both",
            isVisibleToParent: false,
            internalNote: "התקבל ונבדק",
            parentMessage: "השלב אושר",
            completedAt,
        },
        completedAt
    );

    assert.equal(completed.status, "completed");
    assert.equal(completed.source, "admin");
    assert.equal(completed.responsibleParty, "both");
    assert.equal(completed.isVisibleToParent, false);
    assert.equal(completed.internalNote, "התקבל ונבדק");
    assert.equal(completed.parentMessage, "השלב אושר");
    assert.deepEqual(completed.completedAt, completedAt);
    assert.equal(completed.updatedBy, "shared-admin");

    const reopened = applyAdminStepPatch(
        completed,
        { status: "notStarted", source: "admin" },
        new Date("2026-07-16T10:00:00.000Z")
    );
    assert.equal(reopened.completedAt, undefined);
});

test("validation rejects forged fields and prevents re-enabling a revoked link", () => {
    assert.equal(
        parseAdminStepPatch({
            key: "forgedKey",
            status: "completed",
        }).success,
        false
    );
    assert.equal(
        parseAdminStepPatch({
            status: "completed",
            updatedBy: "forged-admin",
        }).success,
        false
    );
    assert.equal(
        parseAdminStepPatch({ responsibleParty: "shared" }).success,
        false
    );
    assert.deepEqual(parseAdminAccessPatch({ enabled: false }), {
        success: true,
        data: { enabled: false },
    });
    assert.equal(parseAdminAccessPatch({ enabled: true }).success, false);
});

test("public DTO exposes only parent-safe fields and visible steps", () => {
    const { onboarding } = createOnboardingFixture();
    onboarding.steps[0].internalNote = "סוד פנימי לצוות";
    onboarding.steps[2].parentMessage = "התקבל ואושר";
    onboarding.steps[2].relatedRecord = {
        type: "agreement",
        recordId: new Types.ObjectId(),
        documentKey: "internal-document-key",
    };
    onboarding.steps[1].isVisibleToParent = false;
    onboarding.steps[1].internalNote = "סוד בשלב מוסתר";
    const publicDto = toPublicOnboardingDto(onboarding, {
        firstName: "אורי",
        lastName: "כהן",
    });
    const serialized = JSON.stringify(publicDto);

    assert.equal(publicDto.childName, "אורי כהן");
    assert.equal(publicDto.schoolYear, "2026-2027");
    assert.equal(publicDto.steps.length, 5);
    assert.equal(publicDto.steps[0].parentMessage, "התקבל ואושר");
    assert.equal(serialized.includes("internalNote"), false);
    assert.equal(serialized.includes("סוד פנימי"), false);
    assert.equal(serialized.includes("סוד בשלב מוסתר"), false);
    assert.equal(serialized.includes("parentAccessTokenHash"), false);
    assert.equal(serialized.includes("familyId"), false);
    assert.equal(serialized.includes("childId"), false);
    assert.equal(serialized.includes("recordId"), false);
    assert.equal(serialized.includes("documentKey"), false);
    assert.equal(serialized.includes("source"), false);
    assert.equal(serialized.includes("actionType"), false);
    assert.equal(serialized.includes("updatedBy"), false);
    assert.equal(serialized.includes("audit"), false);
});

test("parent flow keeps saved profile editable until the final submission", () => {
    const { onboarding } = createOnboardingFixture();
    const profileStep = onboarding.steps.find((step) => step.key === "childAndGuardianDetails");
    const agreementStep = onboarding.steps.find((step) => step.key === "agreementSigned");
    assert.ok(profileStep);
    assert.ok(agreementStep);
    profileStep.status = "completed";
    agreementStep.status = "pendingReview";

    const publicDto = toPublicOnboardingDto(onboarding);

    assert.equal(publicDto.canEditProfile, true);
    assert.equal(publicDto.parentSubmission.isSubmitted, false);
    assert.equal(publicDto.parentSubmission.canSubmit, false);
    assert.equal(publicDto.missingStepTitle, "בריאות והרשאות");
    assert.equal(
        publicDto.steps.find((step) => step.key === "pickupAuthorizationSubmitted")?.title,
        "מורשי איסוף"
    );

    for (const step of onboarding.steps) {
        if ([
            "childAndGuardianDetails",
            "agreementSigned",
            "healthDeclarationSubmitted",
            "pickupAuthorizationSubmitted",
        ].includes(step.key)) {
            step.status = "pendingReview";
        }
    }
    onboarding.parentSubmittedAt = createdAt;

    const submittedDto = toPublicOnboardingDto(onboarding);

    assert.equal(submittedDto.canEditProfile, false);
    assert.equal(submittedDto.parentSubmission.isSubmitted, true);
});
