import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { daycareLeadStatuses, emptyLead } from "../daycareAdminConfig";
import {
    createDaycareLead,
    deleteDaycareLead,
    getDaycareRegistrations,
    updateDaycareLead,
} from "../daycareAdminService";
import styles from "../DaycareAdmin.module.scss";
import type {
    DaycareLead,
    DaycareLeadStatus,
    DaycareRegistrationsResponse,
    EditableDaycareLead,
} from "../types";

type DaycareRegistrationsProps = {
    onChanged: () => void;
};

const toDateInputValue = (date?: string) => {
    return date ? date.slice(0, 10) : "";
};

const DaycareRegistrations = ({ onChanged }: DaycareRegistrationsProps) => {
    const [data, setData] = useState<DaycareRegistrationsResponse>({
        leads: [],
        publicRegistrations: [],
    });
    const [draft, setDraft] = useState<EditableDaycareLead>(emptyLead);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const loadRegistrations = async () => {
        const registrations = await getDaycareRegistrations();
        setData(registrations);
        setLoading(false);
    };

    useEffect(() => {
        loadRegistrations().catch((error) => {
            console.error("Failed to load daycare registrations:", error);
            setLoading(false);
        });
    }, []);

    const resetDraft = () => {
        setDraft(emptyLead);
        setEditingId(null);
    };

    const handleEdit = (lead: DaycareLead) => {
        setEditingId(lead._id);
        setDraft({
            ...lead,
            childAge: lead.childAge ?? "",
            area: lead.area ?? "",
            inquiryDate: toDateInputValue(lead.inquiryDate),
            notes: lead.notes ?? "",
            followUpDate: toDateInputValue(lead.followUpDate),
        });
    };

    const handleSave = async () => {
        if (!draft.childName.trim() || !draft.parentName.trim() || !draft.phone.trim()) {
            return;
        }

        if (editingId) {
            await updateDaycareLead(editingId, draft);
        } else {
            await createDaycareLead(draft);
        }

        resetDraft();
        await loadRegistrations();
        onChanged();
    };

    const handleDelete = async (id: string) => {
        await deleteDaycareLead(id);
        await loadRegistrations();
        onChanged();
    };

    return (
        <section className={styles.section} aria-labelledby="daycare-leads">
            <div className={styles.sectionHeader}>
                <div>
                    <h2 className={styles.sectionTitle} id="daycare-leads">
                        מעקב הרשמות למעון
                    </h2>
                    <p className={styles.sectionDescription}>
                        ניהול ידני של מתעניינים לצד הרשמות שהגיעו מטופס המעון.
                    </p>
                </div>

                <Link className={styles.secondaryLink} to="/admin/dashboard">
                    לעמוד ניהול המשפחות
                </Link>
            </div>

            <div className={styles.notice}>
                נמצאו {data.publicRegistrations.length} הרשמות ציבוריות מטופס
                המעון. הן מוצגות למטה לקריאה, והמעקב הידני מנוהל בטבלה הזו.
            </div>

            <div className={styles.inlineForm}>
                <label className={styles.field}>
                    <span className={styles.fieldLabel}>שם הילד</span>
                    <input
                        className={styles.input}
                        value={draft.childName}
                        onChange={(event) =>
                            setDraft({ ...draft, childName: event.target.value })
                        }
                    />
                </label>
                <label className={styles.field}>
                    <span className={styles.fieldLabel}>גיל</span>
                    <input
                        className={styles.input}
                        value={draft.childAge ?? ""}
                        onChange={(event) =>
                            setDraft({ ...draft, childAge: event.target.value })
                        }
                    />
                </label>
                <label className={styles.field}>
                    <span className={styles.fieldLabel}>שם הורה</span>
                    <input
                        className={styles.input}
                        value={draft.parentName}
                        onChange={(event) =>
                            setDraft({ ...draft, parentName: event.target.value })
                        }
                    />
                </label>
                <label className={styles.field}>
                    <span className={styles.fieldLabel}>טלפון</span>
                    <input
                        className={styles.input}
                        value={draft.phone}
                        onChange={(event) =>
                            setDraft({ ...draft, phone: event.target.value })
                        }
                    />
                </label>
                <label className={styles.field}>
                    <span className={styles.fieldLabel}>אזור מגורים</span>
                    <input
                        className={styles.input}
                        value={draft.area ?? ""}
                        onChange={(event) =>
                            setDraft({ ...draft, area: event.target.value })
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
                                status: event.target.value as DaycareLeadStatus,
                            })
                        }
                    >
                        {daycareLeadStatuses.map((status) => (
                            <option key={status} value={status}>
                                {status}
                            </option>
                        ))}
                    </select>
                </label>
                <label className={styles.field}>
                    <span className={styles.fieldLabel}>תאריך פנייה</span>
                    <input
                        className={styles.input}
                        type="date"
                        value={draft.inquiryDate ?? ""}
                        onChange={(event) =>
                            setDraft({ ...draft, inquiryDate: event.target.value })
                        }
                    />
                </label>
                <label className={styles.field}>
                    <span className={styles.fieldLabel}>תאריך לחזרה</span>
                    <input
                        className={styles.input}
                        type="date"
                        value={draft.followUpDate ?? ""}
                        onChange={(event) =>
                            setDraft({ ...draft, followUpDate: event.target.value })
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
                        {editingId ? "שמירה" : "הוספת מתעניין"}
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
                <div className={styles.loading}>טוען הרשמות...</div>
            ) : (
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th className={styles.tableHeader}>ילד</th>
                                <th className={styles.tableHeader}>גיל</th>
                                <th className={styles.tableHeader}>הורה</th>
                                <th className={styles.tableHeader}>טלפון</th>
                                <th className={styles.tableHeader}>אזור</th>
                                <th className={styles.tableHeader}>סטטוס</th>
                                <th className={styles.tableHeader}>פנייה</th>
                                <th className={styles.tableHeader}>לחזרה</th>
                                <th className={styles.tableHeader}>הערות</th>
                                <th className={styles.tableHeader}>פעולות</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.leads.map((lead) => (
                                <tr className={styles.tableRow} key={lead._id}>
                                    <td className={styles.tableCell}>{lead.childName}</td>
                                    <td className={styles.tableCell}>
                                        {lead.childAge || "-"}
                                    </td>
                                    <td className={styles.tableCell}>{lead.parentName}</td>
                                    <td className={styles.tableCell}>{lead.phone}</td>
                                    <td className={styles.tableCell}>{lead.area || "-"}</td>
                                    <td className={styles.tableCell}>
                                        <span className={styles.statusBadge}>
                                            {lead.status}
                                        </span>
                                    </td>
                                    <td className={styles.tableCell}>
                                        {toDateInputValue(lead.inquiryDate) || "-"}
                                    </td>
                                    <td className={styles.tableCell}>
                                        {toDateInputValue(lead.followUpDate) || "-"}
                                    </td>
                                    <td className={styles.tableCell}>
                                        {lead.notes || "-"}
                                    </td>
                                    <td className={styles.tableCell}>
                                        <div className={styles.rowActions}>
                                            <button
                                                className={styles.linkButton}
                                                type="button"
                                                onClick={() => handleEdit(lead)}
                                            >
                                                עריכה
                                            </button>
                                            <button
                                                className={styles.dangerButton}
                                                type="button"
                                                onClick={() => handleDelete(lead._id)}
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

export default DaycareRegistrations;
