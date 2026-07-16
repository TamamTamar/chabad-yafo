import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { Types, startSession, type ClientSession, type HydratedDocument } from "mongoose";
import { DAYCARE_ONBOARDING_STEP_DEFINITIONS } from "../config/daycareOnboardingDefaults";
import { DAYCARE_ONBOARDING_AUDIT_ACTIONS } from "../config/daycareOnboardingAuditActions";
import { DaycareChild } from "../models/DaycareChild";
import { DaycareFamily } from "../models/DaycareFamily";
import { DaycareAgreement } from "../models/DaycareAgreement";
import { DaycareHealthDeclaration } from "../models/DaycareHealthDeclaration";
import { DaycarePickupAuthorization } from "../models/DaycarePickupAuthorization";
import { DaycareOnboarding } from "../models/DaycareOnboarding";
import { DaycareOnboardingAudit } from "../models/DaycareOnboardingAudit";
import { DaycareLead } from "../models/DaycareLead";
import { DaycareRegistration } from "../models/DaycareRegistration";
import { getDaycareStorageProvider } from "./daycareStorageService";
import { logger } from "../utils/logger";
import type { IDaycareChild } from "../types/daycareChild";
import type { IDaycareFamily } from "../types/daycareFamily";
import type {
    AdminOnboardingDetailDto,
    AdminOnboardingListItemDto,
    AdminOnboardingStepPatchDto,
    IDaycareOnboarding,
    IDaycareOnboardingOrigin,
    IOnboardingStep,
    OnboardingOverallStatus,
    OnboardingProgress,
    PublicDaycareOnboardingDto,
    PublicOnboardingStep,
    SubmitPublicDaycareProfileDto,
} from "../types/daycareOnboarding";
import type {
    IDaycareOnboardingAudit,
    OnboardingAuditActorType,
} from "../types/daycareOnboardingAudit";

type DaycareFamilyDocument = HydratedDocument<IDaycareFamily>;
type DaycareChildDocument = HydratedDocument<IDaycareChild>;
type DaycareOnboardingDocument = HydratedDocument<IDaycareOnboarding>;

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

const cloneDate = (value: Date | undefined) =>
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
    calculateOverallStatus(onboarding.steps);

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

const getMissingStepTitle = (steps: readonly IOnboardingStep[]) =>
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
            profileStep.status !== "pendingReview" &&
            profileStep.status !== "completed" &&
            profileStep.status !== "notRequired"
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

    return {
        childName: child
            ? `${child.firstName} ${child.lastName}`.trim()
            : "פרטי הילד טרם הושלמו",
        schoolYear: onboarding.schoolYear,
        profileStatus:
            onboarding.profileStatus ?? (child ? "complete" : "incomplete"),
        overallStatus: getEffectiveOverallStatus(onboarding),
        progress: calculateOnboardingProgress(onboarding.steps),
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
    calculatedOverallStatus: calculateOverallStatus(onboarding.steps),
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

const assertValidObjectId = (
    id: string,
    message: string,
    code: string
) => {
    if (!Types.ObjectId.isValid(id)) {
        throw new DaycareOnboardingServiceError(message, 404, code);
    }
};

const getOnboardingOrThrow = async (
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

const getIdentityOrThrow = async (
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
        const requiredDocumentSteps = [
            "childAndGuardianDetails",
            "agreementSigned",
            "healthDeclarationSubmitted",
            "pickupAuthorizationSubmitted",
        ];
        const documentsApproved = requiredDocumentSteps.every((requiredKey) => {
            const requiredStep = onboarding.steps.find((step) => step.key === requiredKey);
            return requiredStep?.status === "completed" || requiredStep?.status === "notRequired";
        });

        if (!documentsApproved) {
            throw new DaycareOnboardingServiceError(
                "אפשר לאשר את התשלום רק לאחר שכל הפרטים והמסמכים אושרו.",
                409,
                "PAYMENT_REQUIRES_APPROVED_DOCUMENTS"
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
        for (const downstreamKey of ["registrationFeeReceived", "registrationApproved"]) {
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
                step.status === "completed" ||
                step.status === "notRequired"
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
            onboarding.overallStatus = calculateOverallStatus(onboarding.steps);
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

const trustedPublicOrigins = new Set([
    "https://www.chabadyafo.org",
    "https://chabadyafo.org",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]);

const normalizePublicOrigin = (value: string | undefined) => {
    if (!value) {
        return undefined;
    }

    try {
        return new URL(value).origin;
    } catch {
        return undefined;
    }
};

const selectPublicOrigin = (requestOrigin?: string) => {
    const normalizedRequestOrigin = normalizePublicOrigin(requestOrigin);
    const configuredOrigins = (process.env.CLIENT_ORIGIN ?? "")
        .split(",")
        .map((origin) => normalizePublicOrigin(origin.trim()))
        .filter((origin): origin is string => Boolean(origin));
    const allowedOrigins = new Set([
        ...trustedPublicOrigins,
        ...configuredOrigins,
    ]);

    if (
        normalizedRequestOrigin &&
        allowedOrigins.has(normalizedRequestOrigin)
    ) {
        return normalizedRequestOrigin;
    }

    const configuredOrigin =
        process.env.PUBLIC_SITE_URL ||
        process.env.CLIENT_ORIGIN?.split(",")[0]?.trim() ||
        "https://chabadyafo.org";

    return normalizePublicOrigin(configuredOrigin) ?? "https://chabadyafo.org";
};

export const buildParentAccessUrl = (
    rawToken: string,
    requestOrigin?: string
) =>
    `${selectPublicOrigin(requestOrigin)}/daycare/onboarding/${encodeURIComponent(rawToken)}`;

export type { IDaycareOnboardingAudit };
