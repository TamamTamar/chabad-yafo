import {
    onboardingStepSourceLabels,
    onboardingStepStatusLabels,
    type AdminOnboardingStep,
    type OnboardingResponsibleParty,
    type OnboardingStepSource,
    type OnboardingStepStatus,
} from "../../../types/daycareOnboarding";

export type StepDraft = {
    status: OnboardingStepStatus;
    source: OnboardingStepSource;
    responsibleParty: OnboardingResponsibleParty;
    isVisibleToParent: boolean;
    completedAt: string;
    internalNote: string;
    parentMessage: string;
};

export type LocationState = {
    parentAccessUrl?: string;
};

export const stepStatuses = Object.keys(
    onboardingStepStatusLabels
) as OnboardingStepStatus[];
export const stepSources = Object.keys(
    onboardingStepSourceLabels
) as OnboardingStepSource[];
export const formatDate = (value?: string) =>
    value
        ? new Date(value).toLocaleDateString("he-IL", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
          })
        : "—";

export const formatDateTime = (value: string) =>
    new Date(value).toLocaleString("he-IL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

const toDateInputValue = (value?: string) =>
    value ? new Date(value).toISOString().slice(0, 10) : "";

export const createStepDraft = (step: AdminOnboardingStep): StepDraft => ({
    status: step.status,
    source: step.source ?? "admin",
    responsibleParty: step.responsibleParty,
    isVisibleToParent: step.isVisibleToParent,
    completedAt: toDateInputValue(step.completedAt),
    internalNote: step.internalNote ?? "",
    parentMessage: step.parentMessage ?? "",
});

export const createDraftMap = (steps: AdminOnboardingStep[]) =>
    Object.fromEntries(
        steps.map((step) => [step.key, createStepDraft(step)])
    ) as Record<string, StepDraft>;

export const guardianRoleLabels: Record<string, string> = {
    mother: "אם",
    father: "אב",
    guardian: "אפוטרופוס/ית",
    grandfather: "סבא",
    grandmother: "סבתא",
    other: "אחר",
};

export const stepGuidance: Record<string, string> = {
    onboardingOpened: "השלב נוצר אוטומטית. אין צורך למלא כאן דבר.",
    childAndGuardianDetails:
        "ההורה ממלא את פרטי הילד והמשפחה בקישור האישי. כשהפרטים מתקבלים, בדקי אותם ואשרי את השלב או כתבי להורה מה לתקן.",
    agreementSigned:
        "ההורה חותם בקישור האישי. אם הועלה PDF, בדקי אותו באזור ההסכם שמעל ואשרי או החזירי לתיקון.",
    registrationFeeReceived:
        "כל הפרטים והמסמכים אושרו. לאחר שווידאת שהתשלום ואמצעי התשלום הוסדרו, אשרי את התשלום.",
    healthDeclarationSubmitted:
        "בדקי שהצהרת הבריאות התקבלה ומלאה. אם חסר מידע, כתבי הודעה להורה באפשרויות המתקדמות.",
    pickupAuthorizationSubmitted:
        "בדקי את פרטי מורשי האיסוף ואת הטופס החתום. אם חסר מידע, החזירי את המסמך לתיקון.",
    registrationApproved:
        "התשלום אושר. בחרי את הקבוצה המתאימה ואשרי את השיבוץ. הפעולה תעדכן אוטומטית את הילד/ה לסטטוס „נרשם”.",
};

export const completeActionLabel = (step: AdminOnboardingStep) => {
    if (step.key === "childAndGuardianDetails" && step.status === "pendingReview") {
        return "אישור פרטי הילד והמשפחה";
    }
    if (step.key === "registrationFeeReceived") {
        return "אישור שהתשלום הוסדר";
    }
    if (step.key === "registrationApproved") {
        return "אישור השיבוץ והשלמת הרישום";
    }
    return "סימון כהושלם";
};

export const isStepComplete = (status: OnboardingStepStatus) =>
    status === "completed" || status === "notRequired";
