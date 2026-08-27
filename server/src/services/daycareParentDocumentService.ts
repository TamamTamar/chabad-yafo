import { createHash } from "node:crypto";
import { DAYCARE_EQUIPMENT_DOCUMENT, DAYCARE_PARENT_DOCUMENTS_2026_2027, DAYCARE_WELCOME_DOCUMENT, type DaycareParentDocumentBundle, type DaycareParentDocumentKey } from "../config/daycareParentDocuments";
import { DaycareAgreement } from "../models/DaycareAgreement";
import { DaycareOnboarding } from "../models/DaycareOnboarding";
import { DaycareParentDocumentYear } from "../models/DaycareParentDocumentYear";
import { DaycareAnnualPlan } from "../models/DaycareAnnualPlan";
import { createParentDocumentPdf } from "./daycareAgreementPdfService";
import { DaycareOnboardingServiceError, getPublicOnboardingDocumentByToken } from "./daycareOnboardingService";
import { syncAnnualPlanWithHolidays } from "./daycareAnnualPlanService";
import { logger } from "../utils/logger";

const cloneBundle = (bundle: DaycareParentDocumentBundle): DaycareParentDocumentBundle =>
    JSON.parse(JSON.stringify(bundle)) as DaycareParentDocumentBundle;

type LegacyCompatibleParentDocumentBundle = Omit<DaycareParentDocumentBundle, "documents"> & {
    documents: Omit<DaycareParentDocumentBundle["documents"], "welcome" | "menu" | "equipment"> & {
        welcome?: DaycareParentDocumentBundle["documents"]["welcome"];
        menu: Omit<DaycareParentDocumentBundle["documents"]["menu"], "items"> & {
            items: Array<{
                day?: string;
                breakfast?: string;
                lunch?: string;
                afternoon?: string;
                meal?: string;
                description?: string;
            }>;
        };
        equipment?: DaycareParentDocumentBundle["documents"]["equipment"];
    };
};

export const normalizeParentDocumentBundle = (value: LegacyCompatibleParentDocumentBundle): DaycareParentDocumentBundle => {
    const rawMenuItems = value.documents.menu.items as Array<{
        day?: string;
        breakfast?: string;
        lunch?: string;
        afternoon?: string;
        meal?: string;
        description?: string;
    }>;
    const menuItems = rawMenuItems.flatMap((item) => {
        const day = item.day?.trim() || item.meal?.trim();
        const breakfast = item.breakfast?.trim() || item.description?.trim();
        if (!day || !breakfast) return [];
        return [{
            day,
            breakfast,
            ...(item.lunch?.trim() ? { lunch: item.lunch.trim() } : {}),
            ...(item.afternoon?.trim() ? { afternoon: item.afternoon.trim() } : {}),
        }];
    });
    return cloneBundle({
        version: value.version,
        schoolYear: value.schoolYear,
        documents: {
            ...value.documents,
            welcome: value.documents.welcome
                ? value.documents.welcome
                : DAYCARE_WELCOME_DOCUMENT,
            menu: { ...value.documents.menu, items: menuItems },
            equipment: value.documents.equipment
                ? value.documents.equipment
                : DAYCARE_EQUIPMENT_DOCUMENT,
        },
    });
};

const bundleFromRecord = (record: InstanceType<typeof DaycareParentDocumentYear>): DaycareParentDocumentBundle =>
    normalizeParentDocumentBundle(record.toObject() as unknown as LegacyCompatibleParentDocumentBundle);

const adminDto = (record: InstanceType<typeof DaycareParentDocumentYear>) => ({
    ...bundleFromRecord(record),
    sharedDocumentKeys: record.sharedDocumentKeys ?? [],
    lockedAt: record.lockedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
});

export const getSharedParentDocumentKeys = async (schoolYear: string) => {
    await ensureDefaultParentDocumentYear();
    const record = await DaycareParentDocumentYear.findOne({ schoolYear }).select("sharedDocumentKeys");
    if (!record) throw new DaycareOnboardingServiceError("מסמכי ההורים לשנת הלימודים לא הוגדרו.", 404, "PARENT_DOCUMENTS_NOT_PUBLISHED");
    return record.sharedDocumentKeys ?? [];
};

export const updateParentDocumentSharingForAdmin = async (schoolYear: string, key: DaycareParentDocumentKey, shared: boolean) => {
    const update = shared ? { $addToSet: { sharedDocumentKeys: key } } : { $pull: { sharedDocumentKeys: key } };
    const record = await DaycareParentDocumentYear.findOneAndUpdate({ schoolYear }, update, { new: true, runValidators: true });
    if (!record) throw new DaycareOnboardingServiceError("מסמכי ההורים לשנת הלימודים לא הוגדרו.", 404, "PARENT_DOCUMENTS_NOT_PUBLISHED");
    return adminDto(record);
};

export const hashParentDocumentBundle = (bundle: DaycareParentDocumentBundle) =>
    createHash("sha256").update(JSON.stringify(bundle), "utf8").digest("hex");

export const ensureDefaultParentDocumentYear = async () => {
    const seed = cloneBundle(DAYCARE_PARENT_DOCUMENTS_2026_2027);
    const result = await DaycareParentDocumentYear.updateOne(
        { schoolYear: seed.schoolYear },
        { $setOnInsert: seed },
        { upsert: true }
    );
    await DaycareParentDocumentYear.updateMany(
        { sharedDocumentKeys: { $exists: false } },
        { $set: { sharedDocumentKeys: ["routine", "holidays", "menu"] } }
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
    if (agreement?.parentDocumentsSnapshot) {
        return normalizeParentDocumentBundle(agreement.parentDocumentsSnapshot as unknown as LegacyCompatibleParentDocumentBundle);
    }
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

const hasSignedAgreementsForSchoolYear = async (schoolYear: string) => {
    const onboardingIds = await DaycareOnboarding.find({ schoolYear }).distinct("_id");
    return Boolean(await DaycareAgreement.exists({
        onboardingId: { $in: onboardingIds },
        signedAt: { $exists: true },
    }));
};

export const unlockParentDocumentYearForAdmin = async (schoolYear: string) => {
    await ensureDefaultParentDocumentYear();
    const existing = await DaycareParentDocumentYear.findOne({ schoolYear });
    if (!existing) {
        throw new DaycareOnboardingServiceError("מסמכי ההורים לשנת הלימודים לא הוגדרו.", 404, "PARENT_DOCUMENTS_NOT_PUBLISHED");
    }
    if (await hasSignedAgreementsForSchoolYear(schoolYear)) {
        throw new DaycareOnboardingServiceError(
            "לא ניתן לשחרר את הנעילה כל עוד קיים הסכם חתום לשנת הלימודים הזו. יש למחוק תחילה את תיק הניסוי החתום.",
            409,
            "PARENT_DOCUMENTS_HAVE_SIGNED_AGREEMENTS"
        );
    }
    await DaycareParentDocumentYear.updateOne(
        { _id: existing._id },
        { $unset: { lockedAt: 1, lockedByAgreementId: 1 } }
    );
    // A signature can begin between the first check and the update. If it did,
    // restore the lock; if it begins after this check, the signing flow locks it.
    if (await hasSignedAgreementsForSchoolYear(schoolYear)) {
        await DaycareParentDocumentYear.updateOne(
            { _id: existing._id },
            { $set: { lockedAt: new Date() } }
        );
        throw new DaycareOnboardingServiceError(
            "הנעילה לא שוחררה משום שנמצאה חתימה פעילה לשנת הלימודים הזו.",
            409,
            "PARENT_DOCUMENTS_HAVE_SIGNED_AGREEMENTS"
        );
    }
    const unlocked = await DaycareParentDocumentYear.findById(existing._id);
    if (!unlocked) throw new Error("Parent document year disappeared while unlocking");
    return adminDto(unlocked);
};

export const saveParentDocumentYearForAdmin = async (schoolYear: string, documents: DaycareParentDocumentBundle["documents"]) => {
    const signedAgreement = await hasSignedAgreementsForSchoolYear(schoolYear);
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
    const annualPlanExists = await DaycareAnnualPlan.exists({ schoolYear });
    if (annualPlanExists) {
        try { await syncAnnualPlanWithHolidays(schoolYear, documents.holidays); }
        catch (error) { logger.error("Daycare annual plan holiday sync failed", error); }
    }
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
