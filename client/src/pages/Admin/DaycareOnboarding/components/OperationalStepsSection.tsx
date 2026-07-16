import type { AdminOnboardingStep, OnboardingResponsibleParty, OnboardingStepSource, OnboardingStepStatus } from "../../../../types/daycareOnboarding";
import { onboardingResponsibleParties, onboardingResponsiblePartyLabels, onboardingStepSourceLabels, onboardingStepStatusLabels } from "../../../../types/daycareOnboarding";
import { completeActionLabel, createStepDraft, formatDate, isStepComplete, stepGuidance, stepSources, stepStatuses, type StepDraft } from "../daycareOnboardingAdminUtils";
import styles from "../DaycareOnboardingAdmin.module.scss";

type Props = {
    operationalSteps: AdminOnboardingStep[];
    drafts: Record<string, StepDraft>;
    dirtyStepKeys: Set<string>;
    savingStepKey: string | null;
    allDocumentsApproved: boolean;
    isDirty: boolean;
    nextStep?: AdminOnboardingStep;
    updateDraft: <Field extends keyof StepDraft>(stepKey: string, field: Field, value: StepDraft[Field]) => void;
    saveStep: (stepKey: string, overrides?: Partial<StepDraft>) => Promise<void>;
};

const OperationalStepsSection = ({
    operationalSteps, drafts, dirtyStepKeys, savingStepKey, allDocumentsApproved,
    isDirty, nextStep, updateDraft, saveStep,
}: Props) => (
<section className={`${styles.stepsSection} ${styles.caseSectionAnchor}`} id="payment-and-placement">
                    <div className={styles.sectionHeading}>
                        <div>
                            <span className={styles.eyebrow}>לאחר אישור המסמכים</span>
                            <h2 className={styles.sectionTitle}>תשלום ושיבוץ</h2>
                        </div>
                        <span className={styles.dirtySummary}>
                            {isDirty ? `${dirtyStepKeys.size} שלבים עם שינויים שלא נשמרו` : "כל השינויים שמורים"}
                        </span>
                    </div>

                    <div className={styles.stepsList}>
                        {operationalSteps.map((step) => {
                            const draft = drafts[step.key] ?? createStepDraft(step);
                            const isStepDirty = dirtyStepKeys.has(step.key);
                            const isSaving = savingStepKey === step.key;
                            const agreementStatusManaged = step.key === "agreementSigned";
                            const healthStatusManaged = step.key === "healthDeclarationSubmitted";
                            const pickupStatusManaged = step.key === "pickupAuthorizationSubmitted";
                            const profileStatusManaged = step.key === "childAndGuardianDetails";
                            const recordStatusManaged = agreementStatusManaged || healthStatusManaged || pickupStatusManaged;
                            const bundleStatusManaged = profileStatusManaged || recordStatusManaged;
                            const profileAwaitingReview =
                                step.key === "childAndGuardianDetails" &&
                                draft.status === "pendingReview";
                            const adminCanUpdateStatus =
                                step.responsibleParty === "admin" ||
                                step.responsibleParty === "both" ||
                                profileAwaitingReview;
                            const parentStatusManaged =
                                step.responsibleParty === "parent" &&
                                !profileAwaitingReview;
                            const statusManaged = bundleStatusManaged || parentStatusManaged;
                            const paymentStep = operationalSteps.find((candidate) => candidate.key === "registrationFeeReceived");
                            const operationalBlockedReason = step.key === "registrationFeeReceived" && !allDocumentsApproved
                                ? "זמין לאחר אישור כל הפרטים והמסמכים"
                                : step.key === "registrationApproved" && !isStepComplete(paymentStep?.status ?? "notStarted")
                                  ? "זמין לאחר אישור הסדר התשלום"
                                  : "";

                            return (
                                <article className={styles.stepCard} key={step.key}>
                                    <div className={styles.stepHeader}>
                                        <span className={styles.stepNumber}>{step.order}</span>
                                        <div className={styles.stepHeadingCopy}>
                                            <h3 className={styles.stepTitle}>{step.title}</h3>
                                            <p className={styles.stepDescription}>
                                                {onboardingResponsiblePartyLabels[draft.responsibleParty]}
                                            </p>
                                        </div>
                                        <span className={styles.statusBadge}>
                                            {onboardingStepStatusLabels[draft.status]}
                                        </span>
                                    </div>

                                    <div className={styles.stepMeta}>
                                        <span>עודכן: {formatDate(step.updatedAt)}</span>
                                        <span>על ידי: {step.updatedBy || "מערכת"}</span>
                                    </div>

                                    {nextStep?.key === step.key ? (
                                        <p className={styles.stepGuidance}>
                                            {step.responsibleParty === "parent" && draft.status === "notStarted"
                                                ? `ממתינים להורה: ${step.description ?? step.title}`
                                                : stepGuidance[step.key] ?? step.description}
                                        </p>
                                    ) : null}

                                    {bundleStatusManaged ? (
                                        <p className={styles.managedStepNote}>
                                            {draft.status === "notStarted"
                                                ? "ממתין להגשה של ההורה."
                                                : draft.status === "completed"
                                                  ? "השלב אושר במסגרת האישור המרוכז."
                                                  : "השלב יאושר יחד עם כל הפרטים והמסמכים."}
                                        </p>
                                    ) : adminCanUpdateStatus ? <div className={styles.stepActions}>
                                        {!isStepComplete(draft.status) ? (
                                            <button
                                                className={styles.primaryButton}
                                                type="button"
                                                disabled={isSaving || Boolean(operationalBlockedReason)}
                                                onClick={() =>
                                                    void saveStep(step.key, {
                                                        status: "completed",
                                                        source: draft.source || "admin",
                                                        completedAt:
                                                            draft.completedAt ||
                                                            new Date().toISOString().slice(0, 10),
                                                    })
                                                }
                                            >
                                                {isSaving
                                                    ? "שומר..."
                                                    : operationalBlockedReason
                                                      ? operationalBlockedReason
                                                    : completeActionLabel({
                                                          ...step,
                                                          status: draft.status,
                                                      })}
                                            </button>
                                        ) : (
                                            <button
                                                className={styles.secondaryButton}
                                                type="button"
                                                disabled={isSaving}
                                                onClick={() =>
                                                    void saveStep(step.key, {
                                                        status: "notStarted",
                                                        completedAt: "",
                                                    })
                                                }
                                            >
                                                פתיחה מחדש
                                            </button>
                                        )}
                                    </div> : (
                                        <p className={styles.managedStepNote}>
                                            {draft.status === "pendingReview"
                                                ? "השלב ממתין לבדיקה של צוות המעון."
                                                : "השלב באחריות ההורה ואין צורך לעדכן אותו ידנית."}
                                        </p>
                                    )}

                                    <details className={styles.advancedStepEditor}>
                                        <summary className={styles.advancedStepSummary}>
                                            אפשרויות מתקדמות, הערות ותיקונים
                                        </summary>
                                        <div className={styles.editorGrid}>
                                        <label className={styles.fieldLabel}>
                                            סטטוס
                                            <select
                                                className={styles.select}
                                                disabled={statusManaged}
                                                value={draft.status}
                                                onChange={(event) =>
                                                    updateDraft(
                                                        step.key,
                                                        "status",
                                                        event.target.value as OnboardingStepStatus
                                                    )
                                                }
                                            >
                                                {stepStatuses.map((status) => (
                                                    <option key={status} value={status}>
                                                        {onboardingStepStatusLabels[status]}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>

                                        <label className={styles.fieldLabel}>
                                            מקור עדכון
                                            <select
                                                className={styles.select}
                                                value={draft.source}
                                                onChange={(event) =>
                                                    updateDraft(
                                                        step.key,
                                                        "source",
                                                        event.target.value as OnboardingStepSource
                                                    )
                                                }
                                            >
                                                {stepSources.map((source) => (
                                                    <option key={source} value={source}>
                                                        {onboardingStepSourceLabels[source]}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>

                                        <label className={styles.fieldLabel}>
                                            אחראי על השלב
                                            <select
                                                className={styles.select}
                                                value={draft.responsibleParty}
                                                onChange={(event) =>
                                                    updateDraft(
                                                        step.key,
                                                        "responsibleParty",
                                                        event.target.value as OnboardingResponsibleParty
                                                    )
                                                }
                                            >
                                                {onboardingResponsibleParties.map(
                                                    (responsibleParty) => (
                                                        <option
                                                            key={responsibleParty}
                                                            value={responsibleParty}
                                                        >
                                                            {
                                                                onboardingResponsiblePartyLabels[
                                                                    responsibleParty
                                                                ]
                                                            }
                                                        </option>
                                                    )
                                                )}
                                            </select>
                                        </label>

                                        <label className={styles.fieldLabel}>
                                            תאריך השלמה
                                            <input
                                                className={styles.input}
                                                type="date"
                                                disabled={statusManaged}
                                                value={draft.completedAt}
                                                onChange={(event) =>
                                                    updateDraft(
                                                        step.key,
                                                        "completedAt",
                                                        event.target.value
                                                    )
                                                }
                                            />
                                        </label>

                                        <label className={styles.visibilityLabel}>
                                            <input
                                                className={styles.checkbox}
                                                type="checkbox"
                                                checked={draft.isVisibleToParent}
                                                onChange={(event) =>
                                                    updateDraft(
                                                        step.key,
                                                        "isVisibleToParent",
                                                        event.target.checked
                                                    )
                                                }
                                            />
                                            השלב גלוי להורה
                                        </label>

                                        <label className={styles.wideFieldLabel}>
                                            הערה פנימית לצוות
                                            <textarea
                                                className={styles.textarea}
                                                value={draft.internalNote}
                                                maxLength={2000}
                                                onChange={(event) =>
                                                    updateDraft(
                                                        step.key,
                                                        "internalNote",
                                                        event.target.value
                                                    )
                                                }
                                            />
                                        </label>

                                        <label className={styles.wideFieldLabel}>
                                            הודעה שמוצגת להורה
                                            <textarea
                                                className={styles.textarea}
                                                value={draft.parentMessage}
                                                maxLength={1000}
                                                onChange={(event) =>
                                                    updateDraft(
                                                        step.key,
                                                        "parentMessage",
                                                        event.target.value
                                                    )
                                                }
                                            />
                                        </label>
                                        </div>

                                        <div className={styles.stepActions}>
                                        <button
                                            className={styles.primaryButton}
                                            type="button"
                                            disabled={!isStepDirty || isSaving}
                                            onClick={() => void saveStep(step.key)}
                                        >
                                            {isSaving ? "שומר..." : "שמירת השלב"}
                                        </button>
                                        <button
                                            className={styles.quickButton}
                                            type="button"
                                            disabled={isSaving || statusManaged}
                                            onClick={() =>
                                                void saveStep(step.key, {
                                                    status: "notRequired",
                                                    source: "admin",
                                                    completedAt: "",
                                                })
                                            }
                                        >
                                            לא נדרש
                                        </button>
                                        </div>
                                    </details>
                                </article>
                            );
                        })}
                    </div>
                </section>
);

export default OperationalStepsSection;
