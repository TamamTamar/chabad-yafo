import { DAYCARE_ONBOARDING_AUDIT_ACTIONS } from "../config/daycareOnboardingAuditActions";
import { DaycareOnboarding } from "../models/DaycareOnboarding";
import type { IDaycareOnboardingOrigin } from "../types/daycareOnboarding";
import {
    createAuditEntries,
    createDefaultOnboarding,
    getAdminOnboarding,
    toAdminOnboardingDetail,
} from "./daycareOnboardingService";

export interface CreateDaycareOnboardingFromInquiryInput {
    schoolYear: string;
    origin: IDaycareOnboardingOrigin;
    temporaryParentName: string;
    temporaryParentPhone: string;
    temporaryChildAge?: string;
    internalNote?: string;
}

const isDuplicateKeyError = (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000;

export const createDaycareOnboardingFromInquiry = async (
    input: CreateDaycareOnboardingFromInquiryInput,
    now = new Date()
) => {
    const existing = await DaycareOnboarding.findOne({
        "origin.type": input.origin.type,
        "origin.recordId": input.origin.recordId,
        schoolYear: input.schoolYear,
    }).exec();

    if (existing) {
        return {
            created: false as const,
            data: await getAdminOnboarding(existing.id),
        };
    }

    const bundle = createDefaultOnboarding(
        {
            schoolYear: input.schoolYear,
            origin: input.origin,
            temporaryParentName: input.temporaryParentName,
            temporaryParentPhone: input.temporaryParentPhone,
            temporaryChildAge: input.temporaryChildAge,
            profileStatus: "incomplete",
            internalNote: input.internalNote,
        },
        now
    );

    let onboarding;

    try {
        onboarding = await DaycareOnboarding.create(bundle.onboarding);
    } catch (error: unknown) {
        if (!isDuplicateKeyError(error)) {
            throw error;
        }

        const concurrent = await DaycareOnboarding.findOne({
            "origin.type": input.origin.type,
            "origin.recordId": input.origin.recordId,
            schoolYear: input.schoolYear,
        }).exec();

        if (!concurrent) {
            throw error;
        }

        return {
            created: false as const,
            data: await getAdminOnboarding(concurrent.id),
        };
    }

    const automaticBase = {
        onboardingId: onboarding._id,
        actorType: "automatic" as const,
        actorLabel: "system",
        createdAt: now,
    };

    await createAuditEntries([
        {
            ...automaticBase,
            action: DAYCARE_ONBOARDING_AUDIT_ACTIONS.onboardingCreated,
            newValue: {
                schoolYear: input.schoolYear,
                inquiryStatus: "רוצה להירשם",
                originType: input.origin.type,
                originRecordId: input.origin.recordId?.toString(),
                createdAt: now,
            },
        },
        {
            ...automaticBase,
            action: DAYCARE_ONBOARDING_AUDIT_ACTIONS.registrationSourceLinked,
            newValue: {
                type: input.origin.type,
                recordId: input.origin.recordId?.toString(),
            },
        },
        ...(input.internalNote
            ? [
                  {
                      onboardingId: onboarding._id,
                      actorType: "admin" as const,
                      actorLabel: "shared-admin",
                      action: DAYCARE_ONBOARDING_AUDIT_ACTIONS.internalNoteChanged,
                      newValue: input.internalNote,
                      createdAt: now,
                  },
              ]
            : []),
        {
            ...automaticBase,
            action: DAYCARE_ONBOARDING_AUDIT_ACTIONS.parentLinkCreated,
            newValue: {
                expiresAt: bundle.onboarding.parentAccessTokenExpiresAt,
            },
        },
    ]);

    return {
        created: true as const,
        data: toAdminOnboardingDetail(onboarding, null, null),
        rawToken: bundle.rawToken,
    };
};
