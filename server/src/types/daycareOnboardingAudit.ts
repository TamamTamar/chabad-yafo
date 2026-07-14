import type { Types } from "mongoose";

export const onboardingAuditActorTypes = [
    "admin",
    "automatic",
    "parent",
] as const;

export type OnboardingAuditActorType =
    (typeof onboardingAuditActorTypes)[number];

export interface IDaycareOnboardingAudit {
    onboardingId: Types.ObjectId;
    actorType: OnboardingAuditActorType;
    actorId?: string;
    actorLabel?: string;
    action: string;
    stepKey?: string;
    previousValue?: unknown;
    newValue?: unknown;
    createdAt: Date;
}
