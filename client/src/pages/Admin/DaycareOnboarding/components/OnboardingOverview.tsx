import type { AdminDaycareOnboarding, AdminOnboardingStep, OnboardingStepStatus } from "../../../../types/daycareOnboarding";
import { onboardingResponsiblePartyLabels, onboardingStepStatusLabels } from "../../../../types/daycareOnboarding";
import { stepGuidance } from "../daycareOnboardingAdminUtils";
import styles from "../DaycareOnboardingAdmin.module.scss";

type ReviewChecklistItem = {
    key: string;
    title: string;
    status: OnboardingStepStatus;
    target: string;
};

type Props = {
    onboarding: AdminDaycareOnboarding;
    adminProgressPercentage: number;
    adminCompletedSteps: number;
    manageableStepCount: number;
    notice: string;
    error: string;
    reviewChecklist: readonly ReviewChecklistItem[];
    allDocumentsSubmitted: boolean;
    allDocumentsApproved: boolean;
    nextStep?: AdminOnboardingStep;
    scrollToCaseSection: (target: string) => void;
};

const OnboardingOverview = ({
    onboarding, adminProgressPercentage, adminCompletedSteps, manageableStepCount,
    notice, error, reviewChecklist, allDocumentsSubmitted, allDocumentsApproved,
    nextStep, scrollToCaseSection,
}: Props) => (
    <>
<section className={styles.headerCard}>
                    <div className={styles.headerCopy}>
                        <span className={styles.eyebrow}>תיק הצטרפות למעון</span>
                        <h1 className={styles.title}>
                            {onboarding.child.firstName || onboarding.child.lastName
                                ? `${onboarding.child.firstName ?? ""} ${onboarding.child.lastName ?? ""}`.trim()
                                : "פרטי הילד טרם הושלמו"}
                        </h1>
                        <p className={styles.subtitle}>
                            שנת לימודים {onboarding.schoolYear}
                            {onboarding.profileStatus === "incomplete"
                                ? " · פרופיל התחלתי"
                                : ""}
                            {onboarding.guardians[0]
                                ? ` · ${onboarding.guardians[0].fullName} · ${onboarding.guardians[0].phone}`
                                : ""}
                        </p>
                    </div>
                    <div className={styles.progressSummary}>
                        <strong className={styles.progressNumber}>
                            {adminProgressPercentage}%
                        </strong>
                        <span className={styles.progressText}>
                            {adminCompletedSteps} מתוך {manageableStepCount} שלבים
                        </span>
                    </div>
                </section>

                <div className={styles.feedback} aria-live="polite" aria-atomic="true">
                    {notice && <span className={styles.notice}>{notice}</span>}
                    {error && <span className={styles.error} role="alert">{error}</span>}
                </div>

                <section className={styles.reviewOverview} aria-labelledby="review-overview-title">
                    <div className={styles.reviewOverviewHeading}>
                        <div>
                            <span className={styles.eyebrow}>בדיקת התיק</span>
                            <h2 className={styles.sectionTitle} id="review-overview-title">מה התקבל ומה חסר?</h2>
                        </div>
                        <span className={styles.reviewOverviewHint}>לחצי על חלק כדי לעבור אליו</span>
                    </div>
                    <div className={styles.reviewOverviewGrid}>
                        {reviewChecklist.map((item) => (
                            <button
                                className={`${styles.reviewOverviewItem} ${item.status === "completed" || item.status === "notRequired" ? styles.reviewOverviewItemComplete : item.status === "requiresCorrection" ? styles.reviewOverviewItemCorrection : item.status === "pendingReview" ? styles.reviewOverviewItemReview : ""}`}
                                key={item.key}
                                type="button"
                                onClick={() => scrollToCaseSection(item.target)}
                            >
                                <span>{item.title}</span>
                                <strong>{onboardingStepStatusLabels[item.status]}</strong>
                            </button>
                        ))}
                    </div>
                </section>

                <section className={styles.nextActionCard} aria-labelledby="next-action-title">
                    <div className={styles.nextActionMarker} aria-hidden="true">✓</div>
                    <div className={styles.nextActionCopy}>
                        <span className={styles.eyebrow}>מה צריך לעשות עכשיו?</span>
                        <h2 className={styles.nextActionTitle} id="next-action-title">
                            {allDocumentsSubmitted && !allDocumentsApproved
                                ? "אישור כל הפרטים והמסמכים"
                                : nextStep
                                  ? nextStep.title
                                  : "כל שלבי ההרשמה הושלמו"}
                        </h2>
                        <p className={styles.nextActionText}>
                            {allDocumentsSubmitted && !allDocumentsApproved
                                ? "כל הטפסים הוגשו. עברי עליהם ואשרי את כולם יחד באזור הבדיקה המרוכזת."
                                : nextStep
                                ? nextStep.responsibleParty === "parent" && nextStep.status === "notStarted"
                                    ? `ממתינים להורה: ${nextStep.description ?? nextStep.title}`
                                    : stepGuidance[nextStep.key] ?? nextStep.description
                                : "לא נדרשת כרגע פעולה נוספת. אפשר לעבור על הפרטים ולוודא שהמשפחה קיבלה אישור."}
                        </p>
                        {nextStep ? (
                            <div className={styles.nextActionMeta}>
                                <span>{onboardingStepStatusLabels[nextStep.status]}</span>
                                <span>{onboardingResponsiblePartyLabels[nextStep.responsibleParty]}</span>
                            </div>
                        ) : null}
                        {(allDocumentsSubmitted && !allDocumentsApproved) || nextStep ? (
                            <button
                                className={styles.primaryButton}
                                type="button"
                                onClick={() => scrollToCaseSection(
                                    allDocumentsSubmitted && !allDocumentsApproved
                                        ? "documents-approval"
                                        : nextStep?.key === "childAndGuardianDetails"
                                          ? "profile-details"
                                          : nextStep?.key === "agreementSigned"
                                            ? "agreement-review"
                                            : nextStep?.key === "healthDeclarationSubmitted"
                                              ? "health-declaration"
                                              : nextStep?.key === "pickupAuthorizationSubmitted"
                                                ? "pickup-authorization"
                                                : "payment-and-placement"
                                )}
                            >
                                מעבר לפעולה
                            </button>
                        ) : null}
                    </div>
                </section>
    </>
);

export default OnboardingOverview;
