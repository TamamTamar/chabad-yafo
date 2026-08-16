import { useCallback, useEffect, useMemo, useState } from "react";
import ConfirmDialog from "../../../../components/ConfirmDialog/ConfirmDialog";
import ReasonDialog from "../../../../components/ReasonDialog/ReasonDialog";
import {
    clearAdminDaycareDonationDiagnostics,
    createAdminDiagnosticDonationIntent,
    createManualDaycareDonation,
    getAdminDaycareDonationAudit,
    getAdminDaycareDonationAmbassadors,
    getAdminDaycareDonationCampaign,
    getAdminDaycareDonationDiagnostics,
    getAdminDaycareDonationLeads,
    getAdminDaycareDonationRecords,
    updateDaycareDonationCampaign,
    updateDaycareDonationItem,
    updateDaycareDonationRecord,
} from "../../../../services/daycareDonationService";
import type {
    DaycareDonationCampaignData,
    DaycareDonationAmbassador,
    DaycareDonationAudit,
    DaycareDonationDiagnostics,
    DaycareDonationLead,
    DaycareDonationRecord,
    DonationItem,
} from "../../../DaycareDonations/types";
import DonationModalPreview from "../../../DaycareDonations/components/DonationModalPreview";
import DaycareAmbassadorsAdmin from "./DaycareAmbassadorsAdmin";
import DaycareDonationLeadsAdmin from "./DaycareDonationLeadsAdmin";
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

const toLocalDateTimeInputValue = (date = new Date()) => {
    const localTime = new Date(
        date.getTime() - date.getTimezoneOffset() * 60_000
    );
    return localTime.toISOString().slice(0, 16);
};

const getItemRemaining = (item: DonationItem) =>
    Math.max(0, item.remaining ?? item.goal - item.raised);

const sortItemsByNeed = (items: DonationItem[]) =>
    [...items].sort((first, second) => {
        const needDifference =
            getItemRemaining(second) - getItemRemaining(first);

        if (needDifference !== 0) return needDifference;

        return (first.openingPriority ?? 0) - (second.openingPriority ?? 0);
    });

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
    "diagnostic.intentCreated": "הוכנה עסקת בדיקה",
    "diagnostic.paymentObserved": "עסקת הבדיקה התקבלה",
    "diagnostics.cleared": "נתוני האבחון נמחקו",
    "ambassador.created": "שגריר נוסף",
    "ambassador.updated": "פרטי שגריר עודכנו",
    "ambassador.deleted": "שגריר נמחק",
    "lead.created": "פנייה לתורם נוספה",
    "lead.updated": "פנייה לתורם עודכנה",
};

type AdminView =
    | "overview"
    | "records"
    | "ambassadors"
    | "leads"
    | "manual"
    | "items"
    | "history";

type PendingRecordUpdate = {
    recordId: string;
    updates: {
        itemId?: string;
        ambassadorId?: string;
        status?: DaycareDonationRecord["status"];
        displayDonorName?: boolean;
    };
    title: string;
    message: string;
};

const adminViews: Array<{
    id: AdminView;
    label: string;
    description: string;
}> = [
    { id: "overview", label: "סקירה", description: "מצב הקמפיין" },
    { id: "records", label: "תרומות", description: "רשומות ושיוכים" },
    { id: "ambassadors", label: "שגרירים", description: "לינקים ומעקב" },
    { id: "leads", label: "פניות", description: "מעקב והבטחות" },
    { id: "manual", label: "הזנה ידנית", description: "תרומה מחוץ לאתר" },
    { id: "items", label: "סעיפים ויעדים", description: "יעדים ומצבים" },
    { id: "history", label: "היסטוריה", description: "שינויים וכלים" },
];

const primaryAdminViews = adminViews.filter(
    (view) => view.id !== "history"
);

const DaycareDonationsAdmin = () => {
    const [campaign, setCampaign] =
        useState<DaycareDonationCampaignData | null>(null);
    const [records, setRecords] = useState<DaycareDonationRecord[]>([]);
    const [ambassadors, setAmbassadors] = useState<DaycareDonationAmbassador[]>([]);
    const [leads, setLeads] = useState<DaycareDonationLead[]>([]);
    const [audit, setAudit] = useState<DaycareDonationAudit[]>([]);
    const [diagnostics, setDiagnostics] =
        useState<DaycareDonationDiagnostics | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [clearDiagnosticsOpen, setClearDiagnosticsOpen] = useState(false);
    const [diagnosticPaymentOpen, setDiagnosticPaymentOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [activeView, setActiveView] = useState<AdminView>("overview");
    const [recordQuery, setRecordQuery] = useState("");
    const [recordStatus, setRecordStatus] = useState<
        "all" | DaycareDonationRecord["status"]
    >("all");
    const [pendingRecordUpdate, setPendingRecordUpdate] =
        useState<PendingRecordUpdate | null>(null);

    const loadData = useCallback(async () => {
        const [
            campaignData,
            recordData,
            ambassadorData,
            leadData,
            auditData,
            diagnosticData,
        ] =
            await Promise.all([
            getAdminDaycareDonationCampaign(),
            getAdminDaycareDonationRecords(),
            getAdminDaycareDonationAmbassadors(),
            getAdminDaycareDonationLeads(),
            getAdminDaycareDonationAudit(),
            getAdminDaycareDonationDiagnostics(),
        ]);
        setCampaign(campaignData);
        setRecords(recordData);
        setAmbassadors(ambassadorData);
        setLeads(leadData);
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

    const filteredRecords = useMemo(() => {
        const normalizedQuery = recordQuery.trim().toLocaleLowerCase("he");
        return records.filter((record) => {
            const matchesStatus =
                recordStatus === "all" || record.status === recordStatus;
            const matchesQuery =
                !normalizedQuery ||
                [
                    record.donorName,
                    record.email,
                    record.phone,
                    record.externalTransactionId,
                    record.reference,
                    record.ambassadorId?.name,
                ].some((value) =>
                    String(value ?? "")
                        .toLocaleLowerCase("he")
                        .includes(normalizedQuery)
                );
            return matchesStatus && matchesQuery;
        });
    }, [recordQuery, recordStatus, records]);

    const handleManualDonation = async (
        event: React.FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const receivedAtValue = String(data.get("receivedAt") ?? "");
        const receivedAt = new Date(receivedAtValue);

        setSaving(true);
        setError("");
        setMessage("");

        try {
            await createManualDaycareDonation({
                amount: Number(data.get("amount")),
                itemId: String(data.get("itemId") ?? "") || undefined,
                donorName: String(data.get("donorName") ?? "") || undefined,
                displayDonorName: data.get("displayDonorName") === "on",
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
                receivedAt: Number.isNaN(receivedAt.getTime())
                    ? receivedAtValue
                    : receivedAt.toISOString(),
            });
            form.reset();
            await loadData();
            setActiveView("records");
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
            ambassadorId?: string;
            status?: DaycareDonationRecord["status"];
            displayDonorName?: boolean;
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
            return true;
        } catch (saveError) {
            console.error("Failed to update donation record:", saveError);
            setError("עדכון התרומה נכשל.");
            return false;
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

            <nav className={styles.adminViewNav} aria-label="אזורי ניהול התרומות">
                {adminViews.map((view) => (
                    <button
                        key={view.id}
                        type="button"
                        className={
                            activeView === view.id ? styles.activeView : ""
                        }
                        aria-pressed={activeView === view.id}
                        onClick={() => {
                            setActiveView(view.id);
                            setError("");
                            setMessage("");
                        }}
                    >
                        <strong>{view.label}</strong>
                        <small>{view.description}</small>
                        {view.id === "records" && records.length > 0 && (
                            <span>{records.length}</span>
                        )}
                        {view.id === "ambassadors" && ambassadors.length > 0 && (
                            <span>{ambassadors.length}</span>
                        )}
                        {view.id === "leads" && leads.length > 0 && (
                            <span>{leads.length}</span>
                        )}
                    </button>
                ))}
            </nav>

            <label className={styles.adminViewSelect}>
                אזור ניהול
                <select
                    value={activeView}
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
                </select>
            </label>

            <details className={styles.mobileExtraNav}>
                <summary>אפשרויות נוספות</summary>
                <button
                    type="button"
                    onClick={() => {
                        setActiveView("history");
                        setError("");
                        setMessage("");
                    }}
                >
                    היסטוריה וכלים טכניים
                </button>
            </details>

            {activeView === "history" && (
            <details className={styles.technicalTools}>
                <summary>
                    <div>
                        <strong>כלים טכניים ואבחון זמני</strong>
                        <span>לשימוש רק במקרה של תקלה או בדיקת חיבור</span>
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
                    <button
                        type="button"
                        className={styles.clearDiagnostics}
                        onClick={() => setDiagnosticPaymentOpen(true)}
                    >
                        פתיחת עסקת ניסיון מאובטחת
                    </button>
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
                </div>
            </details>
            )}

            {activeView === "overview" && (
            <>
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
                    <h2>עבודה שוטפת</h2>
                    <p>הפעולות הנפוצות נמצאות במרחק לחיצה אחת.</p>
                </header>
                <div className={styles.quickActions}>
                    <button
                        type="button"
                        onClick={() => setActiveView("records")}
                    >
                        <strong>צפייה בתרומות</strong>
                        <small>{records.length} רשומות</small>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveView("manual")}
                    >
                        <strong>הוספת תרומה ידנית</strong>
                        <small>מזומן, צ׳ק או העברה</small>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveView("items")}
                    >
                        <strong>עריכת סעיפים</strong>
                        <small>{campaign.items.length} סעיפים</small>
                    </button>
                </div>
                <div className={styles.recentRecords}>
                    <div>
                        <h3>תרומות אחרונות</h3>
                        {records.length > 5 && (
                            <button
                                type="button"
                                onClick={() => setActiveView("records")}
                            >
                                לכל התרומות
                            </button>
                        )}
                    </div>
                    {records.length === 0 ? (
                        <p className={styles.emptyState}>
                            התרומה הראשונה שתתקבל תופיע כאן.
                        </p>
                    ) : (
                        <ul>
                            {records.slice(0, 5).map((record) => (
                                <li key={record._id}>
                                    <div>
                                        <strong>
                                            {record.donorName ||
                                                "תורם אנונימי"}
                                        </strong>
                                        <span>
                                            {formatDate(record.receivedAt)}
                                        </span>
                                    </div>
                                    <strong>
                                        ₪{formatCurrency(record.amount)}
                                    </strong>
                                    <span>{statusLabels[record.status]}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </section>
            </>
            )}

            {activeView === "manual" && (
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
                            {sortItemsByNeed(campaign.items).map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.title} — {getItemRemaining(item) > 0
                                        ? `חסרים ₪${formatCurrency(getItemRemaining(item))}`
                                        : "היעד הושלם"}
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
                    <label className={`${styles.manualPrivacyChoice} ${styles.fullField}`}>
                        <input
                            name="displayDonorName"
                            type="checkbox"
                            defaultChecked
                        />
                        <span>
                            <strong>להציג את שם התורם בעמוד הקמפיין</strong>
                            <small>
                                בטלו את הסימון כדי שהתרומה תוצג כאנונימית, בלי למחוק את השם מהאדמין.
                            </small>
                        </span>
                    </label>
                    <label>
                        תאריך ושעת קבלה
                        <input
                            name="receivedAt"
                            type="datetime-local"
                            defaultValue={toLocalDateTimeInputValue()}
                            step="60"
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
            )}

            {activeView === "items" && (
            <section className={styles.panel}>
                <header>
                    <h2>סעיפים ויעדים</h2>
                    <p>
                        הסעיפים מקובצים לפי קטגוריות. פתחו רק את הקבוצה
                        שתרצו לערוך.
                    </p>
                </header>
                <div className={styles.categoryEditors}>
                    {campaign.categories.map((category, categoryIndex) => (
                        <details
                            className={styles.categoryEditor}
                            key={category.id}
                            open={categoryIndex === 0}
                        >
                            <summary>
                                <div>
                                    <strong>{category.title}</strong>
                                    <span>
                                        {
                                            campaign.items.filter(
                                                (item) =>
                                                    item.categoryId ===
                                                    category.id
                                            ).length
                                        }{" "}
                                        סעיפים
                                    </span>
                                </div>
                                <strong>
                                    יעד ₪{formatCurrency(category.goal)}
                                </strong>
                            </summary>
                            <div className={styles.itemList}>
                                {campaign.items
                                    .filter(
                                        (item) =>
                                            item.categoryId === category.id
                                    )
                                    .map((item) => (
                                        <form
                                            className={styles.itemRow}
                                            key={item.id}
                                            onSubmit={(event) =>
                                                handleItemUpdate(
                                                    event,
                                                    item.id
                                                )
                                            }
                                        >
                                            <div>
                                                <strong>{item.title}</strong>
                                                <span>
                                                    גויסו ₪
                                                    {formatCurrency(
                                                        item.raised
                                                    )}
                                                    {(item.overflow ?? 0) >
                                                        0 &&
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
                                                מצב
                                                <select
                                                    name="statusOverride"
                                                    defaultValue={
                                                        item.statusOverride ??
                                                        "auto"
                                                    }
                                                >
                                                    <option value="auto">
                                                        אוטומטי
                                                    </option>
                                                    <option value="open">
                                                        פתוח ידנית
                                                    </option>
                                                    <option value="closed">
                                                        סגור ידנית
                                                    </option>
                                                </select>
                                            </label>
                                            <label>
                                                סיבת השינוי
                                                <input
                                                    name="reason"
                                                    type="text"
                                                    required
                                                />
                                            </label>
                                            <button
                                                type="submit"
                                                disabled={saving}
                                            >
                                                שמירה
                                            </button>
                                        </form>
                                    ))}
                            </div>
                        </details>
                    ))}
                </div>
            </section>
            )}

            {activeView === "records" && (
            <section className={styles.panel}>
                <header>
                    <h2>רשומות תרומה</h2>
                    <p>
                        אפשר לשייך תרומה כללית לסעיף או לשגריר, ולסמן
                        ביטול/החזר מבלי למחוק את הרשומה.
                    </p>
                </header>
                <div className={styles.recordFilters}>
                    <label>
                        חיפוש
                        <input
                            type="search"
                            value={recordQuery}
                            placeholder="שם, טלפון, דוא״ל או מספר עסקה"
                            onChange={(event) =>
                                setRecordQuery(event.target.value)
                            }
                        />
                    </label>
                    <label>
                        מצב
                        <select
                            value={recordStatus}
                            onChange={(event) =>
                                setRecordStatus(
                                    event.target.value as
                                        | "all"
                                        | DaycareDonationRecord["status"]
                                )
                            }
                        >
                            <option value="all">כל המצבים</option>
                            {Object.entries(statusLabels).map(
                                ([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                )
                            )}
                        </select>
                    </label>
                    <span>
                        מוצגות {filteredRecords.length} מתוך {records.length}
                    </span>
                </div>
                {records.length === 0 ? (
                    <p className={styles.emptyState}>
                        עדיין לא הוזנו תרומות אמיתיות.
                    </p>
                ) : filteredRecords.length === 0 ? (
                    <p className={styles.emptyState}>
                        לא נמצאו תרומות שמתאימות לחיפוש.
                    </p>
                ) : (
                    <div className={styles.recordsTableWrap}>
                        <table className={styles.recordsTable}>
                            <thead>
                                <tr>
                                    <th>תאריך</th>
                                    <th>תורם</th>
                                    <th>מקור</th>
                                    <th>סכום</th>
                                    <th>שגריר</th>
                                    <th>פרסום</th>
                                    <th>שיוך</th>
                                    <th>מצב</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRecords.map((record) => (
                                    <tr className={styles.recordRow} key={record._id}>
                                        <td data-label="תאריך">
                                            {formatDate(record.receivedAt)}
                                        </td>
                                        <td data-label="תורם">
                                            <div className={styles.recordDonor}>
                                                <strong>
                                                    {record.donorName ||
                                                        "לא צוין"}
                                                </strong>
                                                <small>
                                                    {record.email ||
                                                        record.phone ||
                                                        ""}
                                                </small>
                                            </div>
                                        </td>
                                        <td data-label="מקור">
                                            {record.source === "nedarim"
                                                ? "נדרים פלוס"
                                                : "ידנית"}
                                        </td>
                                        <td data-label="סכום">
                                            <div className={styles.recordDonor}>
                                                <strong>
                                                    ₪{formatCurrency(record.amount)}
                                                </strong>
                                                {record.paymentType === "HK" && (
                                                    <small>
                                                        הו״ק: ₪{formatCurrency(
                                                            record.amount /
                                                                (record.installments || 12)
                                                        )} × {record.installments || 12}
                                                    </small>
                                                )}
                                                {record.paymentType === "Ragil" &&
                                                    (record.installments || 1) > 1 && (
                                                        <small>
                                                            {record.installments} תשלומים
                                                        </small>
                                                    )}
                                            </div>
                                        </td>
                                        <td data-label="שגריר">
                                            <select
                                                aria-label={`שגריר לתרומה של ${record.donorName || "תורם"}`}
                                                value={record.ambassadorId?._id ?? ""}
                                                disabled={saving}
                                                onChange={(event) => {
                                                    const ambassadorId =
                                                        event.target.value;
                                                    const ambassadorName =
                                                        ambassadors.find(
                                                            (ambassador) =>
                                                                ambassador._id ===
                                                                ambassadorId
                                                        )?.name ??
                                                        "ללא שגריר";
                                                    setPendingRecordUpdate({
                                                        recordId: record._id,
                                                        updates: {
                                                            ambassadorId,
                                                        },
                                                        title: "שינוי שגריר לתרומה",
                                                        message: ambassadorId
                                                            ? `התרומה של ${record.donorName || "תורם ללא שם"} תשויך לשגריר/ה ${ambassadorName}.`
                                                            : `השיוך של התרומה של ${record.donorName || "תורם ללא שם"} לשגריר יוסר והיא תיחשב כתרומה כללית.`,
                                                    });
                                                }}
                                            >
                                                <option value="">
                                                    ללא שגריר — תרומה כללית
                                                </option>
                                                {ambassadors.map((ambassador) => (
                                                    <option
                                                        key={ambassador._id}
                                                        value={ambassador._id}
                                                        disabled={
                                                            !ambassador.active &&
                                                            record.ambassadorId?._id !==
                                                                ambassador._id
                                                        }
                                                    >
                                                        {ambassador.name}
                                                        {!ambassador.active
                                                            ? " — לא פעיל"
                                                            : ""}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td data-label="פרסום">
                                            <button
                                                type="button"
                                                className={`${styles.publicationToggle} ${
                                                    record.displayDonorName !== false
                                                        ? styles.publicationToggleActive
                                                        : ""
                                                }`}
                                                disabled={saving || !record.donorName}
                                                aria-pressed={record.displayDonorName !== false}
                                                title={record.donorName ? "שינוי הרשאה להצגת שם התורם באתר" : "אי אפשר לפרסם תרומה ללא שם"}
                                                onClick={() => {
                                                    const displayDonorName = record.displayDonorName === false;
                                                    setPendingRecordUpdate({
                                                        recordId: record._id,
                                                        updates: { displayDonorName },
                                                        title: displayDonorName ? "אישור הצגת שם באתר" : "הסרת שם מהאתר",
                                                        message: displayDonorName
                                                            ? `יש לוודא שהתקבל אישור מ${record.donorName} להצגת השם והסכום בעמוד הקמפיין. כתבו בשדה הסיבה כיצד התקבל האישור.`
                                                            : `השם של ${record.donorName} יוסר מעמוד הקמפיין והתרומה תוצג כאנונימית.`,
                                                    });
                                                }}
                                            >
                                                <span aria-hidden="true" />
                                                {record.displayDonorName !== false ? "מוצג באתר" : "פרטי"}
                                            </button>
                                        </td>
                                        <td data-label="שיוך">
                                            <select
                                                aria-label={`שיוך התרומה של ${record.donorName || "תורם"}`}
                                                value={record.itemId ?? ""}
                                                disabled={saving}
                                                onChange={(event) => {
                                                    const itemId =
                                                        event.target.value;
                                                    const itemTitle =
                                                        campaign.items.find(
                                                            (item) =>
                                                                item.id ===
                                                                itemId
                                                        )?.title ??
                                                        "תרומה כללית";
                                                    setPendingRecordUpdate({
                                                        recordId: record._id,
                                                        updates: { itemId },
                                                        title: "שינוי שיוך תרומה",
                                                        message: `התרומה של ${record.donorName || "תורם ללא שם"} תשויך אל "${itemTitle}".`,
                                                    });
                                                }}
                                            >
                                                <option value="">
                                                    תרומה כללית
                                                </option>
                                                {sortItemsByNeed(campaign.items).map((item) => (
                                                    <option
                                                        key={item.id}
                                                        value={item.id}
                                                    >
                                                        {item.title} — {getItemRemaining(item) > 0
                                                            ? `חסרים ₪${formatCurrency(getItemRemaining(item))}`
                                                            : "היעד הושלם"}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td data-label="מצב">
                                            <select
                                                aria-label={`מצב התרומה של ${record.donorName || "תורם"}`}
                                                value={record.status}
                                                disabled={saving}
                                                onChange={(event) => {
                                                    const status =
                                                        event.target
                                                            .value as DaycareDonationRecord["status"];
                                                    setPendingRecordUpdate({
                                                        recordId: record._id,
                                                        updates: { status },
                                                        title: "שינוי מצב תרומה",
                                                        message: `מצב התרומה של ${record.donorName || "תורם ללא שם"} ישתנה ל"${statusLabels[status]}".`,
                                                    });
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
            )}

            {activeView === "ambassadors" && (
                <DaycareAmbassadorsAdmin
                    ambassadors={ambassadors}
                    records={records}
                    onChanged={loadData}
                />
            )}

            {activeView === "leads" && (
                <DaycareDonationLeadsAdmin
                    leads={leads}
                    ambassadors={ambassadors}
                    onChanged={loadData}
                />
            )}

            {activeView === "history" && (
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
        </div>
    );
};

export default DaycareDonationsAdmin;
