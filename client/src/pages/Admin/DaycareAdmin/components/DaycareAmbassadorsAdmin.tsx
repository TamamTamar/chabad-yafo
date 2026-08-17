import { Fragment, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import {
    Copy,
    Pencil,
    Power,
    PowerOff,
    Trash2,
} from "lucide-react";
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
import {
    buildAmbassadorLink,
    normalizeAmbassadorSlug,
    transliterateAmbassadorName,
} from "../../../DaycareDonations/ambassadorLinks";
import styles from "./DaycareAmbassadorsAdmin.module.scss";

type Props = {
    ambassadors: DaycareDonationAmbassador[];
    records: DaycareDonationRecord[];
    onChanged: () => Promise<void>;
};

type AmbassadorFormValues = {
    name: string;
    linkSlug: string;
    goal: number;
    ownerLabel: string;
    notes: string;
};

const slugPattern = /^[A-Za-z0-9]+(?:[- ][A-Za-z0-9]+)*$/;

type AmbassadorEditFormProps = {
    ambassador: DaycareDonationAmbassador;
    saving: boolean;
    onSave: (values: AmbassadorFormValues) => Promise<boolean>;
};

const AmbassadorEditForm = ({
    ambassador,
    saving,
    onSave,
}: AmbassadorEditFormProps) => {
    const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<AmbassadorFormValues>({
        mode: "onBlur",
        defaultValues: {
            name: ambassador.name,
            linkSlug: ambassador.linkSlug ?? "",
            goal: ambassador.goal,
            ownerLabel: ambassador.ownerLabel ?? "",
            notes: ambassador.notes ?? "",
        },
    });
    const nameField = register("name", {
        required: "יש להזין שם שגריר",
        maxLength: { value: 160, message: "השם ארוך מדי" },
        onChange: (event) => {
            if (!slugManuallyEdited) {
                setValue(
                    "linkSlug",
                    transliterateAmbassadorName(event.target.value),
                    { shouldValidate: true }
                );
            }
        },
    });
    const linkSlugField = register("linkSlug", {
        required: "יש להזין שם באנגלית ללינק",
        maxLength: { value: 60, message: "השם בלינק ארוך מדי" },
        pattern: {
            value: slugPattern,
            message: "אפשר להשתמש רק באנגלית, מספרים ומקפים",
        },
        onChange: () => {
            setSlugManuallyEdited(true);
        },
    });

    return (
        <form
            className={styles.renameForm}
            onSubmit={handleSubmit(async (values) => {
                await onSave(values);
            })}
            noValidate
        >
            <label className={styles.editField}>
                <input {...nameField} autoFocus aria-invalid={Boolean(errors.name)} />
                <span className={styles.fieldError} role="alert">
                    {errors.name?.message || ""}
                </span>
            </label>
            <label className={styles.editField}>
                <input
                    {...linkSlugField}
                    placeholder="שם בלינק באנגלית"
                    aria-label={`השם באנגלית בלינק של ${ambassador.name}`}
                    aria-invalid={Boolean(errors.linkSlug)}
                    dir="ltr"
                />
                <span className={styles.fieldError} role="alert">
                    {errors.linkSlug?.message || ""}
                </span>
            </label>
            <label className={styles.editField}>
                <input
                    {...register("goal", {
                        required: "יש להזין יעד",
                        valueAsNumber: true,
                        min: { value: 1, message: "היעד חייב להיות גדול מאפס" },
                        max: { value: 100_000_000, message: "היעד גבוה מדי" },
                    })}
                    aria-label={`היעד של ${ambassador.name}`}
                    aria-invalid={Boolean(errors.goal)}
                    type="number"
                    step="1"
                    placeholder="יעד"
                />
                <span className={styles.fieldError} role="alert">
                    {errors.goal?.message || ""}
                </span>
            </label>
            <label className={styles.editField}>
                <input
                    {...register("ownerLabel", {
                        maxLength: { value: 160, message: "שם האחראי ארוך מדי" },
                    })}
                    maxLength={160}
                    placeholder="אחראי/ת"
                    aria-invalid={Boolean(errors.ownerLabel)}
                />
                <span className={styles.fieldError} role="alert">
                    {errors.ownerLabel?.message || ""}
                </span>
            </label>
            <label className={styles.editField}>
                <textarea
                    {...register("notes", {
                        maxLength: { value: 800, message: "ההערה ארוכה מדי" },
                    })}
                    maxLength={800}
                    rows={2}
                    placeholder="הערה פנימית"
                    aria-invalid={Boolean(errors.notes)}
                />
                <span className={styles.fieldError} role="alert">
                    {errors.notes?.message || ""}
                </span>
            </label>
            <button disabled={saving || isSubmitting}>שמירה</button>
        </form>
    );
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
    const [createSlugManuallyEdited, setCreateSlugManuallyEdited] =
        useState(false);

    const getAvailableSlug = (value: string) => {
        const baseSlug = normalizeAmbassadorSlug(value);
        if (!baseSlug) return "";
        const usedSlugs = new Set(
            ambassadors.flatMap((ambassador) => [
                ambassador.linkSlug ?? "",
                ...(ambassador.linkAliases ?? []),
            ])
        );
        for (let suffix = 1; suffix <= 999; suffix += 1) {
            const suffixText = suffix === 1 ? "" : `-${suffix}`;
            const candidate = `${baseSlug.slice(
                0,
                60 - suffixText.length
            )}${suffixText}`;
            if (!usedSlugs.has(candidate)) return candidate;
        }
        return baseSlug;
    };

    const {
        register: registerCreate,
        handleSubmit: handleCreateSubmit,
        setValue: setCreateValue,
        reset: resetCreate,
        control: createControl,
        formState: {
            errors: createErrors,
            isSubmitting: createSubmitting,
        },
    } = useForm<AmbassadorFormValues>({
        mode: "onBlur",
        defaultValues: {
            name: "",
            linkSlug: "",
            goal: undefined,
            ownerLabel: "",
            notes: "",
        },
    });
    const createLinkSlug =
        useWatch({ control: createControl, name: "linkSlug" }) ?? "";
    const availableCreateSlug = getAvailableSlug(createLinkSlug);
    const createNameField = registerCreate("name", {
        required: "יש להזין שם שגריר",
        maxLength: { value: 160, message: "השם ארוך מדי" },
        onChange: (event) => {
            if (!createSlugManuallyEdited) {
                setCreateValue(
                    "linkSlug",
                    transliterateAmbassadorName(event.target.value),
                    { shouldValidate: true }
                );
            }
        },
    });
    const createLinkSlugField = registerCreate("linkSlug", {
        required: "יש להזין שם באנגלית ללינק",
        maxLength: { value: 60, message: "השם בלינק ארוך מדי" },
        pattern: {
            value: slugPattern,
            message: "אפשר להשתמש רק באנגלית, מספרים ומקפים",
        },
        onChange: () => {
            setCreateSlugManuallyEdited(true);
        },
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
            console.error("Failed to update donation ambassador:", mutationError);
            setError("הפעולה נכשלה. נסו שוב.");
            return false;
        } finally {
            setSaving(false);
        }
    };

    const handleCreate = async (values: AmbassadorFormValues) => {
        const linkSlug = getAvailableSlug(values.linkSlug);
        const created = await runMutation(
            () =>
                createDaycareDonationAmbassador({
                    name: values.name.trim(),
                    linkSlug,
                    goal: values.goal,
                    ownerLabel: values.ownerLabel.trim() || undefined,
                    notes: values.notes.trim() || undefined,
                }),
            "השגריר נוסף והלינק האישי מוכן."
        );
        if (created) {
            resetCreate();
            setCreateSlugManuallyEdited(false);
            setAdding(false);
        }
    };

    const handleEdit = async (
        values: AmbassadorFormValues,
        ambassador: DaycareDonationAmbassador
    ) => {
        const name = values.name.trim();
        const linkSlug = normalizeAmbassadorSlug(values.linkSlug);
        const ownerLabel = values.ownerLabel.trim();
        const notes = values.notes.trim();
        if (
            name === ambassador.name &&
            linkSlug === (ambassador.linkSlug ?? "") &&
            values.goal === ambassador.goal &&
            ownerLabel === (ambassador.ownerLabel ?? "") &&
            notes === (ambassador.notes ?? "")
        ) {
            setEditingId(null);
            return true;
        }
        const updated = await runMutation(
            () =>
                updateDaycareDonationAmbassador(ambassador._id, {
                    name,
                    linkSlug,
                    goal: values.goal,
                    ownerLabel,
                    notes,
                }),
            "פרטי השגריר והיעד עודכנו."
        );
        if (updated) setEditingId(null);
        return updated;
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
                <form
                    className={styles.addForm}
                    onSubmit={handleCreateSubmit(handleCreate)}
                    noValidate
                >
                    <label>
                        שם השגריר
                        <input
                            {...createNameField}
                            type="text"
                            maxLength={160}
                            autoFocus
                            aria-invalid={Boolean(createErrors.name)}
                        />
                        <span className={styles.fieldError} role="alert">
                            {createErrors.name?.message || ""}
                        </span>
                    </label>
                    <label>
                        שם בלינק באנגלית
                        <input
                            {...createLinkSlugField}
                            type="text"
                            maxLength={60}
                            placeholder="moshe-cohen"
                            dir="ltr"
                            aria-invalid={Boolean(createErrors.linkSlug)}
                        />
                        {availableCreateSlug && (
                            <small className={styles.linkPreview} dir="ltr">
                                {`${window.location.origin}/daycare-donations/${availableCreateSlug}`}
                            </small>
                        )}
                        {createLinkSlug &&
                            normalizeAmbassadorSlug(createLinkSlug) !==
                                availableCreateSlug && (
                                <small className={styles.slugSuggestion}>
                                    השם תפוס; המערכת תשתמש ב־{availableCreateSlug}
                                </small>
                            )}
                        <span className={styles.fieldError} role="alert">
                            {createErrors.linkSlug?.message || ""}
                        </span>
                    </label>
                    <label>
                        יעד כספי
                        <input
                            {...registerCreate("goal", {
                                required: "יש להזין יעד",
                                valueAsNumber: true,
                                min: {
                                    value: 1,
                                    message: "היעד חייב להיות גדול מאפס",
                                },
                                max: {
                                    value: 100_000_000,
                                    message: "היעד גבוה מדי",
                                },
                            })}
                            type="number"
                            step="1"
                            aria-invalid={Boolean(createErrors.goal)}
                        />
                        <span className={styles.fieldError} role="alert">
                            {createErrors.goal?.message || ""}
                        </span>
                    </label>
                    <label>
                        אחראי/ת פנימי/ת
                        <input
                            {...registerCreate("ownerLabel", {
                                maxLength: {
                                    value: 160,
                                    message: "שם האחראי ארוך מדי",
                                },
                            })}
                            type="text"
                            maxLength={160}
                            aria-invalid={Boolean(createErrors.ownerLabel)}
                        />
                        <span className={styles.fieldError} role="alert">
                            {createErrors.ownerLabel?.message || ""}
                        </span>
                    </label>
                    <label className={styles.wideField}>
                        הערה פנימית
                        <textarea
                            {...registerCreate("notes", {
                                maxLength: {
                                    value: 800,
                                    message: "ההערה ארוכה מדי",
                                },
                            })}
                            rows={2}
                            maxLength={800}
                            aria-invalid={Boolean(createErrors.notes)}
                        />
                        <span className={styles.fieldError} role="alert">
                            {createErrors.notes?.message || ""}
                        </span>
                    </label>
                    <button type="submit" disabled={saving || createSubmitting}>
                        יצירת לינק אישי
                    </button>
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
                                                    <AmbassadorEditForm
                                                        ambassador={ambassador}
                                                        saving={saving}
                                                        onSave={(values) =>
                                                            handleEdit(values, ambassador)
                                                        }
                                                    />
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
