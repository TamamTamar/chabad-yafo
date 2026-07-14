export const DAYCARE_ONBOARDING_AUDIT_ACTIONS = {
    familyCreated: "familyCreated",
    childCreated: "childCreated",
    identityProfileSubmitted: "identityProfileSubmitted",
    identityProfileUpdated: "identityProfileUpdated",
    onboardingCreated: "onboardingCreated",
    legacyImported: "legacyImported",
    registrationSourceLinked: "registrationSourceLinked",
    manualOnboardingCreated: "manualOnboardingCreated",
    stepStatusChanged: "stepStatusChanged",
    stepSourceChanged: "stepSourceChanged",
    responsiblePartyChanged: "responsiblePartyChanged",
    internalNoteChanged: "internalNoteChanged",
    parentMessageChanged: "parentMessageChanged",
    stepVisibilityChanged: "stepVisibilityChanged",
    completedAtChanged: "completedAtChanged",
    overallStatusOverrideChanged: "overallStatusOverrideChanged",
    parentLinkCreated: "parentLinkCreated",
    parentLinkRevoked: "parentLinkRevoked",
    parentLinkRegenerated: "parentLinkRegenerated",
    agreementSignedOnline: "agreementSignedOnline",
    agreementFinalPdfCreated: "agreementFinalPdfCreated",
    agreementCopyDownloaded: "agreementCopyDownloaded",
    agreementPdfUploaded: "agreementPdfUploaded",
    agreementReviewed: "agreementReviewed",
} as const;

export type DaycareOnboardingAuditAction =
    (typeof DAYCARE_ONBOARDING_AUDIT_ACTIONS)[keyof typeof DAYCARE_ONBOARDING_AUDIT_ACTIONS];
