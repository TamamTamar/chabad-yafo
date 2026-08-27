import { Types, type ClientSession } from "mongoose";
import { DAYCARE_ONBOARDING_AUDIT_ACTIONS } from "../../config/daycareOnboardingAuditActions";
import { DaycareAgreement } from "../../models/DaycareAgreement";
import { DaycareHealthDeclaration } from "../../models/DaycareHealthDeclaration";
import { DaycareLead } from "../../models/DaycareLead";
import { DaycareOnboardingAudit } from "../../models/DaycareOnboardingAudit";
import { DaycarePickupAuthorization } from "../../models/DaycarePickupAuthorization";
import { DaycareRegistration } from "../../models/DaycareRegistration";
import type {
    AdminOnboardingStepPatchDto,
    IOnboardingStep,
    OnboardingOverallStatus,
} from "../../types/daycareOnboarding";
import {
    applyAdminStepPatch,
    calculateOverallStatus,
    cloneOnboardingStep,
    createParentAccessCredentials,
    DaycareOnboardingServiceError,
    generateParentAccessToken,
    hashParentAccessToken,
    type NewAuditEntry,
} from "./core";
import { toAdminOnboardingDetail } from "./dto";
import { getIdentityOrThrow, getOnboardingOrThrow } from "./persistence";

export const createAuditEntries = async (
    entries: readonly NewAuditEntry[],
    session?: ClientSession
) => {
    if (entries.length === 0) {
        return [];
    }

    const documents = entries.map((entry) => ({
            ...entry,
            createdAt: entry.createdAt ?? new Date(),
        }));

    return session
        ? DaycareOnboardingAudit.insertMany(documents, { session })
        : DaycareOnboardingAudit.insertMany(documents);
};

const comparableValue = (value: unknown) =>
    value instanceof Date ? value.toISOString() : value ?? null;

const valuesDiffer = (left: unknown, right: unknown) =>
    comparableValue(left) !== comparableValue(right);

const buildStepAuditEntries = (
    onboardingId: Types.ObjectId,
    previous: IOnboardingStep,
    next: IOnboardingStep,
    now: Date
): NewAuditEntry[] => {
    const base = {
        onboardingId,
        actorType: "admin" as const,
        actorLabel: "shared-admin",
        stepKey: next.key,
        createdAt: now,
    };
    const changes: Array<{
        action: string;
        previousValue: unknown;
        newValue: unknown;
    }> = [];

    const addChange = (
        action: string,
        previousValue: unknown,
        newValue: unknown
    ) => {
        if (valuesDiffer(previousValue, newValue)) {
            changes.push({ action, previousValue, newValue });
        }
    };

    addChange(
        DAYCARE_ONBOARDING_AUDIT_ACTIONS.stepStatusChanged,
        previous.status,
        next.status
    );
    addChange(
        DAYCARE_ONBOARDING_AUDIT_ACTIONS.stepSourceChanged,
        previous.source,
        next.source
    );
    addChange(
        DAYCARE_ONBOARDING_AUDIT_ACTIONS.responsiblePartyChanged,
        previous.responsibleParty,
        next.responsibleParty
    );
    addChange(
        DAYCARE_ONBOARDING_AUDIT_ACTIONS.internalNoteChanged,
        previous.internalNote,
        next.internalNote
    );
    addChange(
        DAYCARE_ONBOARDING_AUDIT_ACTIONS.parentMessageChanged,
        previous.parentMessage,
        next.parentMessage
    );
    addChange(
        DAYCARE_ONBOARDING_AUDIT_ACTIONS.stepVisibilityChanged,
        previous.isVisibleToParent,
        next.isVisibleToParent
    );
    addChange(
        DAYCARE_ONBOARDING_AUDIT_ACTIONS.completedAtChanged,
        previous.completedAt,
        next.completedAt
    );

    return changes.map((change) => ({ ...base, ...change }));
};

export const updateAdminOnboardingStep = async (
    onboardingId: string,
    stepKey: string,
    patch: AdminOnboardingStepPatchDto,
    now = new Date()
) => {
    const onboarding = await getOnboardingOrThrow(onboardingId);
    const stepIndex = onboarding.steps.findIndex(
        (step) => step.key === stepKey
    );

    if (stepIndex < 0) {
        throw new DaycareOnboardingServiceError(
            "Onboarding step not found",
            404,
            "STEP_NOT_FOUND"
        );
    }

    if (patch.status === "completed" && stepKey === "registrationFeeReceived") {
        if ((onboarding.standingOrderStatus ?? "pending") !== "active") {
            throw new DaycareOnboardingServiceError(
                "אפשר לאשר את הוראת הקבע רק לאחר שהתקבל אישור מנדרים.",
                409,
                "PAYMENT_REQUIRES_ACTIVE_STANDING_ORDER"
            );
        }
    }

    if (patch.status === "completed" && stepKey === "registrationApproved") {
        const paymentStep = onboarding.steps.find(
            (step) => step.key === "registrationFeeReceived"
        );
        if (paymentStep?.status !== "completed" && paymentStep?.status !== "notRequired") {
            throw new DaycareOnboardingServiceError(
                "אפשר להשלים את הרישום והשיבוץ רק לאחר אישור התשלום.",
                409,
                "PLACEMENT_REQUIRES_APPROVED_PAYMENT"
            );
        }
    }

    if (stepKey === "agreementSigned" && patch.status !== undefined) {
        const agreement = await DaycareAgreement.findOne({ onboardingId: onboarding._id }).sort({ revision: -1 }).select("status");
        if (agreement && agreement.status !== patch.status) {
            throw new DaycareOnboardingServiceError(
                "סטטוס של הסכם שנשלח מתעדכן רק באזור בדיקת ההסכם.",
                409,
                "AGREEMENT_STATUS_MANAGED_SEPARATELY"
            );
        }
    }

    if (stepKey === "healthDeclarationSubmitted" && patch.status !== undefined) {
        const declaration = await DaycareHealthDeclaration.findOne({ onboardingId: onboarding._id }).sort({ revision: -1 }).select("status");
        if (declaration && declaration.status !== patch.status) {
            throw new DaycareOnboardingServiceError(
                "סטטוס של הצהרת בריאות שנשלחה מתעדכן רק באזור בדיקת ההצהרה.",
                409,
                "HEALTH_STATUS_MANAGED_SEPARATELY"
            );
        }
    }

    if (stepKey === "pickupAuthorizationSubmitted" && patch.status !== undefined) {
        const authorization = await DaycarePickupAuthorization.findOne({ onboardingId: onboarding._id }).sort({ revision: -1 }).select("status");
        if (authorization && authorization.status !== patch.status) {
            throw new DaycareOnboardingServiceError(
                "סטטוס של מורשי איסוף שנשלחו מתעדכן רק באזור בדיקת המסמך.",
                409,
                "PICKUP_STATUS_MANAGED_SEPARATELY"
            );
        }
    }

    const previous = cloneOnboardingStep(onboarding.steps[stepIndex]);
    const next = applyAdminStepPatch(previous, patch, now);
    onboarding.steps[stepIndex] = next;
    const correctionStepKeys = new Set([
        "childAndGuardianDetails",
        "agreementSigned",
        "healthDeclarationSubmitted",
        "pickupAuthorizationSubmitted",
    ]);
    const downstreamPreviousSteps: IOnboardingStep[] = [];
    let registrationWasCompleted = false;

    if (next.status === "requiresCorrection" && correctionStepKeys.has(stepKey)) {
        for (const downstreamKey of ["registrationApproved"]) {
            const downstreamIndex = onboarding.steps.findIndex(
                (step) => step.key === downstreamKey
            );
            if (downstreamIndex < 0) continue;

            const downstreamPrevious = cloneOnboardingStep(
                onboarding.steps[downstreamIndex]
            );
            if (downstreamKey === "registrationApproved" && downstreamPrevious.status === "completed") {
                registrationWasCompleted = true;
            }
            if (downstreamPrevious.status === "notStarted") continue;

            downstreamPreviousSteps.push(downstreamPrevious);
            onboarding.steps[downstreamIndex] = {
                ...downstreamPrevious,
                status: "notStarted",
                source: "automatic",
                completedAt: undefined,
                updatedAt: new Date(now),
                updatedBy: "automatic",
                parentMessage: undefined,
            };
        }
        onboarding.overallStatusOverride = undefined;
        onboarding.parentSubmittedAt = undefined;
    }
    onboarding.markModified("steps");
    onboarding.overallStatus = calculateOverallStatus(onboarding.steps);
    await onboarding.save();

    if (stepKey === "registrationApproved" && next.status === "completed") {
        const originRecordId = onboarding.origin?.recordId;

        if (originRecordId && onboarding.origin?.type === "daycareRegistration") {
            await DaycareRegistration.updateOne(
                { _id: originRecordId },
                { $set: { status: "נרשם" } }
            ).exec();
        }

        if (originRecordId && onboarding.origin?.type === "daycareLead") {
            await DaycareLead.updateOne(
                { _id: originRecordId },
                { $set: { status: "נרשם" } }
            ).exec();
        }
    }

    if (registrationWasCompleted) {
        const originRecordId = onboarding.origin?.recordId;
        if (originRecordId && onboarding.origin?.type === "daycareRegistration") {
            await DaycareRegistration.updateOne(
                { _id: originRecordId },
                { $set: { status: "רוצה להירשם" } }
            ).exec();
        }
        if (originRecordId && onboarding.origin?.type === "daycareLead") {
            await DaycareLead.updateOne(
                { _id: originRecordId },
                { $set: { status: "רוצה להירשם" } }
            ).exec();
        }
    }

    await createAuditEntries(
        [
            ...buildStepAuditEntries(onboarding._id, previous, next, now),
            ...downstreamPreviousSteps.flatMap((downstreamPrevious) => {
                const downstreamNext = onboarding.steps.find(
                    (step) => step.key === downstreamPrevious.key
                );
                return downstreamNext
                    ? buildStepAuditEntries(
                          onboarding._id,
                          downstreamPrevious,
                          cloneOnboardingStep(downstreamNext),
                          now
                      )
                    : [];
            }),
        ]
    );

    const { child, family } = await getIdentityOrThrow(onboarding);
    return toAdminOnboardingDetail(onboarding, child, family);
};

export const updateAdminOverallStatus = async (
    onboardingId: string,
    override: OnboardingOverallStatus | null,
    now = new Date()
) => {
    const onboarding = await getOnboardingOrThrow(onboardingId);
    const previous = onboarding.overallStatusOverride ?? null;
    onboarding.overallStatusOverride = override ?? undefined;
    onboarding.overallStatus = calculateOverallStatus(onboarding.steps);
    await onboarding.save();

    if (previous !== (override ?? null)) {
        await createAuditEntries([
            {
                onboardingId: onboarding._id,
                actorType: "admin",
                actorLabel: "shared-admin",
                action:
                    DAYCARE_ONBOARDING_AUDIT_ACTIONS.overallStatusOverrideChanged,
                previousValue: previous,
                newValue: override,
                createdAt: now,
            },
        ]);
    }

    const { child, family } = await getIdentityOrThrow(onboarding);
    return toAdminOnboardingDetail(onboarding, child, family);
};

export const revokeParentAccess = async (
    onboardingId: string,
    now = new Date()
) => {
    const onboarding = await getOnboardingOrThrow(onboardingId);

    if (onboarding.parentAccessEnabled) {
        const invalidatedTokenHash = hashParentAccessToken(
            generateParentAccessToken()
        );
        onboarding.parentAccessEnabled = false;
        onboarding.parentAccessTokenHash = invalidatedTokenHash;
        onboarding.parentAccessTokenCreatedAt = new Date(now);
        onboarding.parentAccessTokenExpiresAt = new Date(now);
        onboarding.lastParentAccessAt = undefined;
        await onboarding.save();
        await createAuditEntries([
            {
                onboardingId: onboarding._id,
                actorType: "admin",
                actorLabel: "shared-admin",
                action:
                    DAYCARE_ONBOARDING_AUDIT_ACTIONS.parentLinkRevoked,
                previousValue: true,
                newValue: false,
                createdAt: now,
            },
        ]);
    }

    const { child, family } = await getIdentityOrThrow(onboarding);
    return toAdminOnboardingDetail(onboarding, child, family);
};

export const updateParentAccess = async (
    onboardingId: string,
    enabled: false,
    now = new Date()
) => {
    if (enabled !== false) {
        throw new DaycareOnboardingServiceError(
            "A revoked link cannot be re-enabled",
            400,
            "PARENT_LINK_REQUIRES_REGENERATION"
        );
    }

    return revokeParentAccess(onboardingId, now);
};

export const regenerateOnboardingParentAccess = async (
    onboardingId: string,
    now = new Date(),
    rawToken = generateParentAccessToken()
) => {
    const onboarding = await getOnboardingOrThrow(
        onboardingId,
        true
    );
    const credentials = createParentAccessCredentials(now, rawToken);
    onboarding.parentAccessTokenHash = credentials.tokenHash;
    onboarding.parentAccessTokenCreatedAt = credentials.createdAt;
    onboarding.parentAccessTokenExpiresAt = credentials.expiresAt;
    onboarding.parentAccessEnabled = true;
    onboarding.lastParentAccessAt = undefined;
    await onboarding.save();

    await createAuditEntries([
        {
            onboardingId: onboarding._id,
            actorType: "admin",
            actorLabel: "shared-admin",
            action:
                DAYCARE_ONBOARDING_AUDIT_ACTIONS.parentLinkRegenerated,
            newValue: { expiresAt: credentials.expiresAt },
            createdAt: now,
        },
    ]);

    const { child, family } = await getIdentityOrThrow(onboarding);

    return {
        data: toAdminOnboardingDetail(onboarding, child, family),
        rawToken: credentials.rawToken,
    };
};

export const listOnboardingAudit = async (onboardingId: string) => {
    const onboarding = await getOnboardingOrThrow(onboardingId);
    const entries = await DaycareOnboardingAudit.find({
        onboardingId: onboarding._id,
    })
        .sort({ createdAt: -1 })
        .exec();

    return entries.map((entry) => ({
        id: entry.id,
        actorType: entry.actorType,
        actorId: entry.actorId,
        actorLabel: entry.actorLabel,
        action: entry.action,
        stepKey: entry.stepKey,
        previousValue: entry.previousValue,
        newValue: entry.newValue,
        createdAt: entry.createdAt,
    }));
};
