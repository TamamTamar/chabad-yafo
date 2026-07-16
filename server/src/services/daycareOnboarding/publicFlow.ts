import { startSession, type ClientSession } from "mongoose";
import { DAYCARE_ONBOARDING_AUDIT_ACTIONS } from "../../config/daycareOnboardingAuditActions";
import { DaycareChild } from "../../models/DaycareChild";
import { DaycareFamily } from "../../models/DaycareFamily";
import { DaycareOnboarding } from "../../models/DaycareOnboarding";
import { DaycareRegistration } from "../../models/DaycareRegistration";
import type { PublicDaycareOnboardingDto, SubmitPublicDaycareProfileDto } from "../../types/daycareOnboarding";
import {
    canSubmitParentBundle,
    calculateOverallStatus,
    cloneOnboardingStep,
    DaycareOnboardingServiceError,
    hashParentAccessToken,
    isParentAccessAllowed,
    isParentBundleSubmitted,
    isParentAccessTokenFormatValid,
    parentTokenMatchesHash,
    type NewAuditEntry,
} from "./core";
import { toPublicOnboardingDto } from "./dto";
import { createAuditEntries } from "./adminMutations";
import { getIdentityOrThrow } from "./persistence";

const inaccessiblePublicLinkError = () =>
    new DaycareOnboardingServiceError(
        "The onboarding link is invalid or unavailable",
        404,
        "PUBLIC_LINK_UNAVAILABLE"
    );

export const getPublicOnboardingDocumentByToken = async (
    rawToken: string,
    now: Date,
    session?: ClientSession
) => {
    if (!isParentAccessTokenFormatValid(rawToken)) {
        throw inaccessiblePublicLinkError();
    }

    const tokenHash = hashParentAccessToken(rawToken);
    const query = DaycareOnboarding.findOne({ parentAccessTokenHash: tokenHash })
        .select("+parentAccessTokenHash");
    if (session) query.session(session);
    const onboarding = await query.exec();

    if (
        !onboarding ||
        !parentTokenMatchesHash(rawToken, onboarding.parentAccessTokenHash) ||
        !isParentAccessAllowed(onboarding, now)
    ) {
        throw inaccessiblePublicLinkError();
    }

    return onboarding;
};

export const getPublicOnboardingByToken = async (
    rawToken: string,
    now = new Date()
) => {
    const onboarding = await getPublicOnboardingDocumentByToken(rawToken, now);
    const { child, family } = await getIdentityOrThrow(onboarding);

    if (onboarding.childId && !child) {
        throw inaccessiblePublicLinkError();
    }

    const data = toPublicOnboardingDto(onboarding, child, family);

    await DaycareOnboarding.updateOne(
        { _id: onboarding._id },
        { $set: { lastParentAccessAt: now } }
    ).exec();

    return data;
};

export const submitPublicDaycareProfile = async (
    rawToken: string,
    profile: SubmitPublicDaycareProfileDto,
    now = new Date()
) => {
    const session = await startSession();
    let result: PublicDaycareOnboardingDto | undefined;

    try {
        await session.withTransaction(async () => {
            const onboarding = await getPublicOnboardingDocumentByToken(
                rawToken,
                now,
                session
            );
            const stepIndex = onboarding.steps.findIndex(
                (step) => step.key === "childAndGuardianDetails"
            );
            const step = onboarding.steps[stepIndex];

            if (
                stepIndex < 0 ||
                !step.isVisibleToParent ||
                step.status === "notRequired" ||
                isParentBundleSubmitted(onboarding)
            ) {
                throw new DaycareOnboardingServiceError(
                    "The profile cannot be changed at this stage",
                    409,
                    "PROFILE_EDIT_NOT_ALLOWED"
                );
            }

            const wasComplete = onboarding.profileStatus === "complete";
            let family = onboarding.familyId
                ? await DaycareFamily.findById(onboarding.familyId).session(session).exec()
                : null;
            let child = onboarding.childId
                ? await DaycareChild.findById(onboarding.childId).session(session).exec()
                : null;

            if ((onboarding.familyId && !family) || (onboarding.childId && !child)) {
                throw new DaycareOnboardingServiceError(
                    "Onboarding identity is unavailable",
                    409,
                    "ONBOARDING_IDENTITY_UNAVAILABLE"
                );
            }

            const familyWasCreated = !family;
            if (!family) {
                family = new DaycareFamily({
                    guardians: profile.guardians,
                    address: profile.address,
                });
            } else {
                family.guardians = profile.guardians;
                family.address = profile.address;
            }
            await family.save({ session });

            const childWasCreated = !child;
            if (!child) {
                child = new DaycareChild({
                    familyId: family._id,
                    ...profile.child,
                });
            } else {
                if (!child.familyId.equals(family._id)) {
                    throw new DaycareOnboardingServiceError(
                        "Onboarding identity is inconsistent",
                        409,
                        "ONBOARDING_IDENTITY_INCONSISTENT"
                    );
                }
                child.firstName = profile.child.firstName;
                child.lastName = profile.child.lastName;
                child.birthDate = profile.child.birthDate;
            }
            await child.save({ session });

            const previousStatus = step.status;
            const previousSource = step.source;
            onboarding.familyId = family._id;
            onboarding.childId = child._id;
            onboarding.profileStatus = "complete";
            onboarding.steps[stepIndex] = {
                ...cloneOnboardingStep(step),
                status: "pendingReview",
                source: "online",
                actionType: "openForm",
                isAvailable: true,
                completedAt: undefined,
                updatedAt: new Date(now),
                updatedBy: "parent",
                relatedRecord: {
                    type: "daycareChild",
                    recordId: child._id,
                    formKey: "childAndGuardianDetails",
                },
            };
            onboarding.markModified("steps");
            onboarding.parentSubmittedAt = undefined;
            onboarding.overallStatus = "waitingForParent";
            onboarding.lastParentAccessAt = new Date(now);
            await onboarding.save({ session });

            if (
                onboarding.origin?.type === "daycareRegistration" &&
                onboarding.origin.recordId
            ) {
                await DaycareRegistration.updateOne(
                    { _id: onboarding.origin.recordId },
                    {
                        $set: {
                            daycareFamilyId: family._id,
                            daycareChildId: child._id,
                        },
                    },
                    { session }
                ).exec();
            }

            const auditBase = {
                onboardingId: onboarding._id,
                actorType: "parent" as const,
                actorLabel: "parent-link",
                stepKey: "childAndGuardianDetails",
                createdAt: now,
            };
            const auditEntries: NewAuditEntry[] = [
                ...(familyWasCreated
                    ? [{
                          ...auditBase,
                          action: DAYCARE_ONBOARDING_AUDIT_ACTIONS.familyCreated,
                          newValue: { familyId: family.id },
                      }]
                    : []),
                ...(childWasCreated
                    ? [{
                          ...auditBase,
                          action: DAYCARE_ONBOARDING_AUDIT_ACTIONS.childCreated,
                          newValue: { childId: child.id },
                      }]
                    : []),
                {
                    ...auditBase,
                    action: wasComplete
                        ? DAYCARE_ONBOARDING_AUDIT_ACTIONS.identityProfileUpdated
                        : DAYCARE_ONBOARDING_AUDIT_ACTIONS.identityProfileSubmitted,
                    newValue: {
                        fields: ["child", "guardians", "address"],
                        guardianCount: profile.guardians.length,
                    },
                },
                ...(previousStatus !== "pendingReview"
                    ? [{
                          ...auditBase,
                          action: DAYCARE_ONBOARDING_AUDIT_ACTIONS.stepStatusChanged,
                          previousValue: previousStatus,
                          newValue: "pendingReview",
                      }]
                    : []),
                ...(previousSource !== "online"
                    ? [{
                          ...auditBase,
                          action: DAYCARE_ONBOARDING_AUDIT_ACTIONS.stepSourceChanged,
                          previousValue: previousSource,
                          newValue: "online",
                      }]
                    : []),
            ];
            await createAuditEntries(auditEntries, session);
            result = toPublicOnboardingDto(onboarding, child, family);
        });
    } finally {
        await session.endSession();
    }

    if (!result) {
        throw new DaycareOnboardingServiceError(
            "The profile could not be saved",
            500,
            "PROFILE_SAVE_FAILED"
        );
    }

    return result;
};

export const submitPublicParentBundle = async (
    rawToken: string,
    now = new Date()
) => {
    const session = await startSession();
    let result: PublicDaycareOnboardingDto | undefined;

    try {
        await session.withTransaction(async () => {
            const onboarding = await getPublicOnboardingDocumentByToken(
                rawToken,
                now,
                session
            );
            if (!canSubmitParentBundle(onboarding.steps)) {
                throw new DaycareOnboardingServiceError(
                    "יש להשלים את כל הפרטים והמסמכים לפני השליחה.",
                    409,
                    "PARENT_BUNDLE_INCOMPLETE"
                );
            }

            const { child, family } = await getIdentityOrThrow(onboarding);
            if (!onboarding.parentSubmittedAt) {
                onboarding.parentSubmittedAt = now;
                onboarding.overallStatus = calculateOverallStatus(onboarding.steps);
                onboarding.lastParentAccessAt = now;
                await onboarding.save({ session });
                await createAuditEntries(
                    [{
                        onboardingId: onboarding._id,
                        actorType: "parent",
                        actorLabel: "parent-link",
                        action: DAYCARE_ONBOARDING_AUDIT_ACTIONS.parentBundleSubmitted,
                        newValue: { submittedAt: now },
                        createdAt: now,
                    }],
                    session
                );
            }
            result = toPublicOnboardingDto(onboarding, child, family);
        });
    } finally {
        await session.endSession();
    }

    if (!result) {
        throw new DaycareOnboardingServiceError(
            "לא הצלחנו לשלוח את התיק לצוות המעון.",
            500,
            "PARENT_BUNDLE_SUBMIT_FAILED"
        );
    }

    return result;
};
