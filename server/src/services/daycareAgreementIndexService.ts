import { DaycareAgreement } from "../models/DaycareAgreement";

const isLegacyUniqueOnboardingIndex = (index: {
    key: Record<string, unknown>;
    unique?: boolean;
}) =>
    index.unique === true &&
    index.key.onboardingId === 1 &&
    Object.keys(index.key).length === 1;

export const ensureDaycareAgreementIndexes = async () => {
    await DaycareAgreement.collection.updateMany(
        { revision: { $exists: false } },
        { $set: { revision: 1 } }
    );

    let indexes: Awaited<ReturnType<typeof DaycareAgreement.collection.indexes>> = [];
    try {
        indexes = await DaycareAgreement.collection.indexes();
    } catch (error: unknown) {
        const namespaceDoesNotExist =
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === 26;
        if (!namespaceDoesNotExist) throw error;
    }

    for (const index of indexes) {
        if (index.name && isLegacyUniqueOnboardingIndex(index)) {
            await DaycareAgreement.collection.dropIndex(index.name);
        }
    }

    await DaycareAgreement.createIndexes();
};
