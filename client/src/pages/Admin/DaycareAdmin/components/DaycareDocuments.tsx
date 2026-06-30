import { useEffect, useState } from "react";
import { daycareDocumentStatuses, emptyDocument } from "../daycareAdminConfig";
import {
    createDaycareDocument,
    deleteDaycareDocument,
    getDaycareDocuments,
    updateDaycareDocument,
} from "../daycareAdminService";
import styles from "../DaycareAdmin.module.scss";
import type {
    DaycareDocument,
    DaycareDocumentStatus,
    EditableDaycareDocument,
} from "../types";

const toDateInputValue = (date?: string) => {
    return date ? date.slice(0, 10) : "";
};

const DaycareDocuments = () => {
    const [documents, setDocuments] = useState<DaycareDocument[]>([]);
    const [draft, setDraft] = useState<EditableDaycareDocument>(emptyDocument);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const loadDocuments = async () => {
        const data = await getDaycareDocuments();
        setDocuments(data);
        setLoading(false);
    };

    useEffect(() => {
        loadDocuments().catch((error) => {
            console.error("Failed to load daycare documents:", error);
            setLoading(false);
        });
    }, []);

    const resetDraft = () => {
        setDraft(emptyDocument);
        setEditingId(null);
    };

    const handleEdit = (document: DaycareDocument) => {
        setEditingId(document._id);
        setDraft({
            ...document,
            dueDate: toDateInputValue(document.dueDate),
            notes: document.notes ?? "",
            fileUrl: document.fileUrl ?? "",
        });
    };

    const handleSave = async () => {
        if (!draft.name.trim()) {
            return;
        }

        if (editingId) {
            await updateDaycareDocument(editingId, draft);
        } else {
            await createDaycareDocument(draft);
        }

        resetDraft();
        await loadDocuments();
    };

    const handleDelete = async (id: string) => {
        await deleteDaycareDocument(id);
        await loadDocuments();
    };

    return (
        <section className={styles.section} aria-labelledby="daycare-documents">
            <div className={styles.sectionHeader}>
                <div>
                    <h2 className={styles.sectionTitle} id="daycare-documents">
                        מסמכים ואישורים
                    </h2>
                    <p className={styles.sectionDescription}>
                        מעקב אחרי מסמכי רישוי, בטיחות, ביטוח וצוות.
                    </p>
                </div>
            </div>

            <div className={styles.inlineForm}>
                <label className={styles.field}>
                    <span className={styles.fieldLabel}>שם המסמך</span>
                    <input
                        className={styles.input}
                        value={draft.name}
                        onChange={(event) =>
                            setDraft({ ...draft, name: event.target.value })
                        }
                    />
                </label>
                <label className={styles.field}>
                    <span className={styles.fieldLabel}>סטטוס</span>
                    <select
                        className={styles.input}
                        value={draft.status}
                        onChange={(event) =>
                            setDraft({
                                ...draft,
                                status: event.target.value as DaycareDocumentStatus,
                            })
                        }
                    >
                        {daycareDocumentStatuses.map((status) => (
                            <option key={status} value={status}>
                                {status}
                            </option>
                        ))}
                    </select>
                </label>
                <label className={styles.field}>
                    <span className={styles.fieldLabel}>תאריך יעד</span>
                    <input
                        className={styles.input}
                        type="date"
                        value={draft.dueDate ?? ""}
                        onChange={(event) =>
                            setDraft({ ...draft, dueDate: event.target.value })
                        }
                    />
                </label>
                <label className={styles.fieldWide}>
                    <span className={styles.fieldLabel}>קישור לקובץ</span>
                    <input
                        className={styles.input}
                        value={draft.fileUrl ?? ""}
                        onChange={(event) =>
                            setDraft({ ...draft, fileUrl: event.target.value })
                        }
                    />
                </label>
                <label className={styles.fieldWide}>
                    <span className={styles.fieldLabel}>הערות</span>
                    <input
                        className={styles.input}
                        value={draft.notes ?? ""}
                        onChange={(event) =>
                            setDraft({ ...draft, notes: event.target.value })
                        }
                    />
                </label>
                <div className={styles.formActions}>
                    <button
                        className={styles.primaryButton}
                        type="button"
                        onClick={handleSave}
                    >
                        {editingId ? "שמירה" : "הוספת מסמך"}
                    </button>
                    {editingId && (
                        <button
                            className={styles.secondaryButton}
                            type="button"
                            onClick={resetDraft}
                        >
                            ביטול
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className={styles.loading}>טוען מסמכים...</div>
            ) : (
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th className={styles.tableHeader}>מסמך</th>
                                <th className={styles.tableHeader}>סטטוס</th>
                                <th className={styles.tableHeader}>יעד</th>
                                <th className={styles.tableHeader}>קובץ</th>
                                <th className={styles.tableHeader}>הערות</th>
                                <th className={styles.tableHeader}>פעולות</th>
                            </tr>
                        </thead>
                        <tbody>
                            {documents.map((document) => (
                                <tr className={styles.tableRow} key={document._id}>
                                    <td className={styles.tableCell}>{document.name}</td>
                                    <td className={styles.tableCell}>
                                        <span className={styles.statusBadge}>
                                            {document.status}
                                        </span>
                                    </td>
                                    <td className={styles.tableCell}>
                                        {toDateInputValue(document.dueDate) || "-"}
                                    </td>
                                    <td className={styles.tableCell}>
                                        {document.fileUrl ? (
                                            <a
                                                className={styles.inlineLink}
                                                href={document.fileUrl}
                                                rel="noreferrer"
                                                target="_blank"
                                            >
                                                פתיחה
                                            </a>
                                        ) : (
                                            "-"
                                        )}
                                    </td>
                                    <td className={styles.tableCell}>
                                        {document.notes || "-"}
                                    </td>
                                    <td className={styles.tableCell}>
                                        <div className={styles.rowActions}>
                                            <button
                                                className={styles.linkButton}
                                                type="button"
                                                onClick={() => handleEdit(document)}
                                            >
                                                עריכה
                                            </button>
                                            <button
                                                className={styles.dangerButton}
                                                type="button"
                                                onClick={() => handleDelete(document._id)}
                                            >
                                                מחיקה
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
};

export default DaycareDocuments;
