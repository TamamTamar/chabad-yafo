import { DAYCARE_ONBOARDING_STEP_DEFINITIONS } from "../config/daycareOnboardingDefaults";
import { DaycareOnboarding } from "../models/DaycareOnboarding";

export const syncDaycareOnboardingStepTitles = async () => {
    const canonicalKeys = DAYCARE_ONBOARDING_STEP_DEFINITIONS.map(
        (definition) => definition.key
    );

    for (const definition of DAYCARE_ONBOARDING_STEP_DEFINITIONS) {
        // Canonical step metadata is immutable during normal application updates.
        // Limit this controlled migration to the current seven-step template so
        // older ten-step and legacy cases remain untouched.
        await DaycareOnboarding.collection.updateMany(
            {
                steps: { $size: canonicalKeys.length },
                "steps.key": { $all: canonicalKeys },
            },
            {
                $set: {
                    "steps.$[step].title": definition.title,
                    "steps.$[step].description": definition.description,
                    "steps.$[step].responsibleParty": definition.responsibleParty,
                    "steps.$[step].actionType": definition.actionType,
                    "steps.$[step].isAvailable": definition.isAvailable,
                    "steps.$[step].requiresAdminApproval": definition.requiresAdminApproval,
                    "steps.$[step].isVisibleToParent": definition.isVisibleToParent,
                    "steps.$[step].order": definition.order,
                },
            },
            { arrayFilters: [{ "step.key": definition.key }] }
        );
    }
};
