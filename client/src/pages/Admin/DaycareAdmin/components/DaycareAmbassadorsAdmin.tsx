import { Fragment, useState } from "react";
import {
    createDaycareDonationAmbassador,
    updateDaycareDonationAmbassador,
} from "../../../../services/daycareDonationService";
import type {
    DaycareDonationAmbassador,
    DaycareDonationRecord,
} from "../../../DaycareDonations/types";
import styles from "./DaycareAmbassadorsAdmin.module.scss";

type Props = {
    ambassadors: DaycareDonationAmbassador[];
    records: DaycareDonationRecord[];
    onChanged: () => Promise<void>;
};

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("he-IL").format(value);

const formatDate = (value: string) =>
    new Intl.DateTimeFormat("he-IL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(new Date(value));

const getAmbassadorLink = (refCode: string) =>
    `${window.location.origin}/daycare-donations?ref=${encodeURIComponent(refCode)}`;

const DaycareAmbassadorsAdmin = ({
    ambassadors,
    records,
    onChanged,
}: Props) => {
    const [adding, setAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

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
            console.error("Failed to update donation ambassador:", mutationError);
            setError("הפעולה נכשלה. נסו שוב.");
            return false;
        } finally {
            setSaving(false);
        }
    };

    const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = event.currentTarget;
        const name = String(new FormData(form).get("name") ?? "").trim();
        if (!name) return;
        const created = await runMutation(
            () => createDaycareDonationAmbassador(name),
            "השגריר נוסף והלינק האישי מוכן."
        );
        if (created) {
            form.reset();
            setAdding(false);
        }
    };

    const handleRename = async (
        event: React.FormEvent<HTMLFormElement>,
        ambassador: DaycareDonationAmbassador
    ) => {
        event.preventDefault();
        const name = String(
            new FormData(event.currentTarget).get("name") ?? ""
        ).trim();
        if (!name || name === ambassador.name) {
            setEditingId(null);
            return;
        }
        const updated = await runMutation(
            () => updateDaycareDonationAmbassador(ambassador._id, { name }),
            "שם השגריר עודכן."
        );
        if (updated) setEditingId(null);
    };

    const copyLink = async (refCode: string) => {
        setError("");
        try {
            await navigator.clipboard.writeText(getAmbassadorLink(refCode));
            setMessage("הלינק הועתק ללוח.");
        } catch (copyError) {
            console.error("Failed to copy ambassador link:", copyError);
            setError("לא הצלחנו להעתיק אוטומטית. אפשר לסמן ולהעתיק את הלינק.");
        }
    };

    return (
        <section className={styles.panel}>
            <header className={styles.header}>
                <div>
                    <h2>שגרירים</h2>
                    <p>
                        לינקים אישיים למעקב פנימי. דף התרומה נשאר זהה לכל הגולשים.
                    </p>
                </div>
                <button type="button" onClick={() => setAdding((value) => !value)}>
                    {adding ? "ביטול" : "+ הוספת שגריר"}
                </button>
            </header>

            {(message || error) && (
                <p className={error ? styles.error : styles.success} role="status">
                    {error || message}
                </p>
            )}

            {adding && (
                <form className={styles.addForm} onSubmit={handleCreate}>
                    <label>
                        שם השגריר
                        <input name="name" type="text" maxLength={160} required autoFocus />
                    </label>
                    <button type="submit" disabled={saving}>יצירת לינק אישי</button>
                </form>
            )}

            {ambassadors.length === 0 ? (
                <p className={styles.empty}>עדיין לא נוספו שגרירים.</p>
            ) : (
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>שם</th>
                                <th>סטטוס</th>
                                <th>סכום שגויס</th>
                                <th>תרומות</th>
                                <th>לינק אישי</th>
                                <th>פעולות</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ambassadors.map((ambassador) => {
                                const ambassadorRecords = records.filter(
                                    (record) =>
                                        record.ambassadorId?._id === ambassador._id
                                );
                                return (
                                    <Fragment key={ambassador._id}>
                                        <tr>
                                            <td>
                                                {editingId === ambassador._id ? (
                                                    <form
                                                        className={styles.renameForm}
                                                        onSubmit={(event) =>
                                                            void handleRename(event, ambassador)
                                                        }
                                                    >
                                                        <input
                                                            name="name"
                                                            defaultValue={ambassador.name}
                                                            maxLength={160}
                                                            required
                                                            autoFocus
                                                        />
                                                        <button disabled={saving}>שמירה</button>
                                                    </form>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className={styles.nameButton}
                                                        onClick={() =>
                                                            setExpandedId((current) =>
                                                                current === ambassador._id
                                                                    ? null
                                                                    : ambassador._id
                                                            )
                                                        }
                                                    >
                                                        {ambassador.name}
                                                    </button>
                                                )}
                                            </td>
                                            <td>
                                                <span
                                                    className={
                                                        ambassador.active
                                                            ? styles.active
                                                            : styles.inactive
                                                    }
                                                >
                                                    {ambassador.active ? "פעיל" : "לא פעיל"}
                                                </span>
                                            </td>
                                            <td>₪{formatCurrency(ambassador.raised)}</td>
                                            <td>{ambassador.donationCount}</td>
                                            <td>
                                                <input
                                                    className={styles.linkInput}
                                                    aria-label={`הלינק האישי של ${ambassador.name}`}
                                                    value={getAmbassadorLink(ambassador.refCode)}
                                                    readOnly
                                                    dir="ltr"
                                                />
                                            </td>
                                            <td>
                                                <div className={styles.actions}>
                                                    <button
                                                        type="button"
                                                        onClick={() => void copyLink(ambassador.refCode)}
                                                    >
                                                        העתקה
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditingId(ambassador._id)}
                                                    >
                                                        עריכת שם
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={saving}
                                                        onClick={() =>
                                                            void runMutation(
                                                                () =>
                                                                    updateDaycareDonationAmbassador(
                                                                        ambassador._id,
                                                                        { active: !ambassador.active }
                                                                    ),
                                                                ambassador.active
                                                                    ? "השגריר הושבת. תרומות העבר נשמרו."
                                                                    : "השגריר הופעל מחדש."
                                                            )
                                                        }
                                                    >
                                                        {ambassador.active ? "השבתה" : "הפעלה"}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedId === ambassador._id && (
                                            <tr key={`${ambassador._id}-details`}>
                                                <td colSpan={6} className={styles.details}>
                                                    <strong>תרומות דרך {ambassador.name}</strong>
                                                    {ambassadorRecords.length === 0 ? (
                                                        <span>עדיין אין תרומות להצגה.</span>
                                                    ) : (
                                                        <ul>
                                                            {ambassadorRecords.map((record) => (
                                                                <li key={record._id}>
                                                                    <span>{record.donorName || "תורם ללא שם"}</span>
                                                                    <strong>₪{formatCurrency(record.amount)}</strong>
                                                                    <small>{formatDate(record.receivedAt)}</small>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
};

export default DaycareAmbassadorsAdmin;
