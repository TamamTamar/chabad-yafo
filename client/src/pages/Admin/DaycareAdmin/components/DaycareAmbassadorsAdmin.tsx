import { Fragment, useState } from "react";
import { Copy, Pencil, Power, PowerOff, Trash2 } from "lucide-react";
import ConfirmDialog from "../../../../components/ConfirmDialog/ConfirmDialog";
import {
    createDaycareDonationAmbassador,
    deleteDaycareDonationAmbassador,
    updateDaycareDonationAmbassador,
} from "../../../../services/daycareDonationService";
import type {
    DaycareDonationAmbassador,
    DaycareDonationRecord,
} from "../../../DaycareDonations/types";
import { buildAmbassadorLink } from "../../../DaycareDonations/ambassadorLinks";
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

const getAmbassadorLink = (ambassador: DaycareDonationAmbassador) =>
    buildAmbassadorLink(
        window.location.origin,
        ambassador.linkSlug ?? "",
        ambassador.refCode
    );

const DaycareAmbassadorsAdmin = ({
    ambassadors,
    records,
    onChanged,
}: Props) => {
    const [adding, setAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [pendingDelete, setPendingDelete] =
        useState<DaycareDonationAmbassador | null>(null);
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
        const data = new FormData(form);
        const name = String(data.get("name") ?? "").trim();
        const linkSlug = String(data.get("linkSlug") ?? "").trim();
        const goal = Number(data.get("goal"));
        const ownerLabel = String(data.get("ownerLabel") ?? "").trim();
        const notes = String(data.get("notes") ?? "").trim();
        if (!name || !linkSlug || !Number.isFinite(goal) || goal <= 0) return;
        const created = await runMutation(
            () =>
                createDaycareDonationAmbassador({
                    name,
                    linkSlug,
                    goal,
                    ownerLabel: ownerLabel || undefined,
                    notes: notes || undefined,
                }),
            "השגריר נוסף והלינק האישי מוכן."
        );
        if (created) {
            form.reset();
            setAdding(false);
        }
    };

    const handleEdit = async (
        event: React.FormEvent<HTMLFormElement>,
        ambassador: DaycareDonationAmbassador
    ) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const name = String(
            data.get("name") ?? ""
        ).trim();
        const linkSlug = String(data.get("linkSlug") ?? "").trim();
        const goal = Number(data.get("goal"));
        const ownerLabel = String(data.get("ownerLabel") ?? "").trim();
        const notes = String(data.get("notes") ?? "").trim();
        if (!name || !linkSlug || !Number.isFinite(goal) || goal <= 0) return;
        if (
            name === ambassador.name &&
            linkSlug === (ambassador.linkSlug ?? "") &&
            goal === ambassador.goal &&
            ownerLabel === (ambassador.ownerLabel ?? "") &&
            notes === (ambassador.notes ?? "")
        ) {
            setEditingId(null);
            return;
        }
        const updated = await runMutation(
            () =>
                updateDaycareDonationAmbassador(ambassador._id, {
                    name,
                    linkSlug,
                    goal,
                    ownerLabel,
                    notes,
                }),
            "פרטי השגריר והיעד עודכנו."
        );
        if (updated) setEditingId(null);
    };

    const copyLink = async (ambassador: DaycareDonationAmbassador) => {
        setError("");
        try {
            await navigator.clipboard.writeText(getAmbassadorLink(ambassador));
            setMessage("הלינק הועתק ללוח.");
        } catch (copyError) {
            console.error("Failed to copy ambassador link:", copyError);
            setError("לא הצלחנו להעתיק אוטומטית. אפשר לסמן ולהעתיק את הלינק.");
        }
    };

    const handleDelete = async () => {
        if (!pendingDelete) return;
        const deleted = await runMutation(
            () => deleteDaycareDonationAmbassador(pendingDelete._id),
            `השגריר ${pendingDelete.name} נמחק.`
        );
        if (deleted) {
            if (expandedId === pendingDelete._id) setExpandedId(null);
            if (editingId === pendingDelete._id) setEditingId(null);
            setPendingDelete(null);
        } else {
            setError(
                "לא ניתן למחוק שגריר עם תרומות, פניות או תשלום פעיל. אפשר להשבית אותו במקום."
            );
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
                    <label>
                        שם בלינק באנגלית
                        <input
                            name="linkSlug"
                            type="text"
                            maxLength={60}
                            pattern="[A-Za-z0-9]+(?:[- ][A-Za-z0-9]+)*"
                            placeholder="moshe-cohen"
                            dir="ltr"
                            required
                        />
                    </label>
                    <label>
                        יעד כספי
                        <input
                            name="goal"
                            type="number"
                            min="1"
                            max="100000000"
                            step="1"
                            required
                        />
                    </label>
                    <label>
                        אחראי/ת פנימי/ת
                        <input name="ownerLabel" type="text" maxLength={160} />
                    </label>
                    <label className={styles.wideField}>
                        הערה פנימית
                        <textarea name="notes" rows={2} maxLength={800} />
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
                                <th>התקדמות מול היעד</th>
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
                                const progressPercent =
                                    ambassador.goal > 0
                                        ? Math.round(
                                              (ambassador.raised /
                                                  ambassador.goal) *
                                                  100
                                          )
                                        : 0;
                                const remaining = Math.max(
                                    0,
                                    ambassador.goal - ambassador.raised
                                );
                                return (
                                    <Fragment key={ambassador._id}>
                                        <tr
                                            className={`${styles.ambassadorRow} ${
                                                editingId === ambassador._id
                                                    ? styles.ambassadorRowEditing
                                                    : ""
                                            }`}
                                        >
                                            <td data-label="שם">
                                                {editingId === ambassador._id ? (
                                                    <form
                                                        className={styles.renameForm}
                                                        onSubmit={(event) =>
                                                            void handleEdit(event, ambassador)
                                                        }
                                                    >
                                                        <input
                                                            name="name"
                                                            defaultValue={ambassador.name}
                                                            maxLength={160}
                                                            required
                                                            autoFocus
                                                        />
                                                        <input
                                                            name="linkSlug"
                                                            defaultValue={ambassador.linkSlug ?? ""}
                                                            maxLength={60}
                                                            pattern="[A-Za-z0-9]+(?:[- ][A-Za-z0-9]+)*"
                                                            placeholder="שם בלינק באנגלית"
                                                            aria-label={`השם באנגלית בלינק של ${ambassador.name}`}
                                                            dir="ltr"
                                                            required
                                                        />
                                                        <input
                                                            aria-label={`היעד של ${ambassador.name}`}
                                                            name="goal"
                                                            type="number"
                                                            min="1"
                                                            max="100000000"
                                                            step="1"
                                                            defaultValue={ambassador.goal || ""}
                                                            placeholder="יעד"
                                                            required
                                                        />
                                                        <input
                                                            name="ownerLabel"
                                                            defaultValue={ambassador.ownerLabel ?? ""}
                                                            maxLength={160}
                                                            placeholder="אחראי/ת"
                                                        />
                                                        <textarea
                                                            name="notes"
                                                            defaultValue={ambassador.notes ?? ""}
                                                            maxLength={800}
                                                            rows={2}
                                                            placeholder="הערה פנימית"
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
                                                {editingId !== ambassador._id && ambassador.ownerLabel && (
                                                    <small className={styles.ownerLabel}>
                                                        אחראי/ת: {ambassador.ownerLabel}
                                                    </small>
                                                )}
                                            </td>
                                            <td data-label="סטטוס">
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
                                            <td data-label="התקדמות מול היעד">
                                                {ambassador.goal > 0 ? (
                                                    <div className={styles.progressCell}>
                                                        <div className={styles.progressSummary}>
                                                            <strong>
                                                                ₪{formatCurrency(ambassador.raised)}
                                                                {" מתוך "}
                                                                ₪{formatCurrency(ambassador.goal)}
                                                            </strong>
                                                            <span>{progressPercent}%</span>
                                                        </div>
                                                        <div
                                                            className={styles.progressTrack}
                                                            role="progressbar"
                                                            aria-label={`התקדמות השגריר ${ambassador.name}`}
                                                            aria-valuemin={0}
                                                            aria-valuemax={100}
                                                            aria-valuenow={Math.min(
                                                                100,
                                                                progressPercent
                                                            )}
                                                        >
                                                            <span
                                                                style={{
                                                                    width: `${Math.min(
                                                                        100,
                                                                        progressPercent
                                                                    )}%`,
                                                                }}
                                                            />
                                                        </div>
                                                        {remaining === 0 && (
                                                            <small className={styles.goalReached}>
                                                                היעד הושג
                                                            </small>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className={styles.noGoal}>
                                                        טרם הוגדר
                                                    </span>
                                                )}
                                            </td>
                                            <td data-label="תרומות">{ambassador.donationCount}</td>
                                            <td data-label="לינק אישי">
                                                <input
                                                    className={styles.linkInput}
                                                    aria-label={`הלינק האישי של ${ambassador.name}`}
                                                    value={getAmbassadorLink(ambassador)}
                                                    readOnly
                                                    dir="ltr"
                                                />
                                            </td>
                                            <td data-label="פעולות">
                                                <div className={styles.actions}>
                                                    <button
                                                        type="button"
                                                        aria-label={`העתקת הלינק של ${ambassador.name}`}
                                                        title="העתקת לינק"
                                                        onClick={() => void copyLink(ambassador)}
                                                    >
                                                        <Copy
                                                            aria-hidden="true"
                                                            className={styles.actionIcon}
                                                            size={19}
                                                        />
                                                        <span className={styles.actionText}>העתקה</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        aria-label={`עריכת השגריר ${ambassador.name}`}
                                                        title="עריכה"
                                                        onClick={() => setEditingId(ambassador._id)}
                                                    >
                                                        <Pencil
                                                            aria-hidden="true"
                                                            className={styles.actionIcon}
                                                            size={19}
                                                        />
                                                        <span className={styles.actionText}>עריכה</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        aria-label={`${ambassador.active ? "השבתת" : "הפעלת"} השגריר ${ambassador.name}`}
                                                        title={ambassador.active ? "השבתה" : "הפעלה"}
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
                                                        {ambassador.active ? (
                                                            <PowerOff
                                                                aria-hidden="true"
                                                                className={styles.actionIcon}
                                                                size={19}
                                                            />
                                                        ) : (
                                                            <Power
                                                                aria-hidden="true"
                                                                className={styles.actionIcon}
                                                                size={19}
                                                            />
                                                        )}
                                                        <span className={styles.actionText}>
                                                            {ambassador.active ? "השבתה" : "הפעלה"}
                                                        </span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={styles.deleteAction}
                                                        aria-label={`מחיקת השגריר ${ambassador.name}`}
                                                        title="מחיקה"
                                                        disabled={saving}
                                                        onClick={() => setPendingDelete(ambassador)}
                                                    >
                                                        <Trash2
                                                            aria-hidden="true"
                                                            className={styles.actionIcon}
                                                            size={19}
                                                        />
                                                        <span className={styles.actionText}>מחיקה</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedId === ambassador._id && (
                                            <tr className={styles.detailsRow} key={`${ambassador._id}-details`}>
                                                <td colSpan={6} className={styles.details}>
                                                    <strong>תרומות דרך {ambassador.name}</strong>
                                                    {(ambassador.ownerLabel || ambassador.notes) && (
                                                        <div className={styles.internalMeta}>
                                                            {ambassador.ownerLabel && (
                                                                <span>
                                                                    אחראי/ת: {ambassador.ownerLabel}
                                                                </span>
                                                            )}
                                                            {ambassador.notes && (
                                                                <span>{ambassador.notes}</span>
                                                            )}
                                                        </div>
                                                    )}
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
            <ConfirmDialog
                open={pendingDelete !== null}
                title="מחיקת שגריר"
                message={
                    <>
                        למחוק את <strong>{pendingDelete?.name}</strong>? ניתן למחוק
                        רק שגריר שאין לו תרומות, פניות או תשלום פעיל. הפעולה אינה
                        ניתנת לביטול.
                    </>
                }
                confirmLabel="מחיקת השגריר"
                tone="danger"
                busy={saving}
                onConfirm={() => void handleDelete()}
                onClose={() => setPendingDelete(null)}
            />
        </section>
    );
};

export default DaycareAmbassadorsAdmin;
