import { Schema } from "mongoose";
import { DAYCARE_ONBOARDING_STEP_DEFINITIONS } from "../config/daycareOnboardingDefaults";
import {
    onboardingActionTypes,
    onboardingOverallStatuses,
    onboardingOriginTypes,
    onboardingResponsibleParties,
    legacyOnboardingStepKeys,
    onboardingStepKeys,
    onboardingStepSources,
    onboardingStepStatuses,
    type IDaycareOnboarding,
    type IOnboardingStep,
} from "../types/daycareOnboarding";

const onboardingOriginSchema = new Schema(
    {
        type: {
            type: String,
            required: true,
            enum: onboardingOriginTypes,
            immutable: true,
        },
        recordId: {
            type: Schema.Types.ObjectId,
            immutable: true,
        },
    },
    { _id: false }
);

const relatedRecordSchema = new Schema(
    {
        type: {
            type: String,
            trim: true,
            maxlength: 120,
        },
        recordId: {
            type: Schema.Types.ObjectId,
        },
        formKey: {
            type: String,
            trim: true,
            maxlength: 120,
        },
        documentKey: {
            type: String,
            trim: true,
            maxlength: 120,
        },
    },
    { _id: false }
);

const isConsecutiveSchoolYear = (value: string) => {
    const match = /^(\d{4})-(\d{4})$/.exec(value);

    return Boolean(
        match &&
            Number(match[1]) >= 2000 &&
            Number(match[2]) === Number(match[1]) + 1
    );
};

const hasCompleteDefaultStepSet = (steps: IOnboardingStep[]) => {
    const keys = steps.map((step) => step.key);
    const orders = steps.map((step) => step.order);
    const matchesStepSet = (expectedKeys: readonly string[]) =>
        steps.length === expectedKeys.length &&
        new Set(keys).size === expectedKeys.length &&
        expectedKeys.every((key) => keys.includes(key as IOnboardingStep["key"]));

    return (
        (matchesStepSet(
            DAYCARE_ONBOARDING_STEP_DEFINITIONS.map((step) => step.key)
        ) ||
            matchesStepSet(onboardingStepKeys) ||
            matchesStepSet(legacyOnboardingStepKeys)) &&
        new Set(orders).size === steps.length &&
        orders.every(
            (order) =>
                Number.isInteger(order) &&
                order >= 1 &&
                order <= steps.length
        )
    );
};

const allOnboardingStepKeys = [
    ...onboardingStepKeys,
    ...legacyOnboardingStepKeys,
];

const onboardingStepSchema = new Schema<IOnboardingStep>(
    {
        key: {
            type: String,
            required: true,
            enum: allOnboardingStepKeys,
            immutable: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 180,
            immutable: true,
        },
        description: {
            type: String,
            trim: true,
            maxlength: 600,
            immutable: true,
        },
        status: {
            type: String,
            required: true,
            enum: onboardingStepStatuses,
            default: "notStarted",
        },
        source: {
            type: String,
            enum: onboardingStepSources,
        },
        responsibleParty: {
            type: String,
            required: true,
            enum: onboardingResponsibleParties,
            default: "admin",
        },
        actionType: {
            type: String,
            required: true,
            enum: onboardingActionTypes,
            default: "noAction",
        },
        actionUrl: {
            type: String,
            trim: true,
            maxlength: 2000,
        },
        isAvailable: {
            type: Boolean,
            required: true,
            default: false,
        },
        requiresAdminApproval: {
            type: Boolean,
            required: true,
            default: false,
        },
        isVisibleToParent: {
            type: Boolean,
            required: true,
            default: true,
        },
        order: {
            type: Number,
            required: true,
            min: 1,
            immutable: true,
        },
        completedAt: Date,
        updatedAt: {
            type: Date,
            required: true,
            default: Date.now,
        },
        updatedBy: {
            type: String,
            trim: true,
            maxlength: 120,
        },
        internalNote: {
            type: String,
            trim: true,
            maxlength: 2000,
        },
        parentMessage: {
            type: String,
            trim: true,
            maxlength: 1000,
        },
        relatedRecord: {
            type: relatedRecordSchema,
            required: false,
        },
    },
    { _id: false }
);

export const daycareOnboardingSchema = new Schema<IDaycareOnboarding>(
    {
        familyId: {
            type: Schema.Types.ObjectId,
            required: false,
            ref: "DaycareFamily",
            index: true,
        },
        childId: {
            type: Schema.Types.ObjectId,
            required: false,
            ref: "DaycareChild",
            index: true,
        },
        schoolYear: {
            type: String,
            required: true,
            trim: true,
            validate: {
                validator: isConsecutiveSchoolYear,
                message: "schoolYear must use consecutive YYYY-YYYY years",
            },
            immutable: true,
        },
        origin: {
            type: onboardingOriginSchema,
            required: false,
        },
        temporaryParentName: {
            type: String,
            trim: true,
            maxlength: 160,
        },
        temporaryParentPhone: {
            type: String,
            trim: true,
            maxlength: 30,
        },
        temporaryChildAge: {
            type: String,
            trim: true,
            maxlength: 120,
        },
        profileStatus: {
            type: String,
            enum: ["incomplete", "complete"],
            required: true,
            default: "complete",
        },
        internalNote: {
            type: String,
            trim: true,
            maxlength: 2000,
        },
        overallStatus: {
            type: String,
            required: true,
            enum: onboardingOverallStatuses,
            default: "new",
        },
        overallStatusOverride: {
            type: String,
            enum: onboardingOverallStatuses,
        },
        parentSubmissionRequired: Boolean,
        parentSubmittedAt: Date,
        steps: {
            type: [onboardingStepSchema],
            required: true,
            validate: {
                validator: hasCompleteDefaultStepSet,
                message: "Onboarding must contain one complete unique step template",
            },
        },
        parentAccessTokenHash: {
            type: String,
            required: true,
            select: false,
            match: /^[a-f0-9]{64}$/,
        },
        parentAccessTokenCreatedAt: {
            type: Date,
            required: true,
        },
        parentAccessTokenExpiresAt: {
            type: Date,
            required: true,
        },
        parentAccessEnabled: {
            type: Boolean,
            required: true,
            default: true,
        },
        lastParentAccessAt: Date,
    },
    {
        autoIndex: false,
        timestamps: true,
        optimisticConcurrency: true,
        toJSON: {
            transform: (_document, returnedObject) => {
                delete (returnedObject as Partial<IDaycareOnboarding>)
                    .parentAccessTokenHash;
                return returnedObject;
            },
        },
        toObject: {
            transform: (_document, returnedObject) => {
                delete (returnedObject as Partial<IDaycareOnboarding>)
                    .parentAccessTokenHash;
                return returnedObject;
            },
        },
    }
);

daycareOnboardingSchema.index(
    { childId: 1, schoolYear: 1 },
    {
        unique: true,
        partialFilterExpression: { childId: { $exists: true } },
    }
);

daycareOnboardingSchema.index(
    {
        "origin.type": 1,
        "origin.recordId": 1,
        schoolYear: 1,
    },
    {
        unique: true,
        partialFilterExpression: {
            "origin.recordId": { $exists: true },
        },
    }
);
daycareOnboardingSchema.index(
    { parentAccessTokenHash: 1 },
    { unique: true }
);
