import type {
    OnboardingActionType,
    OnboardingResponsibleParty,
    OnboardingStepKey,
} from "../types/daycareOnboarding";

export interface DaycareOnboardingStepDefinition {
    readonly key: OnboardingStepKey;
    readonly title: string;
    readonly description: string;
    readonly responsibleParty: OnboardingResponsibleParty;
    readonly actionType: OnboardingActionType;
    readonly isAvailable: boolean;
    readonly requiresAdminApproval: boolean;
    readonly isVisibleToParent: boolean;
    readonly order: number;
}

const parentStep = {
    responsibleParty: "parent" as const,
    actionType: "noAction" as const,
    isAvailable: false,
    requiresAdminApproval: true,
    isVisibleToParent: true,
};

const adminStep = {
    responsibleParty: "admin" as const,
    actionType: "noAction" as const,
    isAvailable: false,
    requiresAdminApproval: false,
    isVisibleToParent: true,
};

const definitions: readonly DaycareOnboardingStepDefinition[] = [
    {
        key: "onboardingOpened",
        title: "תיק הצטרפות נפתח",
        description: "תיק ההצטרפות האישי נפתח ונוצר קישור מאובטח להמשך התהליך.",
        responsibleParty: "automatic",
        actionType: "noAction",
        isAvailable: false,
        requiresAdminApproval: false,
        isVisibleToParent: true,
        order: 1,
    },
    {
        ...parentStep,
        key: "childAndGuardianDetails",
        title: "פרטי הילד וההורים הושלמו",
        description: "יש להשלים את פרטי הילד והאפוטרופוסים.",
        actionType: "openForm",
        isAvailable: true,
        order: 2,
    },
    {
        ...parentStep,
        key: "agreementSigned",
        title: "הסכם התקשרות נחתם",
        description: "יש לקרוא ולחתום על הסכם ההתקשרות עם המעון.",
        actionType: "openAgreement",
        isAvailable: true,
        order: 3,
    },
    {
        ...adminStep,
        key: "registrationFeeReceived",
        title: "דמי רישום התקבלו",
        description: "צוות המעון יאשר את קבלת דמי הרישום.",
        order: 4,
    },
    {
        ...parentStep,
        key: "healthDeclarationSubmitted",
        title: "הצהרת בריאות הוגשה",
        description: "יש להגיש הצהרת בריאות מעודכנת עבור הילד/ה.",
        order: 5,
    },
    {
        ...parentStep,
        key: "pickupAuthorizationSubmitted",
        title: "מורשי איסוף הוגשו",
        description: "יש למסור את פרטי מורשי האיסוף והגבלות האיסוף.",
        order: 6,
    },
    {
        ...parentStep,
        key: "parentPermissionsSubmitted",
        title: "הרשאות הורים הוגשו",
        description: "יש להשלים את ההרשאות וההסכמות הנדרשות.",
        order: 7,
    },
    {
        ...adminStep,
        key: "groupAssigned",
        title: "הילד שובץ בקבוצה",
        description: "צוות המעון יעדכן את השיבוץ לקבוצה המתאימה.",
        order: 8,
    },
    {
        key: "adjustmentDayScheduled",
        title: "יום הסתגלות נקבע",
        description: "נתאם יחד מועד ליום ההסתגלות.",
        responsibleParty: "both",
        actionType: "noAction",
        isAvailable: false,
        requiresAdminApproval: false,
        isVisibleToParent: true,
        order: 9,
    },
    {
        ...adminStep,
        key: "registrationApproved",
        title: "ההרשמה אושרה סופית",
        description: "צוות המעון יאשר סופית את השלמת ההרשמה.",
        order: 10,
    },
];

export const DAYCARE_ONBOARDING_STEP_DEFINITIONS = Object.freeze(
    definitions.map((definition) => Object.freeze({ ...definition }))
);
