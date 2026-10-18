import { AdminButton, AdminSelect, AdminLink, AdminCard, AdminBadge } from "../../../../components/AdminUI";
import ConfirmDialog from "../../../../components/AdminUI/AdminConfirmDialog";
import ReasonDialog from "../../../../components/AdminUI/AdminReasonDialog";
import { createAdminDiagnosticDonationIntent } from "../../../../services/daycareDonationService";
import DonationModalPreview from "../../../DaycareDonations/components/DonationModalPreview";
import DaycareAmbassadorsAdmin from "./DaycareAmbassadorsAdmin";
import DonationAllocationDialog from "./DonationAllocationDialog";
import DaycareFieldUpdatesAdmin from "./DaycareFieldUpdatesAdmin";
import styles from "./DaycareDonationsAdmin.module.scss";
import type { AdminView, useDaycareDonationsAdmin } from "./useDaycareDonationsAdmin";
import DonationOverviewAdminView from "./DonationOverviewAdminView";
import DonationManualAdminView from "./DonationManualAdminView";
import DonationItemsAdminView from "./DonationItemsAdminView";
import DonationRecordsAdminView from "./DonationRecordsAdminView";

type DaycareDonationsAdminViewProps = {
    model: ReturnType<typeof useDaycareDonationsAdmin>;
};

const DaycareDonationsAdminView = ({ model }: DaycareDonationsAdminViewProps) => {
    const {
        campaign, records, ambassadors, audit,
        diagnostics, loading, saving, clearDiagnosticsOpen,
        diagnosticPaymentOpen, successPreviewOpen, message, error,
        activeView, pendingRecordUpdate, allocationRecord, confirmedCount,
        setClearDiagnosticsOpen, setDiagnosticPaymentOpen, setSuccessPreviewOpen, setMessage,
        setError, setActiveView, setPendingRecordUpdate, setAllocationRecord,
        loadData, handleRecordUpdate, handleClearDiagnostics, formatCurrency,
        formatDate, sortItemsByNeed, auditLabels, adminViews,
        primaryAdminViews,
    } = model;

    if (loading) {
        return <p className={styles.stateMessage}>טוען נתוני תרומות...</p>;
    }

    if (!campaign) {
        return (
            <p className={styles.errorMessage}>
                נתוני קמפיין התרומות אינם זמינים.
            </p>
        );
    }

    return (
        <div className={styles.layout}>
            <section className={styles.summarySection}><AdminCard>
                <header className={styles.sectionHeader}>
                    <div>
                        <p>
                            הסכומים בדף הציבורי מחושבים מרשומות מאושרות בלבד.
                        </p>
                    </div>
                    <div className={styles.summaryActions}>
                        <AdminButton
                            type="button"
                            onClick={() => setSuccessPreviewOpen(true)}
                        >
                            תצוגת מסך תודה
                        </AdminButton>
                        <AdminLink
                            href="/daycare-donations"
                            target="_blank"
                            rel="noreferrer"
                        >
                            צפייה בדף הציבורי
                        </AdminLink>
                    </div>
                </header>

                <div className={styles.metrics}>
                    <AdminCard>
                        <span>גויסו בפועל</span>
                        <strong>₪{formatCurrency(campaign.raised)}</strong>
                    </AdminCard>
                    <AdminCard>
                        <span>יעד הקמפיין</span>
                        <strong>₪{formatCurrency(campaign.goal)}</strong>
                    </AdminCard>
                    <AdminCard>
                        <span>תרומות כלליות שטרם שויכו</span>
                        <strong>
                            ₪{formatCurrency(campaign.generalRaised)}
                        </strong>
                    </AdminCard>
                    <AdminCard>
                        <span>תרומות מאושרות</span>
                        <strong>{confirmedCount}</strong>
                    </AdminCard>
                    {(campaign.overflow ?? 0) > 0 && (
                        <AdminCard>
                            <span>חריגה מעל יעד הקמפיין</span>
                            <strong>
                                ₪{formatCurrency(campaign.overflow ?? 0)}
                            </strong>
                        </AdminCard>
                    )}
                </div>
                <p
                    className={
                        campaign.paymentsEnabled
                            ? styles.successMessage
                            : styles.errorMessage
                    }
                    role="status"
                >
                    {campaign.paymentsEnabled
                        ? "התשלום באתר פעיל"
                        : "התשלום באתר חסום עד להשלמת בדיקות האבטחה"}
                    {" · "}
                    {campaign.publicVisible
                        ? "עמוד הקמפיין גלוי"
                        : "עמוד הקמפיין מוסתר מהציבור"}
                </p>
            </AdminCard></section>

            {(message || error) && (
                <p
                    className={error ? styles.errorMessage : styles.successMessage}
                    role="status"
                >
                    {error || message}
                </p>
            )}

            <nav className={styles.adminViewNav} aria-label="אזורי ניהול התרומות">
                {adminViews.map((view) => (
                    <AdminButton variant="navigation"
                        key={view.id}
                        type="button"
                        aria-pressed={activeView === view.id}
                        title={view.description}
                        onClick={() => {
                            setActiveView(view.id);
                            setError("");
                            setMessage("");
                        }}
                    >
                        <strong>{view.label}</strong>
                        {view.id === "records" && records.length > 0 && (
                            <span>{records.length}</span>
                        )}
                        {view.id === "ambassadors" && ambassadors.length > 0 && (
                            <span>{ambassadors.length}</span>
                        )}
                        {view.id === "updates" && campaign.fieldUpdates.length > 0 && (
                            <span>{campaign.fieldUpdates.length}</span>
                        )}
                    </AdminButton>
                ))}
            </nav>

            <label className={styles.adminViewSelect}>
                אזור ניהול
                <AdminSelect aria-label="אזור ניהול" value={activeView}
                    onChange={(event) => {
                        setActiveView(event.target.value as AdminView);
                        setError("");
                        setMessage("");
                    }}
                >
                    {primaryAdminViews.map((view) => (
                        <option key={view.id} value={view.id}>
                            {view.label} — {view.description}
                        </option>
                    ))}
                    {activeView === "history" && (
                        <option value="history">היסטוריה — שינויים וכלים</option>
                    )}
                </AdminSelect>
            </label>

            <details className={styles.mobileExtraNav}>
                <summary>אפשרויות נוספות</summary>
                <AdminButton
                    type="button"
                    onClick={() => {
                        setActiveView("history");
                        setError("");
                        setMessage("");
                    }}
                >
                    היסטוריה וכלים טכניים
                </AdminButton>
            </details>

            {activeView === "history" && (
            <details className={styles.technicalTools}>
                <summary>
                    <div>
                        <strong>כלים טכניים ואבחון זמני</strong>
                        <span>לשימוש רק במקרה של תקלה או בדיקת חיבור</span>
                    </div>
                    <AdminBadge tone={diagnostics?.enabled ? "success" : "neutral"}>
                        {diagnostics?.enabled
                            ? "האבחון פעיל"
                            : "האבחון כבוי"}
                    </AdminBadge>
                </summary>
                <div className={styles.technicalToolsBody}>
                {!diagnostics?.enabled && (
                    <p className={styles.diagnosticInstruction}>
                        כדי להפעיל לעסקת הניסיון בלבד, הגדירו ב־Railway:
                        {" "}
                        <code>DAYCARE_DONATION_DIAGNOSTICS=true</code>
                    </p>
                )}
                {diagnostics?.enabled && diagnostics.paymentTestEnabled && (
                    <AdminButton
                        type="button"
                        className={styles.clearDiagnostics}
                        onClick={() => setDiagnosticPaymentOpen(true)}
                    >
                        פתיחת עסקת ניסיון מאובטחת
                    </AdminButton>
                )}
                {!diagnostics?.diagnostics.length ? (
                    <p className={styles.emptyState}>
                        עדיין לא התקבל Callback לאבחון.
                    </p>
                ) : (
                    <>
                        <div className={styles.diagnosticList}>
                            {diagnostics.diagnostics.map((diagnostic) => (
                                <AdminCard key={diagnostic._id}>
                                    <div>
                                        <strong>
                                            Callback
                                        </strong>
                                        <span>
                                            {diagnostic.status}
                                        </span>
                                    </div>
                                    <dl>
                                        <dt>מזהה intent מקוצר</dt>
                                        <dd>
                                            {diagnostic.intentPublicId.slice(
                                                0,
                                                8
                                            )}
                                        </dd>
                                        <dt>שדות שהתקבלו</dt>
                                        <dd>
                                            {diagnostic.fields.join(", ")}
                                        </dd>
                                        <dt>ערכים טכניים בטוחים</dt>
                                        <dd>
                                            <code>
                                                {JSON.stringify(
                                                    diagnostic.values
                                                )}
                                            </code>
                                        </dd>
                                        <dt>מחיקה אוטומטית</dt>
                                        <dd>
                                            {formatDate(
                                                diagnostic.expiresAt
                                            )}
                                        </dd>
                                    </dl>
                                </AdminCard>
                            ))}
                        </div>
                        <AdminButton
                            type="button"
                            className={styles.clearDiagnostics}
                            onClick={() => setClearDiagnosticsOpen(true)}
                            disabled={saving}
                        >
                            מחיקת נתוני האבחון הזמניים
                        </AdminButton>
                    </>
                )}
                </div>
            </details>
            )}

            <DonationOverviewAdminView model={model} />
            <DonationManualAdminView model={model} />
            <DonationItemsAdminView model={model} />
            <DonationRecordsAdminView model={model} />
            {activeView === "ambassadors" && (
                <DaycareAmbassadorsAdmin
                    ambassadors={ambassadors}
                    records={records}
                    onChanged={loadData}
                />
            )}

            {activeView === "updates" && (
                <DaycareFieldUpdatesAdmin
                    updates={campaign.fieldUpdates}
                    items={campaign.items}
                    onChanged={loadData}
                />
            )}

            {activeView === "history" && (
            <section className={styles.panel}><AdminCard>
                <header>
                    <h2>היסטוריית שינויים</h2>
                    <p>
                        תיעוד של עדכוני יעדים, שיוכים, ביטולים ותשלומים
                        ייעודיים למעון.
                    </p>
                </header>
                {audit.length === 0 ? (
                    <p className={styles.emptyState}>
                        עדיין אין שינויים מתועדים.
                    </p>
                ) : (
                    <ol className={styles.auditList}>
                        {audit.slice(0, 30).map((entry) => (
                            <li key={entry._id}>
                                <span>
                                    {formatDate(entry.createdAt)}
                                </span>
                                <strong>
                                    {auditLabels[entry.action] ??
                                        entry.action}
                                </strong>
                                <small>
                                    {entry.actor === "admin"
                                        ? entry.actorLabel ?? "מנהל"
                                        : entry.actor === "nedarim"
                                          ? "נדרים פלוס"
                                          : "מערכת"}
                                    {entry.reason
                                        ? ` · סיבה: ${entry.reason}`
                                        : ""}
                                </small>
                            </li>
                        ))}
                    </ol>
                )}
            </AdminCard></section>
            )}
            <ConfirmDialog
                open={clearDiagnosticsOpen}
                title="מחיקת נתוני אבחון"
                message="הפעולה תמחק את המידע הטכני הזמני שהתקבל מנדרים פלוס. רשומות התרומה והסכומים לא יימחקו."
                confirmLabel="מחיקת נתוני האבחון"
                tone="danger"
                busy={saving}
                onConfirm={() => void handleClearDiagnostics()}
                onClose={() => setClearDiagnosticsOpen(false)}
            />
            {pendingRecordUpdate && (
                <ReasonDialog
                    title={pendingRecordUpdate.title}
                    message={pendingRecordUpdate.message}
                    busy={saving}
                    onConfirm={(reason) => {
                        void handleRecordUpdate(
                            pendingRecordUpdate.recordId,
                            pendingRecordUpdate.updates,
                            reason
                        ).then((updated) => {
                            if (updated) setPendingRecordUpdate(null);
                        });
                    }}
                    onClose={() => setPendingRecordUpdate(null)}
                />
            )}
            {allocationRecord && (
                <DonationAllocationDialog
                    record={allocationRecord}
                    items={sortItemsByNeed(campaign.items)}
                    busy={saving}
                    onConfirm={(allocations, reason) => {
                        void handleRecordUpdate(
                            allocationRecord._id,
                            { allocations },
                            reason
                        ).then((updated) => {
                            if (updated) setAllocationRecord(null);
                        });
                    }}
                    onClose={() => setAllocationRecord(null)}
                />
            )}
            {diagnosticPaymentOpen && (
                <DonationModalPreview
                    open
                    initialSelection={{
                        kind: "general",
                        id: "general",
                        title: "למקום שבו התרומה נדרשת ביותר",
                    }}
                    donationItems={campaign.items}
                    paymentsEnabled
                    diagnosticMode
                    createIntent={createAdminDiagnosticDonationIntent}
                    onClose={() => setDiagnosticPaymentOpen(false)}
                    onPaymentComplete={() => {
                        window.setTimeout(() => void loadData(), 1200);
                    }}
                />
            )}
            {successPreviewOpen && (
                <DonationModalPreview
                    open
                    initialSelection={{
                        kind: "general",
                        id: "general",
                        title: "למקום שבו התרומה נדרשת ביותר",
                    }}
                    donationItems={campaign.items}
                    paymentsEnabled={campaign.paymentsEnabled}
                    successPreview
                    onClose={() => setSuccessPreviewOpen(false)}
                />
            )}
        </div>
    );
};

export default DaycareDonationsAdminView;
