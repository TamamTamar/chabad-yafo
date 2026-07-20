import type { AdminDaycareOnboarding, AdminOnboardingStep } from "../../../../types/daycareOnboarding";
import { formatDate, guardianRoleLabels } from "../daycareOnboardingAdminUtils";
import styles from "../DaycareOnboardingAdmin.module.scss";

type LinkConfirmation = "disableAccess" | "regenerateLink" | null;

type Props = {
    onboarding: AdminDaycareOnboarding;
    deletingOnboarding: boolean;
    isDirty: boolean;
    setDeleteConfirmationOpen: (open: boolean) => void;
    profileReviewStep?: AdminOnboardingStep;
    profileMessage: string;
    setProfileMessage: (message: string) => void;
    reviewingProfile: boolean;
    handleProfileCorrection: () => Promise<void>;
    parentSubmissionComplete: boolean;
    updatingAccess: boolean;
    setLinkConfirmation: (confirmation: LinkConfirmation) => void;
    freshParentLink: string;
    copyParentLink: () => Promise<void>;
};

const OnboardingControls = ({
    onboarding, deletingOnboarding,
    isDirty, setDeleteConfirmationOpen, profileReviewStep, profileMessage,
    setProfileMessage, reviewingProfile, handleProfileCorrection, parentSubmissionComplete, updatingAccess,
    setLinkConfirmation, freshParentLink, copyParentLink,
}: Props) => (
    <section className={styles.controlGrid}>
        {onboarding.origin?.type === "daycareRegistration" ? (
            <details className={styles.controlCard}>
                <summary className={styles.controlSummary}>
                    הגדרות מתקדמות של התיק
                </summary>
                <div className={styles.deleteCaseArea}>
                    <h3>מחיקת תיק בדיקה</h3>
                    <p>
                        הפעולה תמחק את התיק, המסמכים והשלבים שלו. טופס הרישום,
                        המשפחה והילד יישארו שמורים, ותוכלי לפתוח מהם תיק חדש בלי
                        ליצור כפילות.
                    </p>
                    <button
                        className={styles.dangerButton}
                        type="button"
                        disabled={deletingOnboarding || isDirty}
                        onClick={() => setDeleteConfirmationOpen(true)}
                    >
                        מחיקת תיק הבדיקה
                    </button>
                    {isDirty ? (
                        <p className={styles.helperText}>
                            יש לשמור או לבטל את השינויים הפתוחים לפני המחיקה.
                        </p>
                    ) : null}
                </div>
            </details>
        ) : null}

        <div className={`${styles.controlCard} ${styles.caseSectionAnchor}`} id="profile-details">
            <h2 className={styles.controlTitle}>פרטי המשפחה</h2>
            {onboarding.child.firstName ? (
                <dl className={styles.identityDetails}>
                    <div className={styles.identityDetailItem}>
                        <dt className={styles.identityDetailLabel}>שם הילד/ה</dt>
                        <dd className={styles.identityDetailValue}>
                            {`${onboarding.child.firstName} ${onboarding.child.lastName ?? ""}`.trim()}
                        </dd>
                    </div>
                    <div className={styles.identityDetailItem}>
                        <dt className={styles.identityDetailLabel}>תאריך לידה</dt>
                        <dd className={styles.identityDetailValue}>
                            {formatDate(onboarding.child.birthDate)}
                        </dd>
                    </div>
                    {onboarding.address ? (
                        <div className={styles.identityDetailItem}>
                            <dt className={styles.identityDetailLabel}>כתובת</dt>
                            <dd className={styles.identityDetailValue}>
                                {`${onboarding.address.street} ${onboarding.address.houseNumber}${onboarding.address.apartment ? `, דירה ${onboarding.address.apartment}` : ""}, ${onboarding.address.city}`}
                            </dd>
                        </div>
                    ) : null}
                </dl>
            ) : null}
            {onboarding.guardians.length > 0 ? (
                <ul className={styles.guardianList}>
                    {onboarding.guardians.map((guardian) => (
                        <li
                            className={styles.guardianItem}
                            key={`${guardian.role}-${guardian.fullName}-${guardian.phone}`}
                        >
                            <strong>{guardian.fullName}</strong>
                            <span>
                                {guardianRoleLabels[guardian.role] ??
                                    guardian.role}
                                {guardian.role === "other" && guardian.roleDetails
                                    ? ` - ${guardian.roleDetails}`
                                    : ""}
                            </span>
                            <span dir="ltr">{guardian.phone}</span>
                            {guardian.email ? (
                                <span dir="ltr">{guardian.email}</span>
                            ) : null}
                        </li>
                    ))}
                </ul>
            ) : (
                <p className={styles.helperText}>
                    לא נשמרו אנשי קשר למשפחה.
                </p>
            )}
            {onboarding.internalNote ? (
                <p className={styles.helperText}>
                    הערה פנימית: {onboarding.internalNote}
                </p>
            ) : null}
            {(parentSubmissionComplete && profileReviewStep?.status === "pendingReview") ||
                profileReviewStep?.status === "completed" ? (
                <details className={styles.correctionPanel}>
                    <summary className={styles.correctionSummary}>יש טעות בפרטי המשפחה?</summary>
                    <label className={styles.fieldLabel} htmlFor="profile-parent-message">
                        מה ההורה צריך לתקן בפרטים?
                    </label>
                    <textarea
                        className={styles.textarea}
                        id="profile-parent-message"
                        value={profileMessage}
                        onChange={(event) => setProfileMessage(event.target.value)}
                    />
                    <button
                        className={styles.dangerButton}
                        type="button"
                        disabled={reviewingProfile || !profileMessage.trim()}
                        onClick={() => void handleProfileCorrection()}
                    >
                        {reviewingProfile
                            ? "פותח לתיקון..."
                            : profileReviewStep.status === "completed"
                                ? "פתיחה מחדש לתיקון"
                                : "דרישת תיקון"}
                    </button>
                </details>
            ) : profileReviewStep?.status === "requiresCorrection" ? (
                <p className={styles.helperText}>הפרטים פתוחים כעת לתיקון אצל ההורה.</p>
            ) : null}
        </div>

        <div className={`${styles.controlCard} ${styles.linkControlCard}`}>
            <h2 className={styles.controlTitle}>קישור אישי להורה</h2>
            <p className={styles.helperText}>
                מטעמי אבטחה לא ניתן לשחזר קישור קיים. קישור גולמי מוצג רק מיד לאחר יצירה או איפוס.
            </p>
            <div className={styles.linkActions}>
                {onboarding.access.enabled ? (
                    <button
                        className={styles.dangerButton}
                        type="button"
                        disabled={updatingAccess}
                        onClick={() => setLinkConfirmation("disableAccess")}
                    >
                        ביטול הקישור
                    </button>
                ) : null}
                <button
                    className={styles.primaryButton}
                    type="button"
                    disabled={updatingAccess}
                    onClick={() => setLinkConfirmation("regenerateLink")}
                >
                    יצירת קישור חדש
                </button>
            </div>
            <p className={styles.accessMeta}>
                גישה: {onboarding.access.enabled ? "פעילה" : "מבוטלת"}
                {onboarding.access.expiresAt
                    ? ` · בתוקף עד ${formatDate(onboarding.access.expiresAt)}`
                    : ""}
                {` · כניסה אחרונה: ${formatDate(onboarding.access.lastAccessAt)}`}
            </p>
            {!onboarding.access.enabled ? (
                <p className={styles.helperText}>
                    קישור שבוטל אינו מופעל מחדש. יש ליצור קישור חדש,
                    שיחליף את ה־token הקודם ויהיה תקף ל־90 ימים.
                </p>
            ) : null}
            {freshParentLink && (
                <div className={styles.freshLinkBox}>
                    <label className={styles.fieldLabel} htmlFor="fresh-parent-link">
                        הקישור החדש - יש לשמור ולשלוח להורה
                    </label>
                    <input
                        className={styles.linkInput}
                        id="fresh-parent-link"
                        type="text"
                        value={freshParentLink}
                        readOnly
                        dir="ltr"
                    />
                    <button
                        className={styles.copyButton}
                        type="button"
                        onClick={() => void copyParentLink()}
                    >
                        העתקת הקישור
                    </button>
                </div>
            )}
        </div>
    </section>
);

export default OnboardingControls;
