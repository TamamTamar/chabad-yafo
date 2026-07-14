import { Types } from "mongoose";
import { DAYCARE_ONBOARDING_AUDIT_ACTIONS } from "../config/daycareOnboardingAuditActions";
import { DaycareChild } from "../models/DaycareChild";
import { DaycareEnrollment } from "../models/DaycareEnrollment";
import { DaycareFamily } from "../models/DaycareFamily";
import { DaycareOnboarding } from "../models/DaycareOnboarding";
import { DaycareOnboardingAudit } from "../models/DaycareOnboardingAudit";
import type { IDaycareEnrollment } from "../types/daycareEnrollment";
import type { IDaycareGuardian } from "../types/daycareFamily";
import {
    createDefaultOnboarding,
    DaycareOnboardingServiceError,
    toAdminOnboardingDetail,
} from "./daycareOnboardingService";

export interface LegacyEnrollmentIdentityImport {
    guardians: IDaycareGuardian[];
    child: {
        firstName: string;
        lastName: string;
        birthDate?: Date;
    };
}

export interface ImportLegacyEnrollmentOptions {
    enrollmentId: string;
    schoolYear: string;
    existingFamilyId?: string;
    now?: Date;
}

const optionalEmail = (value: string) => {
    const normalized = value.trim().toLowerCase();
    return normalized || undefined;
};

/**
 * Deliberately maps only the small identity subset approved for phase A.
 * It never imports Israeli IDs, health data, consent, signature or payment data.
 */
export const mapLegacyEnrollmentToIdentity = (
    enrollment: IDaycareEnrollment
): LegacyEnrollmentIdentityImport => ({
    guardians: [
        {
            fullName: enrollment.parents.motherName.trim(),
            role: "mother",
            phone: enrollment.parents.motherPhone.trim(),
            email: optionalEmail(enrollment.parents.motherEmail),
        },
        {
            fullName: enrollment.parents.fatherName.trim(),
            role: "father",
            phone: enrollment.parents.fatherPhone.trim(),
            email: optionalEmail(enrollment.parents.fatherEmail),
        },
    ].filter((guardian) => guardian.fullName && guardian.phone),
    child: {
        firstName: enrollment.child.firstName.trim(),
        lastName: enrollment.child.lastName.trim(),
        birthDate: enrollment.child.birthDate
            ? new Date(enrollment.child.birthDate)
            : undefined,
    },
});

const assertObjectId = (
    value: string,
    notFoundMessage: string,
    notFoundCode: string
) => {
    if (!Types.ObjectId.isValid(value)) {
        throw new DaycareOnboardingServiceError(
            notFoundMessage,
            404,
            notFoundCode
        );
    }
};

const isDuplicateKeyError = (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000;

export const importLegacyDaycareEnrollment = async ({
    enrollmentId,
    schoolYear,
    existingFamilyId,
    now = new Date(),
}: ImportLegacyEnrollmentOptions) => {
    assertObjectId(
        enrollmentId,
        "Legacy enrollment not found",
        "LEGACY_ENROLLMENT_NOT_FOUND"
    );

    if (existingFamilyId) {
        assertObjectId(
            existingFamilyId,
            "Daycare family not found",
            "DAYCARE_FAMILY_NOT_FOUND"
        );
    }

    const legacyEnrollment = await DaycareEnrollment.findById(
        enrollmentId
    ).exec();

    if (!legacyEnrollment) {
        throw new DaycareOnboardingServiceError(
            "Legacy enrollment not found",
            404,
            "LEGACY_ENROLLMENT_NOT_FOUND"
        );
    }

    const identity = mapLegacyEnrollmentToIdentity(legacyEnrollment);
    let child = await DaycareChild.findOne({
        "legacySource.type": "daycareEnrollment",
        "legacySource.recordId": legacyEnrollment._id,
    }).exec();
    let family = child
        ? await DaycareFamily.findById(child.familyId).exec()
        : null;
    let familyCreated = false;
    let childCreated = false;

    if (child && existingFamilyId && !child.familyId.equals(existingFamilyId)) {
        throw new DaycareOnboardingServiceError(
            "This legacy enrollment is already linked to a different family",
            409,
            "LEGACY_FAMILY_CONFLICT"
        );
    }

    if (child && !family) {
        throw new DaycareOnboardingServiceError(
            "The imported child is linked to a missing family",
            409,
            "DAYCARE_FAMILY_LINK_BROKEN"
        );
    }

    if (!child) {
        if (existingFamilyId) {
            family = await DaycareFamily.findById(existingFamilyId).exec();

            if (!family) {
                throw new DaycareOnboardingServiceError(
                    "Daycare family not found",
                    404,
                    "DAYCARE_FAMILY_NOT_FOUND"
                );
            }
        } else {
            family = await DaycareFamily.create({
                guardians: identity.guardians,
            });
            familyCreated = true;
        }

        try {
            child = await DaycareChild.create({
                familyId: family._id,
                ...identity.child,
                legacySource: {
                    type: "daycareEnrollment",
                    recordId: legacyEnrollment._id,
                },
            });
            childCreated = true;
        } catch (error: unknown) {
            if (!isDuplicateKeyError(error)) {
                throw error;
            }

            child = await DaycareChild.findOne({
                "legacySource.type": "daycareEnrollment",
                "legacySource.recordId": legacyEnrollment._id,
            }).exec();

            if (!child) {
                throw error;
            }

            family = await DaycareFamily.findById(child.familyId).exec();
            familyCreated = false;
            childCreated = false;
        }
    }

    if (!family || !child) {
        throw new DaycareOnboardingServiceError(
            "Failed to create daycare identity",
            500,
            "DAYCARE_IDENTITY_CREATION_FAILED"
        );
    }

    const existingOnboarding = await DaycareOnboarding.findOne({
        childId: child._id,
        schoolYear,
    }).exec();

    if (existingOnboarding) {
        return {
            created: false as const,
            data: toAdminOnboardingDetail(
                existingOnboarding,
                child,
                family
            ),
        };
    }

    const bundle = createDefaultOnboarding(
        {
            familyId: family._id,
            childId: child._id,
            schoolYear,
            origin: {
                type: "daycareEnrollment",
                recordId: legacyEnrollment._id,
            },
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

        const concurrentOnboarding = await DaycareOnboarding.findOne({
            childId: child._id,
            schoolYear,
        }).exec();

        if (!concurrentOnboarding) {
            throw error;
        }

        return {
            created: false as const,
            data: toAdminOnboardingDetail(
                concurrentOnboarding,
                child,
                family
            ),
        };
    }

    const adminAuditBase = {
        onboardingId: onboarding._id,
        actorType: "admin" as const,
        actorLabel: "shared-admin",
        createdAt: now,
    };
    const automaticAuditBase = {
        onboardingId: onboarding._id,
        actorType: "automatic" as const,
        actorLabel: "system",
        createdAt: now,
    };
    const auditEntries = [
        ...(familyCreated
            ? [
                  {
                      ...adminAuditBase,
                      action: DAYCARE_ONBOARDING_AUDIT_ACTIONS.familyCreated,
                      newValue: { familyId: family._id.toString() },
                  },
              ]
            : []),
        ...(childCreated
            ? [
                  {
                      ...adminAuditBase,
                      action: DAYCARE_ONBOARDING_AUDIT_ACTIONS.childCreated,
                      newValue: { childId: child._id.toString() },
                  },
              ]
            : []),
        {
            ...automaticAuditBase,
            action: DAYCARE_ONBOARDING_AUDIT_ACTIONS.onboardingCreated,
            newValue: { schoolYear },
        },
        {
            ...adminAuditBase,
            action: DAYCARE_ONBOARDING_AUDIT_ACTIONS.legacyImported,
            newValue: { legacyEnrollmentId: legacyEnrollment._id.toString() },
        },
        {
            ...automaticAuditBase,
            action: DAYCARE_ONBOARDING_AUDIT_ACTIONS.parentLinkCreated,
            newValue: {
                expiresAt: bundle.onboarding.parentAccessTokenExpiresAt,
            },
        },
    ];

    await DaycareOnboardingAudit.insertMany(auditEntries);

    return {
        created: true as const,
        data: toAdminOnboardingDetail(onboarding, child, family),
        rawToken: bundle.rawToken,
    };
};
