import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { Types } from "mongoose";
import { DAYCARE_ONBOARDING_STEP_DEFINITIONS } from "../../config/daycareOnboardingDefaults";
import type {
    AdminOnboardingStepPatchDto,
    IDaycareOnboarding,
    IDaycareOnboardingOrigin,
    IOnboardingStep,
    OnboardingOverallStatus,
    OnboardingProgress,
} from "../../types/daycareOnboarding";
import type { OnboardingAuditActorType } from "../../types/daycareOnboardingAudit";

export interface ParentAccessCredentials {
    rawToken: string;
    tokenHash: string;
    createdAt: Date;
    expiresAt: Date;
}

export interface NewOnboardingIdentity {
    familyId?: Types.ObjectId;
    childId?: Types.ObjectId;
    schoolYear: string;
    origin?: IDaycareOnboardingOrigin;
    temporaryParentName?: string;
    temporaryParentPhone?: string;
    temporaryChildAge?: string;
    profileStatus?: "incomplete" | "complete";
    internalNote?: string;
}

export interface NewOnboardingBundle {
    onboarding: IDaycareOnboarding;
    rawToken: string;
}

export interface NewAuditEntry {
    onboardingId: Types.ObjectId;
    actorType: OnboardingAuditActorType;
    actorId?: string;
    actorLabel?: string;
    action: string;
    stepKey?: string;
    previousValue?: unknown;
    newValue?: unknown;
    createdAt?: Date;
}

export class DaycareOnboardingServiceError extends Error {
    constructor(
        message: string,
        readonly statusCode: number,
        readonly code: string
    ) {
        super(message);
        this.name = "DaycareOnboardingServiceError";
    }
}

const millisecondsPerDay = 24 * 60 * 60 * 1000;
const defaultParentLinkLifetimeDays = 90;

export const cloneDate = (value: Date | undefined) =>
    value ? new Date(value) : undefined;

export const cloneOnboardingStep = (
    step: IOnboardingStep
): IOnboardingStep => ({
    key: step.key,
    title: step.title,
    description: step.description,
    status: step.status,
    source: step.source,
    responsibleParty: step.responsibleParty,
    actionType: step.actionType,
    actionUrl: step.actionUrl,
    isAvailable: step.isAvailable,
    requiresAdminApproval: step.requiresAdminApproval,
    isVisibleToParent: step.isVisibleToParent,
    order: step.order,
    completedAt: cloneDate(step.completedAt),
    updatedAt: new Date(step.updatedAt),
    updatedBy: step.updatedBy,
    internalNote: step.internalNote,
    parentMessage: step.parentMessage,
    relatedRecord: step.relatedRecord
        ? { ...step.relatedRecord }
        : undefined,
});

export const cloneOnboarding = (
    onboarding: IDaycareOnboarding
): IDaycareOnboarding => ({
    familyId: onboarding.familyId,
    childId: onboarding.childId,
    schoolYear: onboarding.schoolYear,
    origin: onboarding.origin
        ? {
              type: onboarding.origin.type,
              recordId: onboarding.origin.recordId,
          }
        : undefined,
    temporaryParentName: onboarding.temporaryParentName,
    temporaryParentPhone: onboarding.temporaryParentPhone,
    temporaryChildAge: onboarding.temporaryChildAge,
    profileStatus:
        onboarding.profileStatus ??
        (onboarding.childId ? "complete" : "incomplete"),
    internalNote: onboarding.internalNote,
    overallStatus: onboarding.overallStatus,
    overallStatusOverride: onboarding.overallStatusOverride,
    parentSubmissionRequired: onboarding.parentSubmissionRequired,
    parentSubmittedAt: cloneDate(onboarding.parentSubmittedAt),
    steps: onboarding.steps.map(cloneOnboardingStep),
    parentAccessTokenHash: onboarding.parentAccessTokenHash,
    parentAccessTokenCreatedAt: new Date(
        onboarding.parentAccessTokenCreatedAt
    ),
    parentAccessTokenExpiresAt: cloneDate(
        onboarding.parentAccessTokenExpiresAt
    ),
    parentAccessEnabled: onboarding.parentAccessEnabled,
    lastParentAccessAt: cloneDate(onboarding.lastParentAccessAt),
    createdAt: new Date(onboarding.createdAt),
    updatedAt: new Date(onboarding.updatedAt),
});

const getConfiguredTokenLifetimeDays = () => {
    const configuredDays = Number(
        process.env.DAYCARE_ONBOARDING_TOKEN_TTL_DAYS
    );

    return Number.isFinite(configuredDays) && configuredDays > 0
        ? Math.floor(configuredDays)
        : defaultParentLinkLifetimeDays;
};

export const generateParentAccessToken = () =>
    randomBytes(32).toString("base64url");

export const isParentAccessTokenFormatValid = (token: string) =>
    /^[A-Za-z0-9_-]{43}$/.test(token);

export const hashParentAccessToken = (token: string) =>
    createHash("sha256").update(token, "utf8").digest("hex");

export const parentTokenMatchesHash = (
    token: string,
    tokenHash: string
) => {
    if (
        !isParentAccessTokenFormatValid(token) ||
        !/^[a-f0-9]{64}$/.test(tokenHash)
    ) {
        return false;
    }

    const actualHash = Buffer.from(hashParentAccessToken(token), "hex");
    const expectedHash = Buffer.from(tokenHash, "hex");

    return (
        actualHash.length === expectedHash.length &&
        timingSafeEqual(actualHash, expectedHash)
    );
};

export const createParentAccessCredentials = (
    createdAt = new Date(),
    rawToken = generateParentAccessToken()
): ParentAccessCredentials => {
    if (!isParentAccessTokenFormatValid(rawToken)) {
        throw new Error(
            "Parent access token must be a 43-character base64url value"
        );
    }

    const normalizedCreatedAt = new Date(createdAt);

    return {
        rawToken,
        tokenHash: hashParentAccessToken(rawToken),
        createdAt: normalizedCreatedAt,
        expiresAt: new Date(
            normalizedCreatedAt.getTime() +
                getConfiguredTokenLifetimeDays() * millisecondsPerDay
        ),
    };
};

export const calculateOnboardingProgress = (
    steps: readonly IOnboardingStep[]
): OnboardingProgress => {
    const requiredVisibleSteps = steps.filter(
        (step) =>
            step.isVisibleToParent && step.status !== "notRequired"
    );
    const completedSteps = requiredVisibleSteps.filter(
        (step) => step.status === "completed"
    ).length;
    const totalSteps = requiredVisibleSteps.length;

    return {
        completedSteps,
        totalSteps,
        percentage:
            totalSteps === 0
                ? 100
                : Math.round((completedSteps / totalSteps) * 100),
    };
};

const isParentSubmissionStep = (step: IOnboardingStep) =>
    step.isVisibleToParent &&
    (step.responsibleParty === "parent" || step.responsibleParty === "both");

const isParentStepFilled = (step: IOnboardingStep) =>
    step.status === "pendingReview" ||
    step.status === "completed" ||
    step.status === "notRequired";

export const calculateParentSubmissionProgress = (
    steps: readonly IOnboardingStep[]
): OnboardingProgress => {
    const parentSteps = steps.filter(isParentSubmissionStep);
    const completedSteps = parentSteps.filter(isParentStepFilled).length;
    const totalSteps = parentSteps.length;

    return {
        completedSteps,
        totalSteps,
        percentage:
            totalSteps === 0
                ? 100
                : Math.round((completedSteps / totalSteps) * 100),
    };
};

export const canSubmitParentBundle = (steps: readonly IOnboardingStep[]) => {
    const parentSteps = steps.filter(isParentSubmissionStep);
    return parentSteps.length > 0 && parentSteps.every(isParentStepFilled);
};

export const isParentBundleSubmitted = (onboarding: IDaycareOnboarding) => {
    const parentSteps = onboarding.steps.filter(isParentSubmissionStep);

    if (parentSteps.some((step) => !isParentStepFilled(step))) {
        return false;
    }

    if (onboarding.parentSubmissionRequired) {
        return Boolean(onboarding.parentSubmittedAt);
    }

    return Boolean(onboarding.parentSubmittedAt) ||
        parentSteps.some((step) => step.status === "completed");
};

const isIncomplete = (step: IOnboardingStep) =>
    step.status !== "completed" && step.status !== "notRequired";

const parentStillNeedsToAct = (step: IOnboardingStep) =>
    isIncomplete(step) &&
    step.status !== "pendingReview" &&
    (step.responsibleParty === "parent" ||
        step.responsibleParty === "both");

const adminStillNeedsToAct = (step: IOnboardingStep) =>
    isIncomplete(step) &&
    (step.status === "pendingReview" ||
        step.responsibleParty === "admin" ||
        step.responsibleParty === "automatic" ||
        step.responsibleParty === "both");

export const calculateOverallStatus = (
    steps: readonly IOnboardingStep[]
): OnboardingOverallStatus => {
    const requiredSteps = steps.filter(
        (step) => step.status !== "notRequired"
    );

    if (requiredSteps.length === 0) {
        return "completed";
    }

    if (requiredSteps.every((step) => step.status === "completed")) {
        return "completed";
    }

    if (requiredSteps.some(parentStillNeedsToAct)) {
        return "waitingForParent";
    }

    if (requiredSteps.some(adminStillNeedsToAct)) {
        return "waitingForAdmin";
    }

    const hasStarted = requiredSteps.some(
        (step) => step.status !== "notStarted"
    );

    return hasStarted ? "inProgress" : "new";
};

export const getEffectiveOverallStatus = (
    onboarding: IDaycareOnboarding
) =>
    onboarding.overallStatusOverride ??
    (!isParentBundleSubmitted(onboarding) && canSubmitParentBundle(onboarding.steps)
        ? "waitingForParent"
        : calculateOverallStatus(onboarding.steps));

export const synchronizeOverallStatus = (
    onboarding: IDaycareOnboarding
) => {
    onboarding.overallStatus = calculateOverallStatus(onboarding.steps);
    return onboarding;
};

export const isParentAccessAllowed = (
    onboarding: IDaycareOnboarding,
    now = new Date()
) =>
    onboarding.parentAccessEnabled &&
    Boolean(
        onboarding.parentAccessTokenExpiresAt &&
            onboarding.parentAccessTokenExpiresAt.getTime() > now.getTime()
    );

export const createDefaultOnboarding = (
    identity: NewOnboardingIdentity,
    now = new Date(),
    rawToken = generateParentAccessToken()
): NewOnboardingBundle => {
    const credentials = createParentAccessCredentials(now, rawToken);
    const steps: IOnboardingStep[] =
        DAYCARE_ONBOARDING_STEP_DEFINITIONS.map((definition) => {
            const isInitialStep = definition.key === "onboardingOpened";

            return {
                key: definition.key,
                title: definition.title,
                description: definition.description,
                status: isInitialStep ? "completed" : "notStarted",
                source: isInitialStep ? "automatic" : undefined,
                responsibleParty: definition.responsibleParty,
                actionType: definition.actionType,
                isAvailable: definition.isAvailable,
                requiresAdminApproval:
                    definition.requiresAdminApproval,
                isVisibleToParent: definition.isVisibleToParent,
                order: definition.order,
                completedAt: isInitialStep
                    ? new Date(now)
                    : undefined,
                updatedAt: new Date(now),
                updatedBy: isInitialStep ? "system" : undefined,
            };
        });
    const onboarding: IDaycareOnboarding = {
        familyId: identity.familyId,
        childId: identity.childId,
        schoolYear: identity.schoolYear,
        origin: identity.origin,
        temporaryParentName: identity.temporaryParentName,
        temporaryParentPhone: identity.temporaryParentPhone,
        temporaryChildAge: identity.temporaryChildAge,
        profileStatus: identity.profileStatus ?? "complete",
        internalNote: identity.internalNote,
        overallStatus: calculateOverallStatus(steps),
        parentSubmissionRequired: true,
        steps,
        parentAccessTokenHash: credentials.tokenHash,
        parentAccessTokenCreatedAt: credentials.createdAt,
        parentAccessTokenExpiresAt: credentials.expiresAt,
        parentAccessEnabled: true,
        createdAt: new Date(now),
        updatedAt: new Date(now),
    };

    return { onboarding, rawToken: credentials.rawToken };
};

export const regenerateParentAccess = (
    onboarding: IDaycareOnboarding,
    now = new Date(),
    rawToken = generateParentAccessToken()
): NewOnboardingBundle => {
    const credentials = createParentAccessCredentials(now, rawToken);
    const next = cloneOnboarding(onboarding);
    next.parentAccessTokenHash = credentials.tokenHash;
    next.parentAccessTokenCreatedAt = credentials.createdAt;
    next.parentAccessTokenExpiresAt = credentials.expiresAt;
    next.parentAccessEnabled = true;
    next.lastParentAccessAt = undefined;
    next.updatedAt = new Date(now);

    return { onboarding: next, rawToken: credentials.rawToken };
};

export const applyAdminStepPatch = (
    step: IOnboardingStep,
    patch: AdminOnboardingStepPatchDto,
    now = new Date()
): IOnboardingStep => {
    const next = cloneOnboardingStep(step);

    if (patch.status !== undefined) {
        next.status = patch.status;

        if (patch.source === undefined) {
            next.source = "admin";
        }
    }

    if (patch.source !== undefined) {
        next.source = patch.source;
    }

    if (patch.responsibleParty !== undefined) {
        next.responsibleParty = patch.responsibleParty;
    }

    if (patch.isVisibleToParent !== undefined) {
        next.isVisibleToParent = patch.isVisibleToParent;
    }

    if ("internalNote" in patch) {
        next.internalNote = patch.internalNote ?? undefined;
    }

    if ("parentMessage" in patch) {
        next.parentMessage = patch.parentMessage ?? undefined;
    }

    if (next.status === "completed") {
        next.completedAt =
            patch.completedAt ?? next.completedAt ?? new Date(now);
    } else if (patch.status !== undefined || "completedAt" in patch) {
        next.completedAt = undefined;
    }

    next.updatedAt = new Date(now);
    next.updatedBy = "shared-admin";

    return next;
};
