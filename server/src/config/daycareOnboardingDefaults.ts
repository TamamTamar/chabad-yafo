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
        title: "פתיחת תיק הצטרפות",
        description: "תיק ההצטרפות האישי נפתח ונוצר קישור מאובטח להמשך התהליך.",
        responsibleParty: "automatic",
        actionType: "noAction",
        isAvailable: false,
        requiresAdminApproval: false,
        isVisibleToParent: false,
        order: 1,
    },
    {
        ...parentStep,
        key: "childAndGuardianDetails",
        title: "פרטי הילד וההורים",
        description: "יש להשלים את פרטי הילד והאפוטרופוסים.",
        actionType: "openForm",
        isAvailable: true,
        order: 2,
    },
    {
        ...parentStep,
        key: "agreementSigned",
        title: "הסכם התקשרות",
        description: "יש לקרוא ולחתום על הסכם ההתקשרות עם המעון.",
        actionType: "openAgreement",
        isAvailable: true,
        order: 3,
    },
    {
        ...parentStep,
        key: "healthDeclarationSubmitted",
        title: "בריאות והרשאות",
        description: "יש להשלים את הצהרת הבריאות ואת פרטי מורשי האיסוף.",
        order: 4,
    },
    {
        ...parentStep,
        key: "pickupAuthorizationSubmitted",
        title: "מורשי איסוף",
        description: "יש למסור את פרטי מורשי האיסוף והגבלות האיסוף.",
        order: 5,
    },
    {
        ...adminStep,
        key: "registrationFeeReceived",
        title: "הוראת קבע לשכר לימוד",
        description: "אפשר להקים את הוראת הקבע בכל שלב. לאחר אישור נדרים, צוות המעון יאשר אותה ידנית.",
        order: 6,
    },
    {
        ...adminStep,
        key: "registrationApproved",
        title: "ממתין לשיבוץ בקבוצה",
        description: "לאחר אישור התשלום, צוות המעון ישבץ את הילד/ה בקבוצה המתאימה וישלים את הרישום.",
        order: 7,
    },
];

export const DAYCARE_ONBOARDING_STEP_DEFINITIONS = Object.freeze(
    definitions.map((definition) => Object.freeze({ ...definition }))
);
