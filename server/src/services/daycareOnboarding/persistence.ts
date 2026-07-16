import { Types, startSession } from "mongoose";
import { DaycareAgreement } from "../../models/DaycareAgreement";
import { DaycareChild } from "../../models/DaycareChild";
import { DaycareFamily } from "../../models/DaycareFamily";
import { DaycareHealthDeclaration } from "../../models/DaycareHealthDeclaration";
import { DaycareOnboarding } from "../../models/DaycareOnboarding";
import { DaycareOnboardingAudit } from "../../models/DaycareOnboardingAudit";
import { DaycarePickupAuthorization } from "../../models/DaycarePickupAuthorization";
import { DaycareRegistration } from "../../models/DaycareRegistration";
import type { AdminOnboardingListItemDto, IDaycareOnboarding } from "../../types/daycareOnboarding";
import { logger } from "../../utils/logger";
import { getDaycareStorageProvider } from "../daycareStorageService";
import {
    calculateOnboardingProgress,
    cloneDate,
    DaycareOnboardingServiceError,
    getEffectiveOverallStatus,
    isParentBundleSubmitted,
} from "./core";
import { getMissingStepTitle, toAdminOnboardingDetail } from "./dto";

const assertValidObjectId = (
    id: string,
    message: string,
    code: string
) => {
    if (!Types.ObjectId.isValid(id)) {
        throw new DaycareOnboardingServiceError(message, 404, code);
    }
};

export const getOnboardingOrThrow = async (
    onboardingId: string,
    includeTokenHash = false
) => {
    assertValidObjectId(
        onboardingId,
        "Onboarding not found",
        "ONBOARDING_NOT_FOUND"
    );

    const query = DaycareOnboarding.findById(onboardingId);

    if (includeTokenHash) {
        query.select("+parentAccessTokenHash");
    }

    const onboarding = await query.exec();

    if (!onboarding) {
        throw new DaycareOnboardingServiceError(
            "Onboarding not found",
            404,
            "ONBOARDING_NOT_FOUND"
        );
    }

    return onboarding;
};

export const getIdentityOrThrow = async (
    onboarding: Pick<IDaycareOnboarding, "childId" | "familyId">
) => {
    const [child, family] = await Promise.all([
        onboarding.childId
            ? DaycareChild.findById(onboarding.childId).exec()
            : Promise.resolve(null),
        onboarding.familyId
            ? DaycareFamily.findById(onboarding.familyId).exec()
            : Promise.resolve(null),
    ]);

    if ((onboarding.childId && !child) || (onboarding.familyId && !family)) {
        throw new DaycareOnboardingServiceError(
            "Onboarding identity is unavailable",
            409,
            "ONBOARDING_IDENTITY_UNAVAILABLE"
        );
    }

    if (child && family && !child.familyId.equals(family._id)) {
        throw new DaycareOnboardingServiceError(
            "Onboarding identity is inconsistent",
            409,
            "ONBOARDING_IDENTITY_INCONSISTENT"
        );
    }

    return { child, family };
};

export const getAdminOnboarding = async (onboardingId: string) => {
    const onboarding = await getOnboardingOrThrow(onboardingId);
    const { child, family } = await getIdentityOrThrow(onboarding);
    return toAdminOnboardingDetail(onboarding, child, family);
};

type OnboardingStoredFileRecord = {
    signatureFile?: { storageKey?: string };
    signedPdfFile?: { storageKey?: string };
};

const storedFileKeys = (records: OnboardingStoredFileRecord[]) =>
    records.flatMap((record) => [
        record.signatureFile?.storageKey,
        record.signedPdfFile?.storageKey,
    ]).filter((key): key is string => Boolean(key));

export const deleteDaycareOnboarding = async (onboardingId: string) => {
    if (!Types.ObjectId.isValid(onboardingId)) {
        throw new DaycareOnboardingServiceError(
            "תיק ההצטרפות לא נמצא.",
            404,
            "ONBOARDING_NOT_FOUND"
        );
    }

    const onboarding = await DaycareOnboarding.findById(onboardingId).exec();
    if (!onboarding) {
        throw new DaycareOnboardingServiceError(
            "תיק ההצטרפות לא נמצא.",
            404,
            "ONBOARDING_NOT_FOUND"
        );
    }
    if (
        onboarding.origin?.type !== "daycareRegistration" ||
        !onboarding.origin.recordId
    ) {
        throw new DaycareOnboardingServiceError(
            "אפשר למחוק מכאן רק תיק בדיקה שנפתח מטופס רישום.",
            409,
            "ONBOARDING_DELETE_NOT_ALLOWED"
        );
    }

    const [agreements, healthDeclarations, pickupAuthorizations] = await Promise.all([
        DaycareAgreement.find({ onboardingId: onboarding._id })
            .select("signatureFile signedPdfFile")
            .lean<OnboardingStoredFileRecord[]>()
            .exec(),
        DaycareHealthDeclaration.find({ onboardingId: onboarding._id })
            .select("signatureFile signedPdfFile")
            .lean<OnboardingStoredFileRecord[]>()
            .exec(),
        DaycarePickupAuthorization.find({ onboardingId: onboarding._id })
            .select("signatureFile signedPdfFile")
            .lean<OnboardingStoredFileRecord[]>()
            .exec(),
    ]);
    const fileKeys = Array.from(new Set(storedFileKeys([
        ...agreements,
        ...healthDeclarations,
        ...pickupAuthorizations,
    ])));

    let childDeleted = false;
    let familyDeleted = false;
    const session = await startSession();
    try {
        await session.withTransaction(async () => {
            const current = await DaycareOnboarding.findById(onboarding._id)
                .session(session)
                .exec();
            if (!current) {
                throw new DaycareOnboardingServiceError(
                    "תיק ההצטרפות לא נמצא.",
                    404,
                    "ONBOARDING_NOT_FOUND"
                );
            }
            if (
                current.origin?.type !== "daycareRegistration" ||
                !current.origin.recordId
            ) {
                throw new DaycareOnboardingServiceError(
                    "אפשר למחוק מכאן רק תיק בדיקה שנפתח מטופס רישום.",
                    409,
                    "ONBOARDING_DELETE_NOT_ALLOWED"
                );
            }

            const registration = await DaycareRegistration.findOneAndUpdate(
                { _id: current.origin.recordId },
                {
                    $set: { status: "רוצה להירשם" },
                    $unset: { daycareFamilyId: 1, daycareChildId: 1 },
                },
                { new: true, session }
            ).exec();
            if (!registration) {
                throw new DaycareOnboardingServiceError(
                    "טופס הרישום המקורי לא נמצא ולכן התיק לא נמחק.",
                    409,
                    "ONBOARDING_REGISTRATION_NOT_FOUND"
                );
            }

            await DaycareAgreement.deleteMany({ onboardingId: current._id }).session(session);
            await DaycareHealthDeclaration.deleteMany({ onboardingId: current._id }).session(session);
            await DaycarePickupAuthorization.deleteMany({ onboardingId: current._id }).session(session);
            await DaycareOnboardingAudit.deleteMany({ onboardingId: current._id }).session(session);
            await DaycareOnboarding.deleteOne({ _id: current._id }).session(session);

            if (current.childId) {
                const [otherOnboarding, otherRegistration] = await Promise.all([
                    DaycareOnboarding.exists({ childId: current.childId }).session(session).exec(),
                    DaycareRegistration.exists({ daycareChildId: current.childId }).session(session).exec(),
                ]);
                if (!otherOnboarding && !otherRegistration) {
                    const result = await DaycareChild.deleteOne({ _id: current.childId }).session(session);
                    childDeleted = result.deletedCount === 1;
                }
            }

            if (current.familyId) {
                const [remainingChild, otherOnboarding, otherRegistration] = await Promise.all([
                    DaycareChild.exists({ familyId: current.familyId }).session(session).exec(),
                    DaycareOnboarding.exists({ familyId: current.familyId }).session(session).exec(),
                    DaycareRegistration.exists({ daycareFamilyId: current.familyId }).session(session).exec(),
                ]);
                if (!remainingChild && !otherOnboarding && !otherRegistration) {
                    const result = await DaycareFamily.deleteOne({ _id: current.familyId }).session(session);
                    familyDeleted = result.deletedCount === 1;
                }
            }
        });
    } finally {
        await session.endSession();
    }

    let filesCleanupFailed = 0;
    if (fileKeys.length > 0) {
        try {
            const storage = getDaycareStorageProvider();
            const cleanupResults = await Promise.allSettled(
                fileKeys.map((key) => storage.delete(key))
            );
            filesCleanupFailed = cleanupResults.filter(
                (result) => result.status === "rejected"
            ).length;
        } catch (error: unknown) {
            filesCleanupFailed = fileKeys.length;
            logger.error("Failed to clean up deleted daycare onboarding files", {
                onboardingId,
                filesCleanupFailed,
                error,
            });
        }
        if (filesCleanupFailed > 0) {
            logger.error("Some deleted daycare onboarding files require cleanup", {
                onboardingId,
                filesCleanupFailed,
            });
        }
    }

    return {
        onboardingId,
        registrationId: onboarding.origin.recordId.toString(),
        identityPreserved:
            Boolean(onboarding.familyId && onboarding.childId) &&
            !childDeleted &&
            !familyDeleted,
        childDeleted,
        familyDeleted,
        filesCleanupFailed,
    };
};

export const listAdminOnboardings = async () => {
    const onboardings = await DaycareOnboarding.find()
        .sort({ updatedAt: -1 })
        .exec();
    const childIds = onboardings.flatMap((onboarding) =>
        onboarding.childId ? [onboarding.childId] : []
    );
    const familyIds = onboardings.flatMap((onboarding) =>
        onboarding.familyId ? [onboarding.familyId] : []
    );
    const [children, families] = await Promise.all([
        DaycareChild.find({ _id: { $in: childIds } }).exec(),
        DaycareFamily.find({ _id: { $in: familyIds } }).exec(),
    ]);
    const childrenById = new Map(
        children.map((child) => [child.id, child])
    );
    const familiesById = new Map(
        families.map((family) => [family.id, family])
    );

    return onboardings.flatMap((onboarding) => {
        const child = onboarding.childId
            ? childrenById.get(onboarding.childId.toString())
            : undefined;
        const family = onboarding.familyId
            ? familiesById.get(onboarding.familyId.toString())
            : undefined;

        const item: AdminOnboardingListItemDto = {
            id: onboarding.id,
            legacyEnrollmentId:
                child?.legacySource?.recordId.toString(),
            origin: onboarding.origin
                ? {
                      type: onboarding.origin.type,
                      recordId: onboarding.origin.recordId?.toString(),
                  }
                : undefined,
            familyId: family?.id ?? onboarding.familyId?.toString(),
            childId: child?.id ?? onboarding.childId?.toString(),
            profileStatus:
                onboarding.profileStatus ??
                (child ? "complete" : "incomplete"),
            schoolYear: onboarding.schoolYear,
            childName: child
                ? `${child.firstName} ${child.lastName}`.trim()
                : "פרטי הילד טרם הושלמו",
            guardians: family
                ? family.guardians.map((guardian) => ({
                      fullName: guardian.fullName,
                      role: guardian.role,
                      roleDetails: guardian.roleDetails,
                      phone: guardian.phone,
                      email: guardian.email,
                  }))
                : onboarding.temporaryParentName &&
                    onboarding.temporaryParentPhone
                  ? [
                        {
                            fullName: onboarding.temporaryParentName,
                            role: "guardian",
                            phone: onboarding.temporaryParentPhone,
                        },
                    ]
                  : [],
            overallStatus: getEffectiveOverallStatus(onboarding),
            parentSubmittedAt: cloneDate(onboarding.parentSubmittedAt),
            parentSubmissionComplete: isParentBundleSubmitted(onboarding),
            progress: calculateOnboardingProgress(onboarding.steps),
            missingStepTitle: getMissingStepTitle(onboarding.steps),
            hasPendingReview: onboarding.steps.some(
                (step) => step.status === "pendingReview"
            ),
            parentAccessEnabled: onboarding.parentAccessEnabled,
            updatedAt: cloneDate(onboarding.updatedAt),
        };

        return [item];
    });
};

export const listAdminDaycareFamilies = async () => {
    const families = await DaycareFamily.find()
        .sort({ updatedAt: -1 })
        .exec();
    const children = await DaycareChild.find({
        familyId: { $in: families.map((family) => family._id) },
    }).exec();
    const childrenByFamilyId = new Map<string, string[]>();
    const childOptionsByFamilyId = new Map<
        string,
        Array<{
            id: string;
            firstName: string;
            lastName: string;
            birthDate?: Date;
        }>
    >();

    for (const child of children) {
        const familyId = child.familyId.toString();
        const names = childrenByFamilyId.get(familyId) ?? [];
        names.push(`${child.firstName} ${child.lastName}`.trim());
        childrenByFamilyId.set(familyId, names);
        const options = childOptionsByFamilyId.get(familyId) ?? [];
        options.push({
            id: child.id,
            firstName: child.firstName,
            lastName: child.lastName,
            birthDate: cloneDate(child.birthDate),
        });
        childOptionsByFamilyId.set(familyId, options);
    }

    return families.map((family) => ({
        id: family.id,
        guardians: family.guardians.map((guardian) => ({
            fullName: guardian.fullName,
            role: guardian.role,
            roleDetails: guardian.roleDetails,
            phone: guardian.phone,
            email: guardian.email,
        })),
        childNames: childrenByFamilyId.get(family.id) ?? [],
        children: childOptionsByFamilyId.get(family.id) ?? [],
        updatedAt: family.updatedAt,
    }));
};
