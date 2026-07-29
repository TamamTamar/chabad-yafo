import { useCallback, useEffect, useMemo, useState } from "react";
import ConfirmDialog from "../../../../components/ConfirmDialog/ConfirmDialog";
import {
    clearAdminDaycareDonationDiagnostics,
    createManualDaycareDonation,
    getAdminDaycareDonationAudit,
    getAdminDaycareDonationCampaign,
    getAdminDaycareDonationDiagnostics,
    getAdminDaycareDonationRecords,
    updateDaycareDonationCampaign,
    updateDaycareDonationItem,
    updateDaycareDonationRecord,
} from "../../../../services/daycareDonationService";
import type {
    DaycareDonationCampaignData,
    DaycareDonationAudit,
    DaycareDonationDiagnostics,
    DaycareDonationRecord,
} from "../../../DaycareDonations/types";
import styles from "./DaycareDonationsAdmin.module.scss";

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("he-IL").format(value);

const formatDate = (value: string) =>
    new Intl.DateTimeFormat("he-IL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));

const statusLabels: Record<DaycareDonationRecord["status"], string> = {
    confirmed: "מאושרת",
    refunded: "הוחזרה",
    cancelled: "בוטלה",
};

const auditLabels: Record<string, string> = {
    "campaign.updated": "הגדרות הקמפיין עודכנו",
    "category.updated": "יעד קטגוריה עודכן",
    "item.updated": "סעיף עודכן",
    "record.manualCreated": "תרומה ידנית נוספה",
    "record.updated": "רשומת תרומה עודכנה",
    "intent.created": "הוכן תשלום באתר",
    "intent.failed": "תשלום לא אושר",
    "payment.confirmed": "תשלום נדרים פלוס אושר",
    "diagnostics.cleared": "נתוני האבחון נמחקו",
};

const DaycareDonationsAdmin = () => {
    const [campaign, setCampaign] =
        useState<DaycareDonationCampaignData | null>(null);
    const [records, setRecords] = useState<DaycareDonationRecord[]>([]);
    const [audit, setAudit] = useState<DaycareDonationAudit[]>([]);
    const [diagnostics, setDiagnostics] =
        useState<DaycareDonationDiagnostics | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [clearDiagnosticsOpen, setClearDiagnosticsOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const loadData = useCallback(async () => {
        const [campaignData, recordData, auditData, diagnosticData] =
            await Promise.all([
            getAdminDaycareDonationCampaign(),
            getAdminDaycareDonationRecords(),
            getAdminDaycareDonationAudit(),
            getAdminDaycareDonationDiagnostics(),
        ]);
        setCampaign(campaignData);
        setRecords(recordData);
        setAudit(auditData);
        setDiagnostics(diagnosticData);
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadData()
                .catch((loadError) => {
                    console.error("Failed to load donation admin:", loadError);
                    setError("לא הצלחנו לטעון את נתוני התרומות.");
                })
                .finally(() => setLoading(false));
        }, 0);
        return () => window.clearTimeout(timer);
    }, [loadData]);

    const confirmedCount = useMemo(
        () => records.filter((record) => record.status === "confirmed").length,
        [records]
    );

    const handleManualDonation = async (
        event: React.FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);

        setSaving(true);
        setError("");
        setMessage("");

        try {
            await createManualDaycareDonation({
                amount: Number(data.get("amount")),
                itemId: String(data.get("itemId") ?? "") || undefined,
                donorName: String(data.get("donorName") ?? "") || undefined,
                phone: String(data.get("phone") ?? "") || undefined,
                email: String(data.get("email") ?? "") || undefined,
                dedication:
                    String(data.get("dedication") ?? "") || undefined,
                note: String(data.get("note") ?? "") || undefined,
                manualSource: String(data.get("manualSource")) as
                    | "bank_transfer"
                    | "cash"
                    | "check"
                    | "other",
                reference:
                    String(data.get("reference") ?? "") || undefined,
                receivedAt: String(data.get("receivedAt") ?? ""),
            });
            form.reset();
            await loadData();
            setMessage("התרומה הידנית נשמרה והמדדים עודכנו.");
        } catch (saveError) {
            console.error("Failed to save manual donation:", saveError);
            setError("שמירת התרומה נכשלה. בדקו את הפרטים ונסו שוב.");
        } finally {
            setSaving(false);
        }
    };

    const handleItemUpdate = async (
        event: React.FormEvent<HTMLFormElement>,
        itemId: string
    ) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setSaving(true);
        setError("");
        setMessage("");

        try {
            const updatedCampaign = await updateDaycareDonationItem(itemId, {
                goal: Number(data.get("goal")),
                statusOverride: String(
                    data.get("statusOverride")
                ) as "auto" | "open" | "closed",
                reason: String(data.get("reason") ?? ""),
            });
            setCampaign(updatedCampaign);
            setMessage("הסעיף עודכן.");
        } catch (saveError) {
            console.error("Failed to update donation item:", saveError);
            setError("עדכון הסעיף נכשל.");
        } finally {
            setSaving(false);
        }
    };

    const handleCampaignUpdate = async (
        event: React.FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setSaving(true);
        setError("");
        setMessage("");

        try {
            const updatedCampaign = await updateDaycareDonationCampaign({
                active: data.get("active") === "on",
            });
            setCampaign(updatedCampaign);
            setMessage("מצב הקמפיין עודכן.");
        } catch (saveError) {
            console.error("Failed to update donation campaign:", saveError);
            setError("עדכון הקמפיין נכשל.");
        } finally {
            setSaving(false);
        }
    };

    const handleRecordUpdate = async (
        recordId: string,
        updates: {
            itemId?: string;
            status?: DaycareDonationRecord["status"];
        },
        reason: string
    ) => {
        setSaving(true);
        setError("");
        setMessage("");

        try {
            await updateDaycareDonationRecord(recordId, {
                ...updates,
                reason,
            });
            await loadData();
            setMessage("רשומת התרומה עודכנה.");
        } catch (saveError) {
            console.error("Failed to update donation record:", saveError);
            setError("עדכון התרומה נכשל.");
        } finally {
            setSaving(false);
        }
    };

    const handleClearDiagnostics = async () => {
        setSaving(true);
        setError("");
        setMessage("");
        try {
            const result = await clearAdminDaycareDonationDiagnostics();
            await loadData();
            setClearDiagnosticsOpen(false);
            setMessage(
                `נמחקו ${result.cleared} רשומות אבחון זמניות.`
            );
        } catch (clearError) {
            console.error("Failed to clear diagnostics:", clearError);
            setError("מחיקת נתוני האבחון נכשלה.");
        } finally {
            setSaving(false);
        }
    };

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
            <section className={styles.summarySection}>
                <header className={styles.sectionHeader}>
                    <div>
                        <h2>קמפיין התרומות למעון</h2>
                        <p>
                            הסכומים בדף הציבורי מחושבים מרשומות מאושרות בלבד.
                        </p>
                    </div>
                    <a href="/daycare-donations" target="_blank" rel="noreferrer">
                        צפייה בדף הציבורי
                    </a>
                </header>

                <div className={styles.metrics}>
                    <article>
                        <span>גויסו בפועל</span>
                        <strong>₪{formatCurrency(campaign.raised)}</strong>
                    </article>
                    <article>
                        <span>יעד הקמפיין</span>
                        <strong>₪{formatCurrency(campaign.goal)}</strong>
                    </article>
                    <article>
                        <span>תרומות כלליות שטרם שויכו</span>
                        <strong>
                            ₪{formatCurrency(campaign.generalRaised)}
                        </strong>
                    </article>
                    <article>
                        <span>תרומות מאושרות</span>
                        <strong>{confirmedCount}</strong>
                    </article>
                    {(campaign.overflow ?? 0) > 0 && (
                        <article>
                            <span>חריגה מעל יעד הקמפיין</span>
                            <strong>
                                ₪{formatCurrency(campaign.overflow ?? 0)}
                            </strong>
                        </article>
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
            </section>

            {(message || error) && (
                <p
                    className={error ? styles.errorMessage : styles.successMessage}
                    role="status"
                >
                    {error || message}
                </p>
            )}

            <section className={`${styles.panel} ${styles.diagnosticPanel}`}>
                <header className={styles.sectionHeader}>
                    <div>
                        <h2>אבחון זמני — נדרים פלוס</h2>
                        <p>
                            מיועד לעסקת הניסיון בלבד. לא נשמרים כאן פרטי
                            אשראי או פרטים אישיים.
                        </p>
                    </div>
                    <span
                        className={
                            diagnostics?.enabled
                                ? styles.diagnosticEnabled
                                : styles.diagnosticDisabled
                        }
                    >
                        {diagnostics?.enabled
                            ? "האבחון פעיל"
                            : "האבחון כבוי"}
                    </span>
                </header>
                {!diagnostics?.enabled && (
                    <p className={styles.diagnosticInstruction}>
                        כדי להפעיל לעסקת הניסיון בלבד, הגדירו ב־Railway:
                        {" "}
                        <code>DAYCARE_DONATION_DIAGNOSTICS=true</code>
                    </p>
                )}
                {!diagnostics?.diagnostics.length ? (
                    <p className={styles.emptyState}>
                        עדיין לא התקבל Callback לאבחון.
                    </p>
                ) : (
                    <>
                        <div className={styles.diagnosticList}>
                            {diagnostics.diagnostics.map((diagnostic) => (
                                <article key={diagnostic._id}>
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
                                </article>
                            ))}
                        </div>
                        <button
                            type="button"
                            className={styles.clearDiagnostics}
                            onClick={() => setClearDiagnosticsOpen(true)}
                            disabled={saving}
                        >
                            מחיקת נתוני האבחון הזמניים
                        </button>
                    </>
                )}
            </section>

            <section className={styles.panel}>
                <header>
                    <h2>הגדרות ויעדים</h2>
                    <p>
                        יעד הקמפיין ויעדי הקטגוריות מחושבים אוטומטית
                        מסכום יעדי הסעיפים.
                    </p>
                </header>
                <form
                    className={styles.campaignForm}
                    onSubmit={handleCampaignUpdate}
                >
                    <p>
                        יעד מחושב:{" "}
                        <strong>₪{formatCurrency(campaign.goal)}</strong>
                    </p>
                    <label className={styles.checkboxLabel}>
                        <input
                            name="active"
                            type="checkbox"
                            defaultChecked={campaign.active}
                        />
                        הקמפיין פתוח לתרומות
                    </label>
                    <button type="submit" disabled={saving}>
                        שמירת מצב הקמפיין
                    </button>
                </form>
                <div className={styles.categoryList}>
                    {campaign.categories.map((category) => (
                        <div
                            className={styles.categoryRow}
                            key={category.id}
                        >
                            <div>
                                <strong>{category.title}</strong>
                                <span>
                                    גויסו ₪
                                    {formatCurrency(
                                        campaign.items
                                            .filter(
                                                (item) =>
                                                    item.categoryId ===
                                                    category.id
                                            )
                                            .reduce(
                                                (sum, item) =>
                                                    sum + item.raised,
                                                0
                                            )
                                    )}
                                </span>
                            </div>
                            <strong>
                                יעד מחושב ₪
                                {formatCurrency(category.goal)}
                            </strong>
                        </div>
                    ))}
                </div>
            </section>

            <section className={styles.panel}>
                <header>
                    <h2>הזנת תרומה ידנית</h2>
                    <p>
                        עבור העברה בנקאית, מזומן, צ׳ק או תרומה שהתקבלה מחוץ
                        לאתר.
                    </p>
                </header>
                <form
                    className={styles.manualForm}
                    onSubmit={handleManualDonation}
                >
                    <label>
                        סכום
                        <input
                            name="amount"
                            type="number"
                            min="1"
                            step="0.01"
                            required
                        />
                    </label>
                    <label>
                        שיוך
                        <select name="itemId" defaultValue="">
                            <option value="">
                                למקום שבו התרומה נדרשת ביותר
                            </option>
                            {campaign.items.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.title}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        מקור התרומה
                        <select
                            name="manualSource"
                            defaultValue="bank_transfer"
                            required
                        >
                            <option value="bank_transfer">
                                העברה בנקאית
                            </option>
                            <option value="cash">מזומן</option>
                            <option value="check">צ׳ק</option>
                            <option value="other">אחר</option>
                        </select>
                    </label>
                    <label>
                        שם התורם
                        <input name="donorName" type="text" />
                    </label>
                    <label>
                        תאריך קבלה
                        <input
                            name="receivedAt"
                            type="date"
                            defaultValue={new Date()
                                .toISOString()
                                .slice(0, 10)}
                            required
                        />
                    </label>
                    <label>
                        טלפון
                        <input name="phone" type="tel" />
                    </label>
                    <label>
                        דוא״ל
                        <input name="email" type="email" />
                    </label>
                    <label className={styles.fullField}>
                        הקדשה
                        <input name="dedication" type="text" />
                    </label>
                    <label className={styles.fullField}>
                        אסמכתא
                        <input
                            name="reference"
                            type="text"
                            placeholder="מספר העברה / מספר צ׳ק / אסמכתא"
                        />
                    </label>
                    <label className={styles.fullField}>
                        הערה פנימית (חובה אם אין אסמכתא)
                        <textarea name="note" rows={2} />
                    </label>
                    <button type="submit" disabled={saving}>
                        {saving ? "שומר..." : "שמירת תרומה ועדכון המדדים"}
                    </button>
                </form>
            </section>

            <section className={styles.panel}>
                <header>
                    <h2>יעדים ומצב הסעיפים</h2>
                    <p>
                        מצב אוטומטי נסגר ב־100%. ניתן לפתוח או לסגור סעיף
                        ידנית.
                    </p>
                </header>
                <div className={styles.itemList}>
                    {campaign.items.map((item) => (
                        <form
                            className={styles.itemRow}
                            key={item.id}
                            onSubmit={(event) =>
                                handleItemUpdate(event, item.id)
                            }
                        >
                            <div>
                                <strong>{item.title}</strong>
                                <span>
                                    גויסו ₪{formatCurrency(item.raised)}
                                    {(item.overflow ?? 0) > 0 &&
                                        ` · חריגה ₪${formatCurrency(
                                            item.overflow ?? 0
                                        )}`}
                                </span>
                            </div>
                            <label>
                                יעד
                                <input
                                    name="goal"
                                    type="number"
                                    min="0"
                                    defaultValue={item.goal}
                                />
                            </label>
                            <label>
                                סיבת השינוי
                                <input
                                    name="reason"
                                    type="text"
                                    required
                                />
                            </label>
                            <label>
                                מצב
                                <select
                                    name="statusOverride"
                                    defaultValue={item.statusOverride ?? "auto"}
                                >
                                    <option value="auto">אוטומטי</option>
                                    <option value="open">פתוח ידנית</option>
                                    <option value="closed">סגור ידנית</option>
                                </select>
                            </label>
                            <button type="submit" disabled={saving}>
                                שמירה
                            </button>
                        </form>
                    ))}
                </div>
            </section>

            <section className={styles.panel}>
                <header>
                    <h2>רשומות תרומה</h2>
                    <p>
                        אפשר לשייך תרומה כללית לסעיף או לסמן ביטול/החזר
                        מבלי למחוק את הרשומה.
                    </p>
                </header>
                {records.length === 0 ? (
                    <p className={styles.emptyState}>
                        עדיין לא הוזנו תרומות אמיתיות.
                    </p>
                ) : (
                    <div className={styles.recordsTableWrap}>
                        <table className={styles.recordsTable}>
                            <thead>
                                <tr>
                                    <th>תאריך</th>
                                    <th>תורם</th>
                                    <th>סכום</th>
                                    <th>שיוך</th>
                                    <th>מצב</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map((record) => (
                                    <tr key={record._id}>
                                        <td>{formatDate(record.receivedAt)}</td>
                                        <td>{record.donorName || "לא צוין"}</td>
                                        <td>
                                            ₪{formatCurrency(record.amount)}
                                        </td>
                                        <td>
                                            <select
                                                aria-label={`שיוך התרומה של ${record.donorName || "תורם"}`}
                                                value={record.itemId ?? ""}
                                                disabled={saving}
                                                onChange={(event) => {
                                                    const reason =
                                                        window.prompt(
                                                            "יש להזין סיבה לשינוי השיוך"
                                                        );
                                                    if (!reason?.trim()) return;
                                                    void handleRecordUpdate(
                                                        record._id,
                                                        {
                                                            itemId:
                                                                event.target
                                                                    .value,
                                                        },
                                                        reason.trim()
                                                    );
                                                }}
                                            >
                                                <option value="">
                                                    תרומה כללית
                                                </option>
                                                {campaign.items.map((item) => (
                                                    <option
                                                        key={item.id}
                                                        value={item.id}
                                                    >
                                                        {item.title}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td>
                                            <select
                                                aria-label={`מצב התרומה של ${record.donorName || "תורם"}`}
                                                value={record.status}
                                                disabled={saving}
                                                onChange={(event) => {
                                                    const reason =
                                                        window.prompt(
                                                            "יש להזין סיבה לביטול, החזר או שינוי מצב"
                                                        );
                                                    if (!reason?.trim()) return;
                                                    void handleRecordUpdate(
                                                        record._id,
                                                        {
                                                            status: event.target
                                                                .value as DaycareDonationRecord["status"],
                                                        },
                                                        reason.trim()
                                                    );
                                                }}
                                            >
                                                {Object.entries(
                                                    statusLabels
                                                ).map(([value, label]) => (
                                                    <option
                                                        key={value}
                                                        value={value}
                                                    >
                                                        {label}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <section className={styles.panel}>
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
            </section>
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
        </div>
    );
};

export default DaycareDonationsAdmin;
