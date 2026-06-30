import { useEffect, useState } from "react";
import {
    daycarePriorities,
    daycareTaskCategories,
    daycareTaskStatuses,
    emptyTask,
} from "../daycareAdminConfig";
import {
    createDaycareTask,
    deleteDaycareTask,
    getDaycareTasks,
    updateDaycareTask,
} from "../daycareAdminService";
import styles from "../DaycareAdmin.module.scss";
import type {
    DaycarePriority,
    DaycareTask,
    DaycareTaskCategory,
    DaycareTaskStatus,
    EditableDaycareTask,
} from "../types";

type DaycareTasksProps = {
    onChanged: () => void;
};

const toDateInputValue = (date?: string) => {
    return date ? date.slice(0, 10) : "";
};

const DaycareTasks = ({ onChanged }: DaycareTasksProps) => {
    const [tasks, setTasks] = useState<DaycareTask[]>([]);
    const [draft, setDraft] = useState<EditableDaycareTask>(emptyTask);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const loadTasks = async () => {
        const data = await getDaycareTasks();
        setTasks(data);
        setLoading(false);
    };

    useEffect(() => {
        loadTasks().catch((error) => {
            console.error("Failed to load daycare tasks:", error);
            setLoading(false);
        });
    }, []);

    const resetDraft = () => {
        setDraft(emptyTask);
        setEditingId(null);
    };

    const handleEdit = (task: DaycareTask) => {
        setEditingId(task._id);
        setDraft({
            ...task,
            dueDate: toDateInputValue(task.dueDate),
            notes: task.notes ?? "",
        });
    };

    const handleSave = async () => {
        if (!draft.title.trim()) {
            return;
        }

        if (editingId) {
            await updateDaycareTask(editingId, draft);
        } else {
            await createDaycareTask(draft);
        }

        resetDraft();
        await loadTasks();
        onChanged();
    };

    const handleComplete = async (task: DaycareTask) => {
        await updateDaycareTask(task._id, { status: "הושלם" });
        await loadTasks();
        onChanged();
    };

    const handleDelete = async (id: string) => {
        await deleteDaycareTask(id);
        await loadTasks();
        onChanged();
    };

    return (
        <section className={styles.section} aria-labelledby="daycare-tasks">
            <div className={styles.sectionHeader}>
                <div>
                    <h2 className={styles.sectionTitle} id="daycare-tasks">
                        צ׳ק־ליסט פתיחת מעון
                    </h2>
                    <p className={styles.sectionDescription}>
                        משימות עבודה לפי קטגוריה, עדיפות ותאריך יעד.
                    </p>
                </div>
            </div>

            <div className={styles.inlineForm}>
                <label className={styles.field}>
                    <span className={styles.fieldLabel}>כותרת משימה</span>
                    <input
                        className={styles.input}
                        value={draft.title}
                        onChange={(event) =>
                            setDraft({ ...draft, title: event.target.value })
                        }
                    />
                </label>

                <label className={styles.field}>
                    <span className={styles.fieldLabel}>קטגוריה</span>
                    <select
                        className={styles.input}
                        value={draft.category}
                        onChange={(event) =>
                            setDraft({
                                ...draft,
                                category: event.target.value as DaycareTaskCategory,
                            })
                        }
                    >
                        {daycareTaskCategories.map((category) => (
                            <option key={category} value={category}>
                                {category}
                            </option>
                        ))}
                    </select>
                </label>

                <label className={styles.field}>
                    <span className={styles.fieldLabel}>סטטוס</span>
                    <select
                        className={styles.input}
                        value={draft.status}
                        onChange={(event) =>
                            setDraft({
                                ...draft,
                                status: event.target.value as DaycareTaskStatus,
                            })
                        }
                    >
                        {daycareTaskStatuses.map((status) => (
                            <option key={status} value={status}>
                                {status}
                            </option>
                        ))}
                    </select>
                </label>

                <label className={styles.field}>
                    <span className={styles.fieldLabel}>עדיפות</span>
                    <select
                        className={styles.input}
                        value={draft.priority}
                        onChange={(event) =>
                            setDraft({
                                ...draft,
                                priority: event.target.value as DaycarePriority,
                            })
                        }
                    >
                        {daycarePriorities.map((priority) => (
                            <option key={priority} value={priority}>
                                {priority}
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
                        {editingId ? "שמירה" : "הוספת משימה"}
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
                <div className={styles.loading}>טוען משימות...</div>
            ) : (
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th className={styles.tableHeader}>משימה</th>
                                <th className={styles.tableHeader}>קטגוריה</th>
                                <th className={styles.tableHeader}>סטטוס</th>
                                <th className={styles.tableHeader}>עדיפות</th>
                                <th className={styles.tableHeader}>יעד</th>
                                <th className={styles.tableHeader}>הערות</th>
                                <th className={styles.tableHeader}>פעולות</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tasks.map((task) => (
                                <tr className={styles.tableRow} key={task._id}>
                                    <td className={styles.tableCell}>{task.title}</td>
                                    <td className={styles.tableCell}>{task.category}</td>
                                    <td className={styles.tableCell}>
                                        <span className={styles.statusBadge}>
                                            {task.status}
                                        </span>
                                    </td>
                                    <td className={styles.tableCell}>{task.priority}</td>
                                    <td className={styles.tableCell}>
                                        {toDateInputValue(task.dueDate) || "-"}
                                    </td>
                                    <td className={styles.tableCell}>
                                        {task.notes || "-"}
                                    </td>
                                    <td className={styles.tableCell}>
                                        <div className={styles.rowActions}>
                                            <button
                                                className={styles.linkButton}
                                                type="button"
                                                onClick={() => handleEdit(task)}
                                            >
                                                עריכה
                                            </button>
                                            <button
                                                className={styles.linkButton}
                                                type="button"
                                                onClick={() => handleComplete(task)}
                                            >
                                                הושלם
                                            </button>
                                            <button
                                                className={styles.dangerButton}
                                                type="button"
                                                onClick={() => handleDelete(task._id)}
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

export default DaycareTasks;
