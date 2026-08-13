import { useState } from "react";
import { Check, MessageCircle, Pencil, Phone, UserPlus } from "lucide-react";
import {
    createDaycareDonationLead,
    updateDaycareDonationLead,
} from "../../../../services/daycareDonationService";
import type {
    DaycareDonationAmbassador,
    DaycareDonationContactMethod,
    DaycareDonationLead,
    DaycareDonationLeadStatus,
} from "../../../DaycareDonations/types";
import styles from "./DaycareDonationLeadsAdmin.module.scss";

type Props = {
    leads: DaycareDonationLead[];
    ambassadors: DaycareDonationAmbassador[];
    onChanged: () => Promise<void>;
};

const statusLabels: Record<DaycareDonationLeadStatus, string> = {
    new: "טרם פנינו",
    contacted: "נשלחה פנייה",
    waiting: "ממתינים לתשובה",
    pledged: "הובטח",
    completed: "נרשם בתרומות",
    closed: "נסגר ללא תרומה",
};

const methodLabels: Record<DaycareDonationContactMethod, string> = {
    phone: "טלפון",
    whatsapp: "וואטסאפ",
    meeting: "פגישה",
    other: "אחר",
};

const openStatuses: DaycareDonationLeadStatus[] = [
    "new",
    "contacted",
    "waiting",
    "pledged",
];

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("he-IL").format(value);

const formatDate = (value?: string) =>
    value
        ? new Intl.DateTimeFormat("he-IL", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
          }).format(new Date(value))
        : "לא נקבע";

const toDateInput = (value?: string) =>
    value ? new Date(value).toISOString().slice(0, 10) : "";

const toWhatsAppPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    return digits.startsWith("0") ? `972${digits.slice(1)}` : digits;
};

const DaycareDonationLeadsAdmin = ({ leads, ambassadors, onChanged }: Props) => {
    const [adding, setAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [filter, setFilter] = useState<"open" | "all" | "overdue">("open");
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueCount = leads.filter(
        (lead) =>
            openStatuses.includes(lead.status) &&
            lead.nextFollowUpAt &&
            new Date(lead.nextFollowUpAt) < today
    ).length;
    const pledgedTotal = leads
        .filter((lead) => lead.status === "pledged")
        .reduce((sum, lead) => sum + (lead.pledgedAmount ?? 0), 0);
    const openCount = leads.filter((lead) => openStatuses.includes(lead.status)).length;

    const visibleLeads = leads.filter((lead) => {
        if (filter === "all") return true;
        if (filter === "overdue") {
            return (
                openStatuses.includes(lead.status) &&
                Boolean(lead.nextFollowUpAt) &&
                new Date(lead.nextFollowUpAt as string) < today
            );
        }
        return openStatuses.includes(lead.status);
    });

    const runMutation = async (
        mutation: () => Promise<unknown>,
        successMessage: string
    ) => {
        setSaving(true);
        setError("");
        setMessage("");
        try {
            await mutation();
            await onChanged();
            setMessage(successMessage);
            return true;
        } catch (mutationError) {
            console.error("Failed to update donation lead:", mutationError);
            setError("הפעולה נכשלה. בדקו את הפרטים ונסו שוב.");
            return false;
        } finally {
            setSaving(false);
        }
    };

    const formInput = (form: HTMLFormElement) => {
        const data = new FormData(form);
        const targetAmount = String(data.get("targetAmount") ?? "");
        const pledgedAmount = String(data.get("pledgedAmount") ?? "");
        return {
            donorName: String(data.get("donorName") ?? "").trim(),
            phone: String(data.get("phone") ?? "").trim() || undefined,
            ambassadorId:
                String(data.get("ambassadorId") ?? "").trim() || undefined,
            targetAmount: targetAmount ? Number(targetAmount) : undefined,
            pledgedAmount: pledgedAmount ? Number(pledgedAmount) : undefined,
            contactMethod:
                (String(data.get("contactMethod") ?? "") as DaycareDonationContactMethod) ||
                undefined,
            status: String(data.get("status") ?? "new") as DaycareDonationLeadStatus,
            lastContactAt:
                String(data.get("lastContactAt") ?? "").trim() || undefined,
            nextFollowUpAt:
                String(data.get("nextFollowUpAt") ?? "").trim() || undefined,
            notes: String(data.get("notes") ?? "").trim() || undefined,
        };
    };

    const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = event.currentTarget;
        const created = await runMutation(
            () => createDaycareDonationLead(formInput(form)),
            "הפנייה נוספה למעקב."
        );
        if (created) {
            form.reset();
            setAdding(false);
        }
    };

    const handleEdit = async (
        event: React.FormEvent<HTMLFormElement>,
        lead: DaycareDonationLead
    ) => {
        event.preventDefault();
        const updated = await runMutation(
            () => updateDaycareDonationLead(lead._id, formInput(event.currentTarget)),
            "הפנייה עודכנה."
        );
        if (updated) setEditingId(null);
    };

    const quickStatus = (lead: DaycareDonationLead, status: DaycareDonationLeadStatus) =>
        runMutation(
            () =>
                updateDaycareDonationLead(lead._id, {
                    status,
                    lastContactAt:
                        status === "contacted" ? new Date().toISOString() : undefined,
                }),
            status === "completed"
                ? "הפנייה נסגרה לאחר רישום התרומה. רק הרשומה הכספית נספרת בקמפיין."
                : "סטטוס הפנייה עודכן."
        );

    const renderForm = (lead?: DaycareDonationLead) => (
        <form
            className={styles.leadForm}
            onSubmit={(event) =>
                lead ? void handleEdit(event, lead) : void handleCreate(event)
            }
        >
            <label>
                שם התורם/ת
                <input
                    name="donorName"
                    defaultValue={lead?.donorName}
                    maxLength={160}
                    required
                    autoFocus
                />
            </label>
            <label>
                טלפון
                <input name="phone" defaultValue={lead?.phone} maxLength={40} />
            </label>
            <label>
                שגריר/ה
                <select name="ambassadorId" defaultValue={lead?.ambassadorId?._id ?? ""}>
                    <option value="">ללא שיוך</option>
                    {ambassadors.map((ambassador) => (
                        <option key={ambassador._id} value={ambassador._id}>
                            {ambassador.name}
                        </option>
                    ))}
                </select>
            </label>
            <label>
                סכום יעד לבקשה
                <input
                    name="targetAmount"
                    type="number"
                    min="0"
                    step="1"
                    defaultValue={lead?.targetAmount}
                />
            </label>
            <label>
                סכום שהובטח
                <input
                    name="pledgedAmount"
                    type="number"
                    min="0"
                    step="1"
                    defaultValue={lead?.pledgedAmount}
                />
            </label>
            <label>
                אמצעי פנייה
                <select name="contactMethod" defaultValue={lead?.contactMethod ?? ""}>
                    <option value="">לא נבחר</option>
                    {Object.entries(methodLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                    ))}
                </select>
            </label>
            <label>
                סטטוס
                <select name="status" defaultValue={lead?.status ?? "new"}>
                    {Object.entries(statusLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                    ))}
                </select>
            </label>
            <label>
                פנייה אחרונה
                <input
                    name="lastContactAt"
                    type="date"
                    defaultValue={toDateInput(lead?.lastContactAt)}
                />
            </label>
            <label>
                מעקב הבא
                <input
                    name="nextFollowUpAt"
                    type="date"
                    defaultValue={toDateInput(lead?.nextFollowUpAt)}
                />
            </label>
            <label className={styles.wideField}>
                הערות
                <textarea name="notes" rows={2} defaultValue={lead?.notes} maxLength={1200} />
            </label>
            <div className={styles.formActions}>
                <button type="submit" disabled={saving}>שמירה</button>
                {lead && (
                    <button type="button" onClick={() => setEditingId(null)}>
                        ביטול
                    </button>
                )}
            </div>
        </form>
    );

    return (
        <section className={styles.panel}>
            <header className={styles.header}>
                <div>
                    <h2>פניות והבטחות</h2>
                    <p>מעקב לפני קבלת הכסף. רק תרומה שנרשמה ברשומות נספרת בקמפיין.</p>
                </div>
                <button type="button" onClick={() => setAdding((value) => !value)}>
                    <UserPlus aria-hidden="true" size={18} />
                    {adding ? "ביטול" : "פנייה חדשה"}
                </button>
            </header>

            <div className={styles.summary}>
                <article><span>פניות פתוחות</span><strong>{openCount}</strong></article>
                <article className={overdueCount ? styles.alertCard : ""}>
                    <span>מעקבים באיחור</span><strong>{overdueCount}</strong>
                </article>
                <article><span>הבטחות פתוחות</span><strong>₪{formatCurrency(pledgedTotal)}</strong></article>
            </div>

            {(message || error) && (
                <p className={error ? styles.error : styles.success} role="status">
                    {error || message}
                </p>
            )}
            {adding && renderForm()}

            <div className={styles.filters}>
                <button className={filter === "open" ? styles.activeFilter : ""} onClick={() => setFilter("open")}>פתוחות</button>
                <button className={filter === "overdue" ? styles.activeFilter : ""} onClick={() => setFilter("overdue")}>באיחור</button>
                <button className={filter === "all" ? styles.activeFilter : ""} onClick={() => setFilter("all")}>הכול</button>
            </div>

            {visibleLeads.length === 0 ? (
                <p className={styles.empty}>אין פניות להצגה במסנן הזה.</p>
            ) : (
                <div className={styles.leadList}>
                    {visibleLeads.map((lead) => {
                        const overdue =
                            openStatuses.includes(lead.status) &&
                            Boolean(lead.nextFollowUpAt) &&
                            new Date(lead.nextFollowUpAt as string) < today;
                        return (
                            <article className={`${styles.leadCard} ${overdue ? styles.overdue : ""}`} key={lead._id}>
                                {editingId === lead._id ? renderForm(lead) : (
                                    <>
                                        <div className={styles.leadHeader}>
                                            <div>
                                                <strong>{lead.donorName}</strong>
                                                <span>{lead.ambassadorId?.name ?? "ללא שגריר"}</span>
                                            </div>
                                            <span className={styles.status}>{statusLabels[lead.status]}</span>
                                        </div>
                                        <div className={styles.amounts}>
                                            <span>יעד <strong>{lead.targetAmount ? `₪${formatCurrency(lead.targetAmount)}` : "—"}</strong></span>
                                            <span>הובטח <strong>{lead.pledgedAmount ? `₪${formatCurrency(lead.pledgedAmount)}` : "—"}</strong></span>
                                        </div>
                                        <div className={styles.followUp}>
                                            <span className={overdue ? styles.overdueText : ""}>
                                                מעקב הבא: {formatDate(lead.nextFollowUpAt)}
                                            </span>
                                            {lead.contactMethod && <span>{methodLabels[lead.contactMethod]}</span>}
                                        </div>
                                        {lead.notes && <p className={styles.notes}>{lead.notes}</p>}
                                        <div className={styles.actions}>
                                            {lead.phone && (
                                                <a href={`tel:${lead.phone}`} aria-label={`חיוג אל ${lead.donorName}`} title="חיוג">
                                                    <Phone aria-hidden="true" size={18} />
                                                </a>
                                            )}
                                            {lead.phone && (
                                                <a href={`https://wa.me/${toWhatsAppPhone(lead.phone)}`} target="_blank" rel="noreferrer" aria-label={`וואטסאפ אל ${lead.donorName}`} title="וואטסאפ">
                                                    <MessageCircle aria-hidden="true" size={18} />
                                                </a>
                                            )}
                                            <button type="button" onClick={() => setEditingId(lead._id)} aria-label={`עריכת הפנייה של ${lead.donorName}`} title="עריכה">
                                                <Pencil aria-hidden="true" size={18} />
                                            </button>
                                            {lead.status !== "contacted" && (
                                                <button type="button" onClick={() => void quickStatus(lead, "contacted")} title="סימון שנוצר קשר">
                                                    נוצר קשר
                                                </button>
                                            )}
                                            {lead.status !== "completed" && (
                                                <button type="button" onClick={() => void quickStatus(lead, "completed")} title="לאחר רישום הכסף ברשומות התרומה">
                                                    <Check aria-hidden="true" size={18} />
                                                    נרשם בתרומות
                                                </button>
                                            )}
                                        </div>
                                    </>
                                )}
                            </article>
                        );
                    })}
                </div>
            )}
        </section>
    );
};

export default DaycareDonationLeadsAdmin;
