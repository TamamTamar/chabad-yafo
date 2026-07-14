import { DaycareOnboarding } from "../models/DaycareOnboarding";

const isLegacyChildYearIndex = (index: {
    key: Record<string, unknown>;
    partialFilterExpression?: Record<string, unknown>;
}) =>
    index.key.childId === 1 &&
    index.key.schoolYear === 1 &&
    Object.keys(index.key).length === 2 &&
    !index.partialFilterExpression;

export const ensureDaycareOnboardingIndexes = async () => {
    let indexes: Awaited<
        ReturnType<typeof DaycareOnboarding.collection.indexes>
    > = [];

    try {
        indexes = await DaycareOnboarding.collection.indexes();
    } catch (error: unknown) {
        const namespaceDoesNotExist =
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === 26;

        if (!namespaceDoesNotExist) {
            throw error;
        }
    }

    for (const index of indexes) {
        if (index.name && isLegacyChildYearIndex(index)) {
            await DaycareOnboarding.collection.dropIndex(index.name);
        }
    }

    await DaycareOnboarding.createIndexes();
};
