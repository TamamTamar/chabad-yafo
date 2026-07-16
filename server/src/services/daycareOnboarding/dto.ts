import type { HydratedDocument } from "mongoose";
import type { IDaycareChild } from "../../types/daycareChild";
import type { IDaycareFamily } from "../../types/daycareFamily";
import type {
    AdminOnboardingDetailDto,
    IDaycareOnboarding,
    IOnboardingStep,
    PublicDaycareOnboardingDto,
    PublicOnboardingStep,
} from "../../types/daycareOnboarding";
import {
    calculateOnboardingProgress,
    calculateParentSubmissionProgress,
    canSubmitParentBundle,
    calculateOverallStatus,
    cloneOnboardingStep,
    cloneDate,
    getEffectiveOverallStatus,
    isParentBundleSubmitted,
} from "./core";

type DaycareFamilyDocument = HydratedDocument<IDaycareFamily>;
type DaycareChildDocument = HydratedDocument<IDaycareChild>;
type DaycareOnboardingDocument = HydratedDocument<IDaycareOnboarding>;

export const getMissingStepTitle = (steps: readonly IOnboardingStep[]) =>
    [...steps]
        .filter(
            (step) =>
                step.isVisibleToParent &&
                (step.responsibleParty === "parent" ||
                    step.responsibleParty === "both") &&
                step.status !== "pendingReview" &&
                step.status !== "completed" &&
                step.status !== "notRequired"
        )
        .sort((left, right) => left.order - right.order)[0]?.title;

const toFamilyAddressDto = (
    address: NonNullable<IDaycareFamily["address"]>
) => ({
    city: address.city,
    street: address.street,
    houseNumber: address.houseNumber,
    apartment: address.apartment,
});

const getStepDisplayTitle = (step: IOnboardingStep) => {
    if (step.key === "registrationFeeReceived") {
        return step.status === "completed"
            ? "התשלום אושר"
            : "ממתין להסדרת תשלום";
    }

    if (step.key === "registrationApproved") {
        return step.status === "completed"
            ? "שובץ בקבוצה — הרישום הושלם"
            : "ממתין לשיבוץ בקבוצה";
    }

    return step.title;
};

const toPublicStep = (
    step: IOnboardingStep
): PublicOnboardingStep => ({
    key: step.key,
    title: getStepDisplayTitle(step),
    description: step.description,
    status: step.status,
    order: step.order,
    completedAt: cloneDate(step.completedAt),
    updatedAt: new Date(step.updatedAt),
    parentMessage: step.parentMessage,
});

export const toPublicOnboardingDto = (
    onboarding: IDaycareOnboarding,
    child?: Pick<IDaycareChild, "firstName" | "lastName" | "birthDate"> | null,
    family?: Pick<IDaycareFamily, "guardians" | "address"> | null
): PublicDaycareOnboardingDto => {
    const visibleSteps = onboarding.steps
        .filter((step) => step.isVisibleToParent)
        .sort((left, right) => left.order - right.order)
        .map(toPublicStep);

    const profileStep = onboarding.steps.find(
        (step) => step.key === "childAndGuardianDetails"
    );
    const canEditProfile = Boolean(
        profileStep?.isVisibleToParent &&
            profileStep.status !== "notRequired" &&
            !isParentBundleSubmitted(onboarding)
    );
    const profile = child?.birthDate && family?.address
        ? {
              child: {
                  firstName: child.firstName,
                  lastName: child.lastName,
                  birthDate: new Date(child.birthDate as Date),
              },
              guardians: family.guardians.map((guardian) => ({
                  fullName: guardian.fullName,
                  role: guardian.role,
                  roleDetails: guardian.roleDetails,
                  phone: guardian.phone,
                  email: guardian.email,
              })),
              address: toFamilyAddressDto(family.address),
          }
        : undefined;

    const parentBundleSubmitted = isParentBundleSubmitted(onboarding);

    return {
        childName: child
            ? `${child.firstName} ${child.lastName}`.trim()
            : "פרטי הילד טרם הושלמו",
        schoolYear: onboarding.schoolYear,
        profileStatus:
            onboarding.profileStatus ?? (child ? "complete" : "incomplete"),
        overallStatus: getEffectiveOverallStatus(onboarding),
        progress: calculateParentSubmissionProgress(onboarding.steps),
        parentSubmission: {
            submittedAt: cloneDate(onboarding.parentSubmittedAt),
            isSubmitted: parentBundleSubmitted,
            canSubmit:
                canSubmitParentBundle(onboarding.steps) &&
                !parentBundleSubmitted,
        },
        missingStepTitle: getMissingStepTitle(onboarding.steps),
        canEditProfile,
        profilePrefill:
            onboarding.temporaryParentName || onboarding.temporaryParentPhone
                ? {
                      guardianFullName: onboarding.temporaryParentName,
                      guardianPhone: onboarding.temporaryParentPhone,
                  }
                : undefined,
        profile,
        steps: visibleSteps,
    };
};

const getDocumentId = (document: { id: string }) => document.id;

export const toAdminOnboardingDetail = (
    onboarding: DaycareOnboardingDocument,
    child?: DaycareChildDocument | null,
    family?: DaycareFamilyDocument | null
): AdminOnboardingDetailDto => ({
    id: getDocumentId(onboarding),
    familyId: family ? getDocumentId(family) : onboarding.familyId?.toString(),
    childId: child ? getDocumentId(child) : onboarding.childId?.toString(),
    profileStatus:
        onboarding.profileStatus ?? (child ? "complete" : "incomplete"),
    internalNote: onboarding.internalNote,
    legacyEnrollmentId: child?.legacySource?.recordId.toString(),
    origin: onboarding.origin
        ? {
              type: onboarding.origin.type,
              recordId: onboarding.origin.recordId?.toString(),
          }
        : undefined,
    schoolYear: onboarding.schoolYear,
    child: {
        firstName: child?.firstName,
        lastName: child?.lastName,
        birthDate: cloneDate(child?.birthDate),
    },
    guardians: family
        ? family.guardians.map((guardian) => ({
              fullName: guardian.fullName,
              role: guardian.role,
              roleDetails: guardian.roleDetails,
              phone: guardian.phone,
              email: guardian.email,
          }))
        : onboarding.temporaryParentName && onboarding.temporaryParentPhone
          ? [
                {
                    fullName: onboarding.temporaryParentName,
                    role: "guardian",
                    phone: onboarding.temporaryParentPhone,
                },
            ]
          : [],
    address: family?.address
        ? toFamilyAddressDto(family.address)
        : undefined,
    overallStatus: getEffectiveOverallStatus(onboarding),
    parentSubmittedAt: cloneDate(onboarding.parentSubmittedAt),
    parentSubmissionComplete: isParentBundleSubmitted(onboarding),
    calculatedOverallStatus:
        !isParentBundleSubmitted(onboarding) && canSubmitParentBundle(onboarding.steps)
            ? "waitingForParent"
            : calculateOverallStatus(onboarding.steps),
    overallStatusOverride: onboarding.overallStatusOverride,
    steps: onboarding.steps
        .map((step) => ({
            ...cloneOnboardingStep(step),
            title: getStepDisplayTitle(step),
        }))
        .sort((left, right) => left.order - right.order),
    progress: calculateOnboardingProgress(onboarding.steps),
    access: {
        enabled: onboarding.parentAccessEnabled,
        createdAt: new Date(onboarding.parentAccessTokenCreatedAt),
        expiresAt: cloneDate(onboarding.parentAccessTokenExpiresAt),
        lastAccessAt: cloneDate(onboarding.lastParentAccessAt),
    },
    createdAt: cloneDate(onboarding.createdAt),
    updatedAt: cloneDate(onboarding.updatedAt),
});
