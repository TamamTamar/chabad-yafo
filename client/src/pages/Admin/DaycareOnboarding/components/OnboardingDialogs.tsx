import type { useBlocker } from "react-router-dom";
import BaseDialog from "../../../../components/BaseDialog/BaseDialog";
import dialogStyles from "../../../../components/BaseDialog/BaseDialog.module.scss";
import ConfirmDialog from "../../../../components/ConfirmDialog/ConfirmDialog";
import styles from "../DaycareOnboardingAdmin.module.scss";

type LinkConfirmation = "disableAccess" | "regenerateLink" | null;
type Blocker = ReturnType<typeof useBlocker>;

type Props = {
    linkConfirmation: LinkConfirmation;
    setLinkConfirmation: (value: LinkConfirmation) => void;
    handleAccessChange: () => Promise<void>;
    handleRegenerateLink: () => Promise<void>;
    freshLinkDialogOpen: boolean;
    freshParentLink: string;
    setFreshLinkDialogOpen: (open: boolean) => void;
    copyParentLink: () => Promise<void>;
    deleteConfirmationOpen: boolean;
    deletingOnboarding: boolean;
    handleDeleteOnboarding: () => Promise<void>;
    setDeleteConfirmationOpen: (open: boolean) => void;
    blocker: Blocker;
};

const OnboardingDialogs = ({
    linkConfirmation, setLinkConfirmation, handleAccessChange, handleRegenerateLink,
    freshLinkDialogOpen, freshParentLink, setFreshLinkDialogOpen, copyParentLink,
    deleteConfirmationOpen, deletingOnboarding, handleDeleteOnboarding,
    setDeleteConfirmationOpen, blocker,
}: Props) => (
    <>
        <ConfirmDialog
            open={linkConfirmation !== null}
            title={linkConfirmation === "disableAccess" ? "ביטול הקישור האישי" : "יצירת קישור חדש"}
            message={linkConfirmation === "disableAccess"
                ? "לבטל את גישת ההורה לקישור האישי?"
                : "הקישור הקודם יפסיק לעבוד מיד. ליצור קישור חדש?"}
            confirmLabel={linkConfirmation === "disableAccess" ? "ביטול הקישור" : "יצירת קישור חדש"}
            tone={linkConfirmation === "disableAccess" ? "danger" : "default"}
            onConfirm={() => {
                if (linkConfirmation === "disableAccess") {
                    void handleAccessChange();
                } else if (linkConfirmation === "regenerateLink") {
                    void handleRegenerateLink();
                }
            }}
            onClose={() => setLinkConfirmation(null)}
        />

        <BaseDialog
            open={freshLinkDialogOpen && Boolean(freshParentLink)}
            title="התיק נפתח - הקישור להורה מוכן"
            maxWidth={640}
            onClose={() => setFreshLinkDialogOpen(false)}
        >
            <p className={dialogStyles.text}>
                העתיקי עכשיו את הקישור ושמרי או שלחי אותו להורה. מטעמי אבטחה,
                לאחר רענון העמוד לא ניתן יהיה להציג שוב את אותו קישור.
            </p>
            <label className={styles.freshLinkDialogField} htmlFor="fresh-parent-link-dialog">
                הקישור האישי
                <input
                    id="fresh-parent-link-dialog"
                    type="text"
                    value={freshParentLink}
                    readOnly
                    dir="ltr"
                    onFocus={(event) => event.currentTarget.select()}
                />
            </label>
            <div className={dialogStyles.actions}>
                <button
                    className={dialogStyles.cta}
                    type="button"
                    onClick={() => void copyParentLink()}
                >
                    העתקת הקישור
                </button>
                <button
                    className={dialogStyles.ghost}
                    type="button"
                    onClick={() => setFreshLinkDialogOpen(false)}
                >
                    שמרתי, סגירה
                </button>
            </div>
        </BaseDialog>

        <ConfirmDialog
            key={deleteConfirmationOpen ? "delete-open" : "delete-closed"}
            open={deleteConfirmationOpen}
            title="מחיקת תיק הבדיקה"
            message={
                <>
                    <strong>הפעולה אינה ניתנת לביטול.</strong>
                    <br />
                    התיק, ההסכם, הצהרת הבריאות, מורשי האיסוף והיסטוריית התיק יימחקו.
                    טופס הרישום יישאר כדי שתוכלי לפתוח תיק חדש ונקי. פרטי ילד ומשפחה
                    שנוצרו רק עבור תיק הבדיקה יימחקו; פרטים שמשמשים תיק אחר יישמרו.
                    אם זו החתימה האחרונה לשנת הלימודים, נעילת מסמכי ההורים תשוחרר אוטומטית.
                </>
            }
            confirmLabel="מחיקת התיק"
            tone="danger"
            busy={deletingOnboarding}
            confirmationPhrase="מחיקת תיק"
            confirmationLabel="כדי לאשר, הקלידי בדיוק: מחיקת תיק"
            onConfirm={() => void handleDeleteOnboarding()}
            onClose={() => setDeleteConfirmationOpen(false)}
        />

        {blocker.state === "blocked" && (
            <div className={styles.dialogOverlay} role="presentation">
                <section
                    className={styles.leaveDialog}
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby="leave-dialog-title"
                >
                    <h2 className={styles.dialogTitle} id="leave-dialog-title">
                        יש שינויים שלא נשמרו
                    </h2>
                    <p className={styles.dialogText}>
                        יציאה מהעמוד תמחק את השינויים שטרם נשמרו.
                    </p>
                    <div className={styles.dialogActions}>
                        <button
                            className={styles.dangerButton}
                            type="button"
                            onClick={() => blocker.proceed()}
                        >
                            יציאה ללא שמירה
                        </button>
                        <button
                            className={styles.primaryButton}
                            type="button"
                            onClick={() => blocker.reset()}
                        >
                            המשך עריכה
                        </button>
                    </div>
                </section>
            </div>
        )}
    </>
);

export default OnboardingDialogs;
