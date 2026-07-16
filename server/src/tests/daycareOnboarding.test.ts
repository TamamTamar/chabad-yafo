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
    calculateOnboardingProgress,
    calculateOverallStatus,
    createDefaultOnboarding,
    getEffectiveOverallStatus,
    hashParentAccessToken,
    isParentAccessAllowed,
    isParentAccessTokenFormatValid,
    parentTokenMatchesHash,
    regenerateParentAccess,
    toPublicOnboardingDto,
} from "../services/daycareOnboardingService";
import { mapLegacyEnrollmentToIdentity } from "../services/legacyDaycareEnrollmentImportService";
import { buildDefaultAgreementDraft, hashAgreementContent, hashSignedAgreementSnapshot, ONLINE_AGREEMENT_ACCEPTANCE_STATEMENT } from "../services/daycareAgreementService";
import { createAgreementPdf, createParentDocumentPdf, createSignedAgreementPdf } from "../services/daycareAgreementPdfService";
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

const createdAt = new Date("2026-07-13T09:00:00.000Z");
const familyId = new Types.ObjectId("64b000000000000000000001");
const childId = new Types.ObjectId("64b000000000000000000002");
const legacyEnrollmentId = new Types.ObjectId(
    "64b000000000000000000003"
);
const onboardingId = new Types.ObjectId("64b000000000000000000004");
const tokenA = "A".repeat(43);
const tokenB = "B".repeat(43);

const withDefaultTokenLifetime = <T>(callback: () => T): T => {
    const previousValue = process.env.DAYCARE_ONBOARDING_TOKEN_TTL_DAYS;
    delete process.env.DAYCARE_ONBOARDING_TOKEN_TTL_DAYS;

    try {
        return callback();
    } finally {
        if (previousValue === undefined) {
            delete process.env.DAYCARE_ONBOARDING_TOKEN_TTL_DAYS;
        } else {
            process.env.DAYCARE_ONBOARDING_TOKEN_TTL_DAYS = previousValue;
        }
    }
};

const createOnboardingFixture = (
    rawToken = tokenA,
    schoolYear = "2026-2027"
) =>
    withDefaultTokenLifetime(() =>
        createDefaultOnboarding(
            { familyId, childId, schoolYear },
            createdAt,
            rawToken
        )
    );

const createLegacyEnrollmentFixture = (): IDaycareEnrollment => ({
    child: {
        firstName: " אורי ",
        lastName: " כהן ",
        israeliId: "123456782",
        birthDate: new Date("2024-01-01T00:00:00.000Z"),
        gender: "male",
        address: "כתובת פרטית",
        homeLanguage: "עברית",
    },
    parents: {
        motherName: " שרה כהן ",
        motherPhone: "0501234567",
        motherEmail: "SARA@EXAMPLE.COM",
        motherIsraeliId: "123456782",
        fatherName: " דוד כהן ",
        fatherPhone: "0521234567",
        fatherEmail: "david@example.com",
        fatherIsraeliId: "123456782",
    },
    emergencyContacts: [
        { fullName: "אשת קשר", relation: "דודה", phone: "0531234567" },
        { fullName: "איש קשר", relation: "דוד", phone: "0541234567" },
    ],
    medical: {
        allergies: "מידע רפואי שאסור לייבא",
        healthFund: "כללית",
    },
    consents: {
        detailsCorrect: true,
        emergencyContact: true,
        medicalUpdateCommitment: true,
        daycareRules: true,
        registrationDeposit: true,
        monthlyTuition: true,
        internalPhotos: true,
        whatsappUpdates: true,
    },
    signature: {
        signerFullName: "שרה כהן",
        signedAt: createdAt,
        digitalSignatureConsent: true,
    },
    status: "submitted",
    createdAt,
    updatedAt: createdAt,
});

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

test("inquiry onboarding validation requires only school year and optional note", () => {
    const parsed = parseCreateOnboardingFromInquiry({
        schoolYear: "2026-2027",
        internalNote: "הוחלט להתקדם לאחר שיחה",
    });

    assert.equal(parsed.success, true);
    assert.equal(
        parseCreateOnboardingFromInquiry({
            firstName: "אורי",
            schoolYear: "2026-2027",
        }).success,
        false
    );
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

test("structured agreement hashes change when document fields change", () => {
    const document = { format: "structured-v1" as const, title: "כותרת", intro: [], sections: [{ id: "section-1", title: "סעיף", blocks: [{ id: "paragraph-1", type: "paragraph" as const, text: "תוכן" }] }] };
    const changed = { ...document, title: "כותרת אחרת" };
    const hash = hashAgreementContent(document);
    assert.notEqual(hash, hashAgreementContent(changed));
    assert.match(hash, /^[a-f0-9]{64}$/);
    const signedHash = hashSignedAgreementSnapshot({ documentKey: "daycareAgreement", version: "2026.1", schoolYear: "2026-2027", document });
    const changedTitleHash = hashSignedAgreementSnapshot({ documentKey: "daycareAgreement", version: "2026.1", schoolYear: "2026-2027", document: changed });
    assert.notEqual(signedHash, changedTitleHash);
});

test("default agreement seed creates one editable draft with a stable content hash", () => {
    const seed = buildDefaultAgreementDraft();
    assert.equal(seed.documentKey, "daycareAgreement");
    assert.equal(seed.schoolYear, "2026-2027");
    assert.equal(seed.version, "2026.01");
    assert.equal(seed.status, "draft");
    assert.ok(seed.title.length > 0);
    assert.equal(seed.format, "structured-v1");
    assert.equal(seed.sections.length, 13);
    assert.equal(seed.title, "הסכם התקשרות והתחייבות הורים");
    const serialized = JSON.stringify(seed);
    assert.equal(serialized.includes("טיוטה לעיון"), false);
    assert.equal(serialized.includes("⚖️"), false);
    assert.equal(serialized.includes("LchabadYaffo@gmail.com"), true);
    assert.equal(serialized.includes("נפרס ל־12 תשלומים"), true);
    assert.equal(serialized.includes("ביטוח ככל שנדרש"), false);
    assert.equal(serialized.includes("שם הורה 2"), false);
    assert.equal(serialized.includes("בחתימתם מאשרים ההורים"), true);
    const agreementVersionIndexes = DaycareAgreementVersion.schema.indexes() as Array<[
        Record<string, number>,
        { unique?: boolean },
    ]>;
    assert.equal(
        agreementVersionIndexes.some(([fields, options]) =>
            fields.documentKey === 1 && fields.schoolYear === 1 && Object.keys(fields).length === 2 && options.unique === true
        ),
        true
    );
    assert.equal(seed.contentHash, hashAgreementContent({ format: seed.format, title: seed.title, subtitle: seed.subtitle, intro: seed.intro, sections: seed.sections }));
});

test("online agreement signer IDs are validated, normalized and encrypted without plaintext", () => {
    const previousKey = process.env.DAYCARE_PII_ENCRYPTION_KEY;
    process.env.DAYCARE_PII_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
    try {
        assert.equal(normalizeIsraeliId("123456782"), "123456782");
        assert.equal(isValidIsraeliId("123456782"), true);
        assert.equal(isValidIsraeliId("123456789"), false);
        const first = encryptDaycarePrivateValue("123456782");
        const second = encryptDaycarePrivateValue("123456782");
        assert.equal(first.algorithm, "aes-256-gcm");
        assert.notEqual(first.ciphertext, second.ciphertext);
        assert.equal(JSON.stringify(first).includes("123456782"), false);
        assert.equal(decryptDaycarePrivateValue(first), "123456782");
        assert.equal(fingerprintDaycareIsraeliId("123456782"), fingerprintDaycareIsraeliId("123456782"));
    } finally {
        if (previousKey === undefined) delete process.env.DAYCARE_PII_ENCRYPTION_KEY;
        else process.env.DAYCARE_PII_ENCRYPTION_KEY = previousKey;
    }
});

test("health declarations keep medical payload private and generate a signed PDF", async () => {
    assert.equal(DaycareHealthDeclaration.schema.path("encryptedPayload").options.select, false);
    const indexes = DaycareHealthDeclaration.schema.indexes() as Array<[Record<string, number>, { unique?: boolean }]>;
    assert.equal(indexes.some(([fields, options]) => fields.onboardingId === 1 && fields.revision === 1 && options.unique === true), true);
    const signatureImage = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
    const pdf = await createSignedHealthDeclarationPdf({
        documentId: "health-test-document",
        revision: 1,
        schoolYear: "2026-2027",
        childName: "ילד בדיקה",
        payload: {
            healthCondition: "תקין",
            medicationSensitivities: "אין",
            healthFund: "כללית",
            hasAllergies: true,
            allergyDetails: "בוטנים",
            exposureInstructions: "לפעול לפי הנחיות ההורים והרופא",
            informationConfirmed: true,
            allergyResponsibilityAccepted: true,
            signedBy: "ישראל ישראלי",
            signerRole: "father",
        },
        contentHash: "b".repeat(64),
        signatureImage,
        submittedAt: createdAt,
    });
    assert.equal(pdf.subarray(0, 5).toString("ascii"), "%PDF-");
    assert.ok(pdf.length > 5000);
    const blankPdf = await createBlankHealthDeclarationPdf({ schoolYear: "2026-2027", childName: "ילד בדיקה" });
    assert.equal(blankPdf.subarray(0, 5).toString("ascii"), "%PDF-");
    assert.ok(blankPdf.length > 5000);
    const uploadedPhotoPdf = await convertHealthImageUploadToPdf(signatureImage, "image/png");
    assert.equal(uploadedPhotoPdf.subarray(0, 5).toString("ascii"), "%PDF-");
    assert.equal(DaycareHealthDeclaration.schema.path("signingMethod").options.enum.includes("uploadedFile"), true);
    assert.equal(DaycareHealthDeclaration.schema.path("signatureFile").options.required, undefined);
    assert.equal(DaycareHealthDeclaration.schema.path("signedPdfFile").options.required, undefined);
    assert.deepEqual(DaycareHealthDeclaration.schema.path("correctionDisposition").options.enum, ["preserveVersion", "discardFileAfterReplacement"]);
});

test("pickup authorizations keep collector IDs private and generate printable PDFs", async () => {
    assert.equal(DaycarePickupAuthorization.schema.path("encryptedPayload").options.select, false);
    const indexes = DaycarePickupAuthorization.schema.indexes() as Array<[Record<string, number>, { unique?: boolean }]>;
    assert.equal(indexes.some(([fields, options]) => fields.onboardingId === 1 && fields.revision === 1 && options.unique === true), true);
    const signatureImage = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
    const guardians = [{ fullName: "ישראל ישראלי", role: "father", phone: "0501234567" }];
    const payload = { guardians, collectors: [{ fullName: "שרה ישראלי", relationship: "סבתא", phone: "0521234567", israeliId: "123456782" }], informationConfirmed: true as const, signedBy: "ישראל ישראלי", signerRole: "father" as const };
    const signed = await createSignedPickupAuthorizationPdf({ documentId: "pickup-test", revision: 1, schoolYear: "2026-2027", childName: "ילד בדיקה", payload, contentHash: "c".repeat(64), signatureImage, submittedAt: createdAt });
    const blank = await createBlankPickupAuthorizationPdf({ schoolYear: "2026-2027", childName: "ילד בדיקה", guardians });
    const photo = await convertPickupImageUploadToPdf(signatureImage);
    assert.equal(signed.subarray(0, 5).toString("ascii"), "%PDF-");
    assert.equal(blank.subarray(0, 5).toString("ascii"), "%PDF-");
    assert.equal(photo.subarray(0, 5).toString("ascii"), "%PDF-");
    assert.ok(signed.length > 5000 && blank.length > 5000);
    assert.equal(DaycarePickupAuthorization.schema.path("signedPdfFile").options.required, undefined);
    assert.deepEqual(DaycarePickupAuthorization.schema.path("correctionDisposition").options.enum, ["preserveVersion", "discardFileAfterReplacement"]);
});

test("agreement private evidence fields are excluded from ordinary Mongoose queries", () => {
    assert.equal(DaycareAgreement.schema.path("signerIsraeliId").options.select, false);
    assert.equal(DaycareAgreement.schema.path("signerIsraeliIdFingerprint").options.select, false);
    assert.equal(DaycareAgreement.schema.path("ipAddress").options.select, false);
    assert.equal(DaycareAgreement.schema.path("contentSnapshot").options.select, false);
    assert.equal(DaycareAgreement.schema.path("parentDocumentsSnapshot").options.select, false);
    assert.deepEqual(DaycareAgreement.schema.path("correctionDisposition").options.enum, ["preserveVersion", "discardFileAfterReplacement"]);
    const agreementIndexes = DaycareAgreement.schema.indexes() as Array<[
        Record<string, number>,
        { unique?: boolean },
    ]>;
    assert.equal(
        agreementIndexes.some(
            ([fields, options]) =>
                fields.onboardingId === 1 &&
                fields.revision === 1 &&
                Object.keys(fields).length === 2 &&
                options.unique === true
        ),
        true
    );
    const agreement = new DaycareAgreement({
        onboardingId,
        versionId: new Types.ObjectId(),
    });
    assert.equal(agreement.revision, 1);
});

test("yearly parent documents have a stable version, hash and dynamic PDFs", async () => {
    const bundle = DAYCARE_PARENT_DOCUMENTS_2026_2027;
    assert.equal(bundle.schoolYear, "2026-2027");
    assert.equal(bundle.version, "2026-2027-v1");
    assert.equal(bundle.documents.routine.items.length, 18);
    assert.equal(bundle.documents.holidays.items.length, 9);
    const hash = hashParentDocumentBundle(bundle);
    assert.match(hash, /^[a-f0-9]{64}$/);
    assert.notEqual(hash, hashParentDocumentBundle({ ...bundle, version: "2026-2027-v2" }));
    const [routinePdf, holidaysPdf] = await Promise.all([
        createParentDocumentPdf(bundle, "routine"),
        createParentDocumentPdf(bundle, "holidays"),
    ]);
    assert.equal(routinePdf.subarray(0, 5).toString("ascii"), "%PDF-");
    assert.equal(holidaysPdf.subarray(0, 5).toString("ascii"), "%PDF-");
    assert.ok(routinePdf.length > 5000);
    assert.ok(holidaysPdf.length > 5000);
});

test("final signed agreement PDF includes a stable snapshot and is generated as a PDF", async () => {
    const signatureImage = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
    const pdf = await createSignedAgreementPdf({
        documentId: "test-document-id",
        documentKey: "daycareAgreement",
        version: "2026.1",
        schoolYear: "2026-2027",
        contentHash: "a".repeat(64),
        contentSnapshot: { format: "structured-v1", title: "הסכם בדיקה", intro: [], sections: [{ id: "section-1", title: "סעיף ראשון", blocks: [{ id: "paragraph-1", type: "paragraph", text: "תוכן ההסכם." }] }] },
        signedBy: "ישראל ישראלי",
        signerRole: "father",
        signerIsraeliId: "123456782",
        signatureImage,
        acceptedStatement: ONLINE_AGREEMENT_ACCEPTANCE_STATEMENT,
        signedAt: createdAt,
    });
    assert.equal(pdf.subarray(0, 5).toString("ascii"), "%PDF-");
    assert.ok(pdf.length > 5000);
});

test("downloadable agreement PDF is generated without browser headers or page URLs", async () => {
    const pdf = await createAgreementPdf({
        version: "2026.1",
        schoolYear: "2026-2027",
        contentSnapshot: { format: "structured-v1", title: "הסכם בדיקה", intro: [], sections: [{ id: "section-1", title: "סעיף ראשון", blocks: [{ id: "paragraph-1", type: "paragraph", text: "תוכן ההסכם." }] }] },
    });
    assert.equal(pdf.subarray(0, 5).toString("ascii"), "%PDF-");
    assert.ok(pdf.length > 5000);
    assert.equal(pdf.includes(Buffer.from("localhost")), false);
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

test("parent flow skips submitted reviews and admin-only steps", () => {
    const { onboarding } = createOnboardingFixture();
    const profileStep = onboarding.steps.find((step) => step.key === "childAndGuardianDetails");
    const agreementStep = onboarding.steps.find((step) => step.key === "agreementSigned");
    assert.ok(profileStep);
    assert.ok(agreementStep);
    profileStep.status = "pendingReview";
    agreementStep.status = "pendingReview";

    const publicDto = toPublicOnboardingDto(onboarding);

    assert.equal(publicDto.canEditProfile, false);
    assert.equal(publicDto.missingStepTitle, "בריאות והרשאות");
    assert.equal(
        publicDto.steps.find((step) => step.key === "pickupAuthorizationSubmitted")?.title,
        "מורשי איסוף"
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
