import type { AdminAgreementByOnboarding, DaycareCorrectionDisposition } from "../../../../types/daycareAgreement";
import type { DaycareHealthDeclarationSubmission } from "../../../../types/daycareHealthDeclaration";
import type { AdminDaycareOnboarding } from "../../../../types/daycareOnboarding";
import { onboardingStepStatusLabels } from "../../../../types/daycareOnboarding";
import type { DaycarePickupAuthorizationSubmission } from "../../../../types/daycarePickupAuthorization";
import { formatDateTime, guardianRoleLabels } from "../daycareOnboardingAdminUtils";
import styles from "../DaycareOnboardingAdmin.module.scss";

type ReviewStatus = "completed" | "requiresCorrection";
type SetDisposition = (value: DaycareCorrectionDisposition | "") => void;

type Props = {
    onboarding: AdminDaycareOnboarding;
    agreementData: AdminAgreementByOnboarding | null;
    agreementMessage: string;
    setAgreementMessage: (value: string) => void;
    agreementCorrectionDisposition: DaycareCorrectionDisposition | "";
    setAgreementCorrectionDisposition: SetDisposition;
    reviewingAgreement: boolean;
    handleAgreementReview: (status: ReviewStatus) => Promise<void>;
    handleAgreementDownload: (kind: "signature" | "signedPdf") => Promise<void>;
    healthDeclaration: DaycareHealthDeclarationSubmission | null;
    healthMessage: string;
    setHealthMessage: (value: string) => void;
    healthCorrectionDisposition: DaycareCorrectionDisposition | "";
    setHealthCorrectionDisposition: SetDisposition;
    reviewingHealth: boolean;
    handleHealthReview: (status: ReviewStatus) => Promise<void>;
    handleHealthDownload: () => Promise<void>;
    pickupAuthorization: DaycarePickupAuthorizationSubmission | null;
    pickupMessage: string;
    setPickupMessage: (value: string) => void;
    pickupCorrectionDisposition: DaycareCorrectionDisposition | "";
    setPickupCorrectionDisposition: SetDisposition;
    reviewingPickup: boolean;
    handlePickupReview: (status: ReviewStatus) => Promise<void>;
    handlePickupDownload: () => Promise<void>;
    parentSubmissionComplete: boolean;
    allDocumentsSubmitted: boolean;
    allDocumentsApproved: boolean;
    reviewingAllDocuments: boolean;
    handleApproveAllDocuments: () => Promise<void>;
};

const DocumentReviewSections = ({
    onboarding, agreementData, agreementMessage, setAgreementMessage,
    agreementCorrectionDisposition, setAgreementCorrectionDisposition, reviewingAgreement,
    handleAgreementReview, handleAgreementDownload, healthDeclaration, healthMessage,
    setHealthMessage, healthCorrectionDisposition, setHealthCorrectionDisposition, reviewingHealth,
    handleHealthReview, handleHealthDownload, pickupAuthorization, pickupMessage,
    setPickupMessage, pickupCorrectionDisposition, setPickupCorrectionDisposition, reviewingPickup,
    handlePickupReview, handlePickupDownload, parentSubmissionComplete, allDocumentsSubmitted, allDocumentsApproved,
    reviewingAllDocuments, handleApproveAllDocuments,
}: Props) => (
    <>
        {!parentSubmissionComplete ? (
            <section className={styles.parentSubmissionNotice} aria-live="polite">
                <strong>הטפסים עדיין לא נשלחו לבדיקה</strong>
                <span>אפשר לצפות במה שנשמר, אך פעולות האישור והתיקון ייפתחו רק אחרי שההורה ילחץ על ״סיום ושליחה לצוות המעון״.</span>
            </section>
        ) : null}
        <section className={`${styles.agreementReviewCard} ${styles.caseSectionAnchor}`} id="agreement-review">
            <div>
                <span className={styles.eyebrow}>הסכם התקשרות</span>
                <h2 className={styles.controlTitle}>אישור וחתימה מקוונת</h2>
            </div>
            {!agreementData?.publishedVersion ? (
                <p className={styles.helperText}>
                    טרם פורסמה גרסת הסכם לשנת {onboarding.schoolYear}.
                    ניתן ליצור ולפרסם אותה בטאב ״הסכמים״ במסך ניהול המעון.
                </p>
            ) : agreementData.agreement ? (
                <>
                    <p className={styles.helperText}>
                        גרסת הסכם {agreementData.publishedVersion.version} · הגשה {agreementData.agreement.revision} · אופן חתימה: {agreementData.agreement.signingMethod === "online" ? "מקוון" : "PDF חתום"} · סטטוס: {onboardingStepStatusLabels[agreementData.agreement.status]}
                    </p>
                    {agreementData.agreement.signedBy ? (
                        <p className={styles.helperText}>
                            החותם/ת: {agreementData.agreement.signedBy} ({guardianRoleLabels[agreementData.agreement.signerRole ?? ""] ?? agreementData.agreement.signerRole})
                        </p>
                    ) : null}
                    {agreementData.agreement.signedAt ? (
                        <p className={styles.helperText}>{agreementData.agreement.signingMethod === "online" ? "נחתם באתר" : "הקובץ הועלה"} ב־{formatDateTime(agreementData.agreement.signedAt)}</p>
                    ) : null}
                    {agreementData.agreement.documentId ? (
                        <p className={styles.helperText}>מזהה מסמך: {agreementData.agreement.documentId}</p>
                    ) : null}
                    <div className={styles.linkActions}>
                        {agreementData.agreement.hasSignature ? (
                            <button className={styles.secondaryButton} type="button" onClick={() => void handleAgreementDownload("signature")}>הורדת החתימה</button>
                        ) : null}
                        {agreementData.agreement.hasSignedPdf ? (
                            <button className={styles.secondaryButton} type="button" onClick={() => void handleAgreementDownload("signedPdf")}>הורדת PDF חתום</button>
                        ) : null}
                    </div>
                    {agreementData.agreement.status === "requiresCorrection" ? (
                        <p className={styles.helperText}>{agreementData.agreement.correctionDisposition === "discardFileAfterReplacement" ? "ההסכם פתוח להעלאה מחדש. הקובץ השגוי יימחק רק לאחר שהגרסה החלופית תישמר בהצלחה." : "ההסכם פתוח כעת לחתימה או להעלאה מחדש. הגרסה הקודמת תישמר בתיק כגרסה לא־פעילה."}</p>
                    ) : parentSubmissionComplete ? (
                        <details className={styles.correctionPanel}>
                            <summary className={styles.correctionSummary}>ההסכם אינו תקין או שצריך לעדכן אותו?</summary>
                            {agreementData.agreement.status === "completed" ? (
                                <p className={styles.helperText}>ההסכם נבדק ואושר. פתיחה לתיקון תשמור את הגרסה הזו ותבקש מההורה חתימה חדשה.</p>
                            ) : (
                                <p className={styles.helperText}>ההסכם הוגש ויאושר יחד עם שאר הפרטים והמסמכים.</p>
                            )}
                            <label className={styles.fieldLabel} htmlFor="agreement-parent-message">מה ההורה צריך לתקן בהסכם?</label>
                            <textarea className={styles.textarea} id="agreement-parent-message" value={agreementMessage} onChange={(event) => setAgreementMessage(event.target.value)} />
                            {agreementData.agreement.signingMethod === "uploadedPdf" ? (
                                <label className={styles.fieldLabel} htmlFor="agreement-correction-disposition">
                                    מה לעשות עם הקובץ הקודם לאחר שתוגש גרסה חדשה?
                                    <select className={styles.select} id="agreement-correction-disposition" value={agreementCorrectionDisposition} onChange={(event) => setAgreementCorrectionDisposition(event.target.value as DaycareCorrectionDisposition | "")}>
                                        <option value="">יש לבחור</option>
                                        <option value="discardFileAfterReplacement">הקובץ לא תקין - למחוק לאחר ההחלפה</option>
                                        <option value="preserveVersion">עדכון פרטים - לשמור כגרסה קודמת</option>
                                    </select>
                                </label>
                            ) : (
                                <p className={styles.helperText}>ההסכם נחתם באתר ולכן הגרסה הקודמת תישמר כגרסה לא־פעילה.</p>
                            )}
                            <div className={styles.linkActions}>
                                <button className={styles.dangerButton} type="button" disabled={reviewingAgreement || !agreementMessage.trim() || (agreementData.agreement.signingMethod === "uploadedPdf" && !agreementCorrectionDisposition)} onClick={() => void handleAgreementReview("requiresCorrection")}>
                                    {reviewingAgreement ? "פותח לתיקון..." : agreementData.agreement.status === "completed" ? "פתיחה מחדש לתיקון" : "דרישת תיקון"}
                                </button>
                            </div>
                        </details>
                    ) : null}
                </>
            ) : <p className={styles.helperText}>{agreementData?.publishedVersion ? "ההסכם פורסם, אך ההורה עדיין לא שלח חתימה או PDF חתום." : `עדיין לא פורסם הסכם לשנת ${onboarding.schoolYear}.`}</p>}
        </section>

        <section className={`${styles.agreementReviewCard} ${styles.healthDeclarationCard} ${styles.caseSectionAnchor}`} id="health-declaration">
            <div>
                <span className={styles.eyebrow}>הצהרת בריאות</span>
                <h2 className={styles.controlTitle}>בדיקת מידע רפואי וחתימה</h2>
            </div>
            {healthDeclaration ? (
                <>
                    <p className={styles.helperText}>גרסה {healthDeclaration.revision} · {healthDeclaration.signingMethod === "uploadedFile" ? "טופס חתום ידנית" : "נחתם באתר"} · סטטוס: {onboardingStepStatusLabels[healthDeclaration.status]} · הוגש ב־{formatDateTime(healthDeclaration.submittedAt)}</p>
                    {healthDeclaration.payload ? <div className={styles.detailsGrid}>
                        <p><strong>מצב בריאותי:</strong> {healthDeclaration.payload.healthCondition}</p>
                        <p><strong>רגישויות לתרופות:</strong> {healthDeclaration.payload.medicationSensitivities}</p>
                        <p><strong>קופת חולים:</strong> {healthDeclaration.payload.healthFund}</p>
                        <p><strong>אלרגיות:</strong> {healthDeclaration.payload.hasAllergies ? healthDeclaration.payload.allergyDetails : "אין אלרגיה או רגישות ידועה"}</p>
                        {healthDeclaration.payload.hasAllergies ? <p><strong>הנחיות במקרה חשיפה:</strong> {healthDeclaration.payload.exposureInstructions}</p> : null}
                        <p><strong>החותם/ת:</strong> {healthDeclaration.payload.signedBy} ({guardianRoleLabels[healthDeclaration.payload.signerRole]})</p>
                    </div> : <p className={styles.helperText}>המידע מולא בטופס הידני. יש לפתוח את הקובץ החתום ולבדוק את הפרטים.</p>}
                    <div className={styles.linkActions}><button className={styles.secondaryButton} type="button" onClick={() => void handleHealthDownload()}>הורדת הצהרה חתומה</button></div>
                    {parentSubmissionComplete && healthDeclaration.status !== "requiresCorrection" ? <details className={styles.correctionPanel}>
                        <summary className={styles.correctionSummary}>ההצהרה אינה תקינה או שצריך לעדכן אותה?</summary>
                        <label className={styles.fieldLabel} htmlFor="health-parent-message">מה ההורה צריך לתקן בהצהרת הבריאות?</label>
                        <textarea className={styles.textarea} id="health-parent-message" value={healthMessage} onChange={(event) => setHealthMessage(event.target.value)} />
                        {healthDeclaration.signingMethod === "uploadedFile" ? <label className={styles.fieldLabel} htmlFor="health-correction-disposition">
                            מה לעשות עם הקובץ הקודם לאחר שתוגש גרסה חדשה?
                            <select className={styles.select} id="health-correction-disposition" value={healthCorrectionDisposition} onChange={(event) => setHealthCorrectionDisposition(event.target.value as DaycareCorrectionDisposition | "")}>
                                <option value="">יש לבחור</option>
                                <option value="discardFileAfterReplacement">הקובץ לא תקין - למחוק לאחר ההחלפה</option>
                                <option value="preserveVersion">עדכון פרטים - לשמור כגרסה קודמת</option>
                            </select>
                        </label> : <p className={styles.helperText}>ההצהרה נחתמה באתר ולכן הגרסה הקודמת תישמר כגרסה לא־פעילה.</p>}
                        <div className={styles.linkActions}>
                            <button className={styles.dangerButton} type="button" disabled={reviewingHealth || !healthMessage.trim() || (healthDeclaration.signingMethod === "uploadedFile" && !healthCorrectionDisposition)} onClick={() => void handleHealthReview("requiresCorrection")}>
                                {reviewingHealth ? "פותח לתיקון..." : healthDeclaration.status === "completed" ? "פתיחה מחדש לתיקון" : "דרישת תיקון"}
                            </button>
                        </div>
                    </details> : healthDeclaration.status === "requiresCorrection" ? <p className={styles.helperText}>{healthDeclaration.correctionDisposition === "discardFileAfterReplacement" ? "ההצהרה פתוחה לתיקון. הקובץ השגוי יימחק רק לאחר שהגרסה החלופית תישמר בהצלחה." : "ההצהרה פתוחה לתיקון אצל ההורה. הגרסה הקודמת תישמר בתיק כגרסה לא־פעילה."}</p> : null}
                </>
            ) : <p className={styles.helperText}>ההורה עדיין לא הגיש הצהרת בריאות.</p>}
        </section>

        <section className={`${styles.agreementReviewCard} ${styles.healthDeclarationCard} ${styles.caseSectionAnchor}`} id="pickup-authorization">
            <div><span className={styles.eyebrow}>מורשי איסוף</span><h2 className={styles.controlTitle}>בדיקת מורשים וחתימה</h2></div>
            {pickupAuthorization ? <>
                <p className={styles.helperText}>גרסה {pickupAuthorization.revision} · {pickupAuthorization.signingMethod === "uploadedFile" ? "טופס חתום ידנית" : "נחתם באתר"} · סטטוס: {onboardingStepStatusLabels[pickupAuthorization.status]} · הוגש ב־{formatDateTime(pickupAuthorization.submittedAt)}</p>
                {pickupAuthorization.payload ? <>
                    <h3 className={styles.auditTitle}>הורים ואפוטרופוסים</h3>
                    <div className={styles.detailsGrid}>{pickupAuthorization.payload.guardians.map((guardian) => <p key={`${guardian.fullName}-${guardian.phone}`}><strong>{guardian.fullName}</strong><br />{guardian.roleDetails || guardianRoleLabels[guardian.role] || guardian.role} · {guardian.phone}</p>)}</div>
                    <h3 className={styles.auditTitle}>מורשים נוספים</h3>
                    {pickupAuthorization.payload.collectors.length > 0 ? <div className={styles.detailsGrid}>{pickupAuthorization.payload.collectors.map((collector) => <p key={`${collector.fullName}-${collector.israeliId}`}><strong>{collector.fullName}</strong><br />קרבה: {collector.relationship} · טלפון: {collector.phone}<br />ת״ז: {collector.israeliId}</p>)}</div> : <p className={styles.helperText}>לא נוספו מורשי איסוף נוספים.</p>}
                    <p className={styles.helperText}>החותם/ת: {pickupAuthorization.payload.signedBy} ({guardianRoleLabels[pickupAuthorization.payload.signerRole]})</p>
                </> : <p className={styles.helperText}>הפרטים מולאו בטופס הידני. יש לפתוח את הקובץ החתום ולבדוק אותם.</p>}
                <div className={styles.linkActions}><button className={styles.secondaryButton} type="button" onClick={() => void handlePickupDownload()}>הורדת טופס חתום</button></div>
                {parentSubmissionComplete && pickupAuthorization.status !== "requiresCorrection" ? <details className={styles.correctionPanel}>
                    <summary className={styles.correctionSummary}>הטופס אינו תקין או שצריך לעדכן אותו?</summary>
                    <label className={styles.fieldLabel} htmlFor="pickup-parent-message">מה ההורה צריך לתקן במורשי האיסוף?</label>
                    <textarea className={styles.textarea} id="pickup-parent-message" value={pickupMessage} onChange={(event) => setPickupMessage(event.target.value)} />
                    {pickupAuthorization.signingMethod === "uploadedFile" ? <label className={styles.fieldLabel} htmlFor="pickup-correction-disposition">
                        מה לעשות עם הקובץ הקודם לאחר שתוגש גרסה חדשה?
                        <select className={styles.select} id="pickup-correction-disposition" value={pickupCorrectionDisposition} onChange={(event) => setPickupCorrectionDisposition(event.target.value as DaycareCorrectionDisposition | "")}>
                            <option value="">יש לבחור</option>
                            <option value="discardFileAfterReplacement">הקובץ לא תקין - למחוק לאחר ההחלפה</option>
                            <option value="preserveVersion">עדכון פרטים - לשמור כגרסה קודמת</option>
                        </select>
                    </label> : <p className={styles.helperText}>הטופס נחתם באתר ולכן הגרסה הקודמת תישמר כגרסה לא־פעילה.</p>}
                    <div className={styles.linkActions}><button className={styles.dangerButton} type="button" disabled={reviewingPickup || !pickupMessage.trim() || (pickupAuthorization.signingMethod === "uploadedFile" && !pickupCorrectionDisposition)} onClick={() => void handlePickupReview("requiresCorrection")}>{reviewingPickup ? "פותח לתיקון..." : pickupAuthorization.status === "completed" ? "פתיחה מחדש לתיקון" : "דרישת תיקון"}</button></div>
                </details> : pickupAuthorization.status === "requiresCorrection" ? <p className={styles.helperText}>{pickupAuthorization.correctionDisposition === "discardFileAfterReplacement" ? "הטופס פתוח לתיקון. הקובץ השגוי יימחק רק לאחר שהגרסה החלופית תישמר בהצלחה." : "הטופס פתוח לתיקון אצל ההורה. הגרסה הקודמת תישמר בתיק כגרסה לא־פעילה."}</p> : null}
            </> : <p className={styles.helperText}>ההורה עדיין לא הגיש מורשי איסוף.</p>}
        </section>

        {allDocumentsSubmitted ? (
            <section className={`${styles.nextActionCard} ${styles.caseSectionAnchor}`} id="documents-approval" aria-labelledby="documents-approval-title">
                <div className={styles.nextActionMarker} aria-hidden="true">✓</div>
                <div className={styles.nextActionCopy}>
                    <span className={styles.eyebrow}>בדיקה מרוכזת</span>
                    <h2 className={styles.nextActionTitle} id="documents-approval-title">
                        {allDocumentsApproved
                            ? "כל הפרטים והמסמכים אושרו"
                            : "אישור כל הפרטים והמסמכים"}
                    </h2>
                    <p className={styles.nextActionText}>
                        {allDocumentsApproved
                            ? "השלב הבא הוא הסדרת התשלום."
                            : "לאחר שעברת על פרטי הילד, ההסכם, הצהרת הבריאות ומורשי האיסוף - אשרי את כולם בפעולה אחת."}
                    </p>
                    {!allDocumentsApproved ? (
                        <button
                            className={styles.primaryButton}
                            type="button"
                            disabled={reviewingAllDocuments}
                            onClick={() => void handleApproveAllDocuments()}
                        >
                            {reviewingAllDocuments
                                ? "מאשר את כל המסמכים..."
                                : "אישור כל הפרטים והמסמכים"}
                        </button>
                    ) : null}
                </div>
            </section>
        ) : null}
    </>
);

export default DocumentReviewSections;
