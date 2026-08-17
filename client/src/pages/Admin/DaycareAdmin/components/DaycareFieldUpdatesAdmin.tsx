import { useState } from "react";
import { Eye, EyeOff, ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import ConfirmDialog from "../../../../components/ConfirmDialog/ConfirmDialog";
import {
    createDaycareDonationFieldUpdate,
    deleteDaycareDonationFieldUpdate,
    updateDaycareDonationFieldUpdate,
} from "../../../../services/daycareDonationService";
import type {
    DaycareDonationFieldUpdate,
    DonationItem,
} from "../../../DaycareDonations/types";
import styles from "./DaycareFieldUpdatesAdmin.module.scss";

type Props = {
    updates: DaycareDonationFieldUpdate[];
    items: DonationItem[];
    onChanged: () => Promise<void>;
};

const formatDate = (value?: string) =>
    value
        ? new Intl.DateTimeFormat("he-IL", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
          }).format(new Date(value))
        : "טרם פורסם";

const DaycareFieldUpdatesAdmin = ({ updates, items, onChanged }: Props) => {
    const [creating, setCreating] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<DaycareDonationFieldUpdate | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (
        event: React.FormEvent<HTMLFormElement>,
        update?: DaycareDonationFieldUpdate
    ) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const imageEntry = data.get("image");
        const image = imageEntry instanceof File && imageEntry.size > 0
            ? imageEntry
            : undefined;
        setSaving(true);
        setError("");
        try {
            const input = {
                title: String(data.get("title") ?? ""),
                description: String(data.get("description") ?? ""),
                imageAlt: String(data.get("imageAlt") ?? ""),
                itemId: String(data.get("itemId") ?? "") || undefined,
                published: data.get("published") === "on",
                image,
            };
            if (update) {
                await updateDaycareDonationFieldUpdate(update.id, input);
                setEditingId(null);
            } else {
                if (!image) throw new Error("יש לבחור תמונה לעדכון החדש.");
                await createDaycareDonationFieldUpdate({ ...input, image });
                setCreating(false);
                form.reset();
            }
            await onChanged();
        } catch (mutationError) {
            console.error("Failed to save field update:", mutationError);
            setError(
                mutationError instanceof Error
                    ? mutationError.message
                    : "לא הצלחנו לשמור את העדכון."
            );
        } finally {
            setSaving(false);
        }
    };

    const togglePublished = async (update: DaycareDonationFieldUpdate) => {
        setSaving(true);
        setError("");
        try {
            await updateDaycareDonationFieldUpdate(update.id, {
                published: !update.published,
            });
            await onChanged();
        } catch (mutationError) {
            console.error("Failed to publish field update:", mutationError);
            setError("לא הצלחנו לשנות את מצב הפרסום.");
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleting) return;
        setSaving(true);
        setError("");
        try {
            await deleteDaycareDonationFieldUpdate(deleting.id);
            setDeleting(null);
            await onChanged();
        } catch (mutationError) {
            console.error("Failed to delete field update:", mutationError);
            setError("לא הצלחנו למחוק את העדכון.");
        } finally {
            setSaving(false);
        }
    };

    const renderForm = (update?: DaycareDonationFieldUpdate) => (
        <form
            className={styles.form}
            onSubmit={(event) => void handleSubmit(event, update)}
        >
            <label className={styles.wideField}>
                כותרת
                <input
                    name="title"
                    required
                    maxLength={180}
                    defaultValue={update?.title}
                    placeholder="מה התקדם במעון?"
                />
            </label>
            <label className={styles.wideField}>
                תיאור קצר
                <textarea
                    name="description"
                    required
                    rows={4}
                    maxLength={1200}
                    defaultValue={update?.description}
                    placeholder="מה כבר הושלם ומה השלב הבא?"
                />
            </label>
            <label>
                סעיף מקושר
                <select name="itemId" defaultValue={update?.itemId ?? ""}>
                    <option value="">ללא קישור לסעיף</option>
                    {items.map((item) => (
                        <option key={item.id} value={item.id}>
                            {item.title}
                        </option>
                    ))}
                </select>
            </label>
            <label>
                תיאור התמונה לנגישות
                <input
                    name="imageAlt"
                    required
                    maxLength={220}
                    defaultValue={update?.imageAlt}
                    placeholder="לדוגמה: ארונות המטבח החדשים"
                />
            </label>
            <label className={styles.imageField}>
                <ImagePlus aria-hidden="true" />
                {update ? "החלפת תמונה (לא חובה)" : "בחירת תמונה"}
                <input
                    name="image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    required={!update}
                />
                <small>JPG, PNG או WebP, עד 8MB</small>
            </label>
            <label className={styles.publishField}>
                <input
                    name="published"
                    type="checkbox"
                    defaultChecked={update?.published ?? true}
                />
                לפרסם באתר מיד לאחר השמירה
            </label>
            <div className={styles.formActions}>
                <button type="submit" disabled={saving}>
                    {saving ? "שומר..." : update ? "שמירת שינויים" : "הוספת עדכון"}
                </button>
                <button
                    type="button"
                    className={styles.secondaryButton}
                    disabled={saving}
                    onClick={() => {
                        setCreating(false);
                        setEditingId(null);
                        setError("");
                    }}
                >
                    ביטול
                </button>
            </div>
        </form>
    );

    return (
        <section className={styles.panel} aria-labelledby="field-updates-title">
            <header className={styles.header}>
                <div>
                    <h2 id="field-updates-title">עדכונים מהשטח</h2>
                    <p>
                        באתר מופיע העדכון המפורסם החדש ביותר. שאר העדכונים נשמרים כאן.
                    </p>
                </div>
                {!creating && (
                    <button type="button" onClick={() => setCreating(true)}>
                        <Plus aria-hidden="true" />
                        עדכון חדש
                    </button>
                )}
            </header>

            {error && <p className={styles.error} role="alert">{error}</p>}
            {creating && renderForm()}

            {updates.length === 0 && !creating ? (
                <p className={styles.empty}>עדיין לא נוספו עדכונים מהשטח.</p>
            ) : (
                <div className={styles.list}>
                    {updates.map((update) => (
                        <article className={styles.card} key={update.id}>
                            {editingId === update.id ? (
                                renderForm(update)
                            ) : (
                                <>
                                    <img src={update.imageUrl} alt={update.imageAlt} />
                                    <div className={styles.cardContent}>
                                        <div className={styles.statusRow}>
                                            <span className={update.published ? styles.published : styles.draft}>
                                                {update.published ? "מפורסם" : "טיוטה"}
                                            </span>
                                            <small>{formatDate(update.publishedAt ?? update.updatedAt)}</small>
                                        </div>
                                        <h3>{update.title}</h3>
                                        <p>{update.description}</p>
                                        {update.itemId && (
                                            <small>
                                                מקושר ל: {items.find((item) => item.id === update.itemId)?.title ?? update.itemId}
                                            </small>
                                        )}
                                        <div className={styles.cardActions}>
                                            <button type="button" disabled={saving} onClick={() => void togglePublished(update)}>
                                                {update.published ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                                                {update.published ? "הסתרה" : "פרסום"}
                                            </button>
                                            <button type="button" disabled={saving} onClick={() => setEditingId(update.id)}>
                                                <Pencil aria-hidden="true" /> עריכה
                                            </button>
                                            <button type="button" className={styles.deleteButton} disabled={saving} onClick={() => setDeleting(update)}>
                                                <Trash2 aria-hidden="true" /> מחיקה
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </article>
                    ))}
                </div>
            )}

            <ConfirmDialog
                open={Boolean(deleting)}
                title="מחיקת עדכון מהשטח"
                message={`העדכון “${deleting?.title ?? ""}” והתמונה שלו יימחקו לצמיתות.`}
                confirmLabel="מחיקה"
                tone="danger"
                busy={saving}
                onClose={() => setDeleting(null)}
                onConfirm={() => void confirmDelete()}
            />
        </section>
    );
};

export default DaycareFieldUpdatesAdmin;
