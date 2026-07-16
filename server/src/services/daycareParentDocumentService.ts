import { createHash } from "node:crypto";
import { DAYCARE_PARENT_DOCUMENTS_2026_2027, type DaycareParentDocumentBundle, type DaycareParentDocumentKey } from "../config/daycareParentDocuments";
import { DaycareAgreement } from "../models/DaycareAgreement";
import { DaycareOnboarding } from "../models/DaycareOnboarding";
import { DaycareParentDocumentYear } from "../models/DaycareParentDocumentYear";
import { createParentDocumentPdf } from "./daycareAgreementPdfService";
import { DaycareOnboardingServiceError, getPublicOnboardingDocumentByToken } from "./daycareOnboardingService";

const cloneBundle = (bundle: DaycareParentDocumentBundle): DaycareParentDocumentBundle =>
    JSON.parse(JSON.stringify(bundle)) as DaycareParentDocumentBundle;

const bundleFromRecord = (record: InstanceType<typeof DaycareParentDocumentYear>): DaycareParentDocumentBundle => {
    const value = record.toObject();
    return cloneBundle({ version: value.version, schoolYear: value.schoolYear, documents: value.documents });
};

const adminDto = (record: InstanceType<typeof DaycareParentDocumentYear>) => ({
    ...bundleFromRecord(record),
    lockedAt: record.lockedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
});

export const hashParentDocumentBundle = (bundle: DaycareParentDocumentBundle) =>
    createHash("sha256").update(JSON.stringify(bundle), "utf8").digest("hex");

export const ensureDefaultParentDocumentYear = async () => {
    const seed = cloneBundle(DAYCARE_PARENT_DOCUMENTS_2026_2027);
    const result = await DaycareParentDocumentYear.updateOne(
        { schoolYear: seed.schoolYear },
        { $setOnInsert: seed },
        { upsert: true }
    );
    return result.upsertedCount === 1;
};

export const getPublishedParentDocumentBundle = async (schoolYear: string) => {
    await ensureDefaultParentDocumentYear();
    const record = await DaycareParentDocumentYear.findOne({ schoolYear });
    if (!record) {
        throw new DaycareOnboardingServiceError("מסמכי ההורים לשנת הלימודים לא הוגדרו.", 404, "PARENT_DOCUMENTS_NOT_PUBLISHED");
    }
    return bundleFromRecord(record);
};

export const getCurrentParentDocumentBundle = async () => {
    await ensureDefaultParentDocumentYear();
    const record = await DaycareParentDocumentYear.findOne().sort({ schoolYear: -1 });
    if (!record) throw new Error("No daycare parent document year is configured");
    return bundleFromRecord(record);
};

export const getParentDocumentBundleForToken = async (token: string, now = new Date()) => {
    const onboarding = await getPublicOnboardingDocumentByToken(token, now);
    const agreement = await DaycareAgreement.findOne({ onboardingId: onboarding._id }).sort({ revision: -1 }).select("+parentDocumentsSnapshot");
    if (agreement?.parentDocumentsSnapshot) return cloneBundle(agreement.parentDocumentsSnapshot);
    return getPublishedParentDocumentBundle(onboarding.schoolYear);
};

export const lockParentDocumentYear = async (schoolYear: string, now = new Date()) => {
    await ensureDefaultParentDocumentYear();
    await DaycareParentDocumentYear.updateOne(
        { schoolYear, lockedAt: { $exists: false } },
        { $set: { lockedAt: now } }
    );
    const record = await DaycareParentDocumentYear.findOne({ schoolYear });
    if (!record) throw new DaycareOnboardingServiceError("מסמכי ההורים לשנת הלימודים לא הוגדרו.", 409, "PARENT_DOCUMENTS_NOT_PUBLISHED");
    return bundleFromRecord(record);
};

export const listParentDocumentYearsForAdmin = async () => {
    await ensureDefaultParentDocumentYear();
    return (await DaycareParentDocumentYear.find().sort({ schoolYear: -1 })).map(adminDto);
};

export const saveParentDocumentYearForAdmin = async (schoolYear: string, documents: DaycareParentDocumentBundle["documents"]) => {
    const onboardingIds = await DaycareOnboarding.find({ schoolYear }).distinct("_id");
    const signedAgreement = await DaycareAgreement.exists({ onboardingId: { $in: onboardingIds }, signedAt: { $exists: true } });
    const existing = await DaycareParentDocumentYear.findOne({ schoolYear });
    if (existing?.lockedAt || signedAgreement) {
        if (existing && !existing.lockedAt) {
            await DaycareParentDocumentYear.collection.updateOne({ _id: existing._id }, { $set: { lockedAt: new Date() } });
        }
        throw new DaycareOnboardingServiceError("המסמכים נעולים משום שכבר קיימת חתימה לשנת הלימודים הזו.", 409, "PARENT_DOCUMENTS_LOCKED");
    }
    const version = `${schoolYear}-v1`;
    const record = await DaycareParentDocumentYear.findOneAndUpdate(
        { schoolYear, lockedAt: { $exists: false } },
        { $set: { documents }, $setOnInsert: { schoolYear, version } },
        { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    );
    return adminDto(record);
};

export const createParentDocumentDownload = async (bundle: DaycareParentDocumentBundle, key: DaycareParentDocumentKey) => {
    const source = bundle.documents[key];
    if (!source || (key === "menu" && bundle.documents.menu.items.length === 0)) {
        throw new DaycareOnboardingServiceError("המסמך עדיין לא פורסם.", 404, "PARENT_DOCUMENT_NOT_FOUND");
    }
    return { bytes: await createParentDocumentPdf(bundle, key), mimeType: "application/pdf", filename: source.filename };
};

export const backfillParentDocumentSnapshots = async () => {
    const agreements = await DaycareAgreement.find({ parentDocumentsSnapshot: { $exists: false } }).select("_id onboardingId");
    let updated = 0;
    for (const agreement of agreements) {
        const onboarding = await DaycareOnboarding.findById(agreement.onboardingId).select("schoolYear");
        if (!onboarding) continue;
        let snapshot: DaycareParentDocumentBundle;
        try { snapshot = await getPublishedParentDocumentBundle(onboarding.schoolYear); }
        catch { continue; }
        const result = await DaycareAgreement.collection.updateOne(
            { _id: agreement._id, parentDocumentsSnapshot: { $exists: false } },
            { $set: { parentDocumentsVersion: snapshot.version, parentDocumentsHash: hashParentDocumentBundle(snapshot), parentDocumentsSnapshot: snapshot } }
        );
        updated += result.modifiedCount;
    }
    return updated;
};
