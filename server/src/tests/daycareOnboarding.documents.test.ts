import assert from "node:assert/strict";
import test from "node:test";
import { Types } from "mongoose";
import { DAYCARE_ONBOARDING_AUDIT_ACTIONS } from "../config/daycareOnboardingAuditActions";
import { DAYCARE_ONBOARDING_STEP_DEFINITIONS } from "../config/daycareOnboardingDefaults";
import { DAYCARE_PARENT_DOCUMENTS_2026_2027 } from "../config/daycareParentDocuments";
import { inlinePdfContentDisposition, parentDocumentDownloadFilename } from "../controllers/daycareParentDocumentController";
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
import { hashParentDocumentBundle, normalizeParentDocumentBundle } from "../services/daycareParentDocumentService";
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
    assert.equal(bundle.documents.welcome.title, "ברוכים הבאים למעון חב״ד יפו");
    assert.deepEqual(bundle.documents.routine.items, [
        { time: "07:30-08:15", activity: "קבלת הילדים ומשחק בתיבות פעילות" },
        { time: "08:15-08:25", activity: "התארגנות לארוחת הבוקר" },
        { time: "08:25-08:45", activity: "ארוחת בוקר" },
        { time: "08:45-09:00", activity: "מפגש בוקר - תפילה ונושא נלמד" },
        { time: "09:00-09:30", activity: "משחקי הרכבה ופעילות חופשית" },
        { time: "09:30-10:00", activity: "פעילות בחצר, פרי ושתייה" },
        { time: "10:00-10:40", activity: "פעילות מונחית - יצירה, חומרים ומשחקי דמיון" },
        { time: "10:40-11:00", activity: "החתלות, היגיינה והתארגנות" },
        { time: "11:00-11:25", activity: "מוזיקה, תנועה ופעילות מוטורית" },
        { time: "11:25-12:00", activity: "ארוחת צהריים והתארגנות לשינה" },
        { time: "12:00-14:00", activity: "מנוחת צהריים" },
        { time: "14:00-14:40", activity: "השכמה, טיפוח אישי וארוחת מנחה" },
        { time: "14:40-16:00", activity: "פעילות רגועה - ספרים, סיפור, משחק ואיסוף הילדים" },
    ]);
    assert.doesNotMatch(JSON.stringify(bundle.documents), /ג׳ימבורי/);
    assert.equal(bundle.documents.holidays.items.length, 9);
    const hash = hashParentDocumentBundle(bundle);
    assert.match(hash, /^[a-f0-9]{64}$/);
    assert.notEqual(hash, hashParentDocumentBundle({ ...bundle, version: "2026-2027-v2" }));
    const [welcomePdf, routinePdf, holidaysPdf, equipmentPdf] = await Promise.all([
        createParentDocumentPdf(bundle, "welcome"),
        createParentDocumentPdf(bundle, "routine"),
        createParentDocumentPdf(bundle, "holidays"),
        createParentDocumentPdf(bundle, "equipment"),
    ]);
    assert.equal(welcomePdf.subarray(0, 5).toString("ascii"), "%PDF-");
    assert.equal(routinePdf.subarray(0, 5).toString("ascii"), "%PDF-");
    assert.equal(holidaysPdf.subarray(0, 5).toString("ascii"), "%PDF-");
    assert.equal(equipmentPdf.subarray(0, 5).toString("ascii"), "%PDF-");
    assert.ok(welcomePdf.length > 5000);
    assert.ok(routinePdf.length > 5000);
    assert.ok(holidaysPdf.length > 5000);
    assert.ok(equipmentPdf.length > 5000);
    assert.equal((routinePdf.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length, 1);

    const denseRoutinePdf = await createParentDocumentPdf({
        ...bundle,
        documents: {
            ...bundle.documents,
            routine: {
                ...bundle.documents.routine,
                items: [
                    ...bundle.documents.routine.items,
                    { time: "16:00–16:15", activity: "פעילות רגועה" },
                    { time: "16:15-16:30", activity: "משחק חופשי" },
                    { time: "16:30-16:45", activity: "איסוף הילדים" },
                ],
            },
        },
    }, "routine");
    assert.equal((denseRoutinePdf.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length, 1);
});

test("parent menu data supports daily meals and normalizes legacy rows", async () => {
    const normalized = normalizeParentDocumentBundle({
        ...DAYCARE_PARENT_DOCUMENTS_2026_2027,
        documents: {
            ...DAYCARE_PARENT_DOCUMENTS_2026_2027.documents,
            menu: {
                ...DAYCARE_PARENT_DOCUMENTS_2026_2027.documents.menu,
                items: [{ meal: "יום בדיקה", description: "ארוחת בוקר ישנה" }],
            },
        },
    });
    assert.deepEqual(normalized.documents.menu.items, [{ day: "יום בדיקה", breakfast: "ארוחת בוקר ישנה" }]);

    const bundle = {
        ...normalized,
        documents: {
            ...normalized.documents,
            menu: {
                ...normalized.documents.menu,
                items: [
                    { day: "יום ראשון", breakfast: "לחם וגבינה", lunch: "אורז ועדשים", afternoon: "פרי" },
                    { day: "יום קצר", breakfast: "לחמנייה" },
                ],
            },
        },
    };
    const menuPdf = await createParentDocumentPdf(bundle, "menu");
    assert.equal(menuPdf.subarray(0, 5).toString("ascii"), "%PDF-");
    assert.ok(menuPdf.length > 5000);
});

test("parent document downloads preserve Hebrew filenames", () => {
    const filenames = [
        ["ברוכים הבאים למעון חבד יפו.pdf", "daycare-welcome.pdf"],
        ["סדר יום מעון חבד יפו.pdf", "daycare-routine.pdf"],
        ["לוח חופשות מעון חבד יפו.pdf", "daycare-holidays.pdf"],
        ["ציוד אישי מה להביא למעון חבד יפו.pdf", "daycare-equipment.pdf"],
    ] as const;

    for (const [filename, fallbackFilename] of filenames) {
        const key = fallbackFilename.includes("welcome") ? "welcome" : fallbackFilename.includes("routine") ? "routine" : fallbackFilename.includes("holidays") ? "holidays" : "equipment";
        assert.equal(parentDocumentDownloadFilename(key, fallbackFilename), filename);
        const header = inlinePdfContentDisposition(filename, fallbackFilename);
        assert.match(header, new RegExp(`^inline; filename="${fallbackFilename}"; filename\\*=UTF-8''`));
        assert.equal(decodeURIComponent(header.split("filename*=UTF-8''")[1]), filename);
    }
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
    const input: Parameters<typeof createAgreementPdf>[0] = {
        version: "2026.1",
        schoolYear: "2026-2027",
        contentSnapshot: { format: "structured-v1", title: "הסכם בדיקה", intro: [], sections: [{ id: "section-1", title: "סעיף ראשון", blocks: [{ id: "paragraph-1", type: "paragraph", text: "תוכן ההסכם." }] }] },
    };
    const pdf = await createAgreementPdf(input);
    const reviewPdf = await createAgreementPdf(input, "review");
    assert.equal(pdf.subarray(0, 5).toString("ascii"), "%PDF-");
    assert.ok(pdf.length > 5000);
    assert.equal(pdf.includes(Buffer.from("localhost")), false);
    assert.equal(reviewPdf.subarray(0, 5).toString("ascii"), "%PDF-");
    assert.ok(reviewPdf.length > 5000);
    assert.equal(reviewPdf.includes(Buffer.from("localhost")), false);
    const pageCount = (bytes: Buffer) => (bytes.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length;
    assert.equal(pageCount(pdf), 2, "the regular PDF keeps its manual-signature page");
    assert.equal(pageCount(reviewPdf), 1, "the review PDF omits the manual-signature page");
});
