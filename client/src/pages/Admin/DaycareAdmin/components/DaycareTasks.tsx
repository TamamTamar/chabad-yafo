import { useEffect, useState } from "react";
import {
    daycarePriorities,
    daycareTaskCategories,
    daycareTaskStages,
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
    DaycareTaskStage,
    DaycareTaskStatus,
    EditableDaycareTask,
} from "../types";

type DaycareTasksProps = {
    onChanged: () => void;
};

type CategoryFilter = DaycareTaskCategory | "הכל";

const toDateInputValue = (date?: string) => {
    return date ? date.slice(0, 10) : "";
};

const getCategoryClassName = (category: DaycareTaskCategory) => {
    const categoryClassNames: Record<DaycareTaskCategory, string> = {
        תכנון: styles.categoryPlanning,
        שיפוץ: styles.categoryRenovation,
        בטיחות: styles.categorySafety,
        אישורים: styles.categoryPermits,
        "כוח אדם": styles.categoryStaff,
        ציוד: styles.categoryEquipment,
        שיווק: styles.categoryMarketing,
        הרשמות: styles.categoryRegistration,
    };

    return categoryClassNames[category];
};

const sortTasksByStatus = (tasksToSort: DaycareTask[]) => {
    const priorityWeight: Record<DaycarePriority, number> = {
        דחופה: 0,
        רגילה: 1,
        נמוכה: 2,
    };

    return [...tasksToSort].sort((firstTask, secondTask) => {
        if (firstTask.status === "הושלם") {
            return 1;
        }

        if (secondTask.status === "הושלם") {
            return -1;
        }

        return (
            priorityWeight[firstTask.priority] - priorityWeight[secondTask.priority]
        );
    });
};

const DaycareTasks = ({ onChanged }: DaycareTasksProps) => {
    const [tasks, setTasks] = useState<DaycareTask[]>([]);
    const [draft, setDraft] = useState<EditableDaycareTask>(emptyTask);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] =
        useState<CategoryFilter>("הכל");
    const [showTaskForm, setShowTaskForm] = useState(false);
    const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const visibleTasks = sortTasksByStatus(
        tasks.filter((task) => {
            const categoryMatches =
                selectedCategory === "הכל" || task.category === selectedCategory;

            return categoryMatches;
        })
    );

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
        setShowTaskForm(false);
    };

    const handleAddClick = () => {
        setDraft(emptyTask);
        setEditingId(null);
        setShowTaskForm(true);
    };

    const handleEdit = (task: DaycareTask) => {
        setEditingId(task._id);
        setShowTaskForm(true);
        setDraft({
            ...task,
            stage: task.stage ?? "לפני פתיחה",
            dueDate: toDateInputValue(task.dueDate),
            notes: task.notes ?? "",
            resourceLabel: task.resourceLabel ?? "",
            resourceUrl: task.resourceUrl ?? "",
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

    const handleStatusChange = async (
        task: DaycareTask,
        status: DaycareTaskStatus
    ) => {
        setUpdatingTaskId(task._id);
        try {
            await updateDaycareTask(task._id, { status });
            await loadTasks();
            onChanged();
        } finally {
            setUpdatingTaskId(null);
        }
    };

    const handleCompleteToggle = async (task: DaycareTask) => {
        const nextStatus = task.status === "הושלם" ? "בטיפול" : "הושלם";
        await handleStatusChange(task, nextStatus);
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

                <button
                    className={styles.primaryButton}
                    type="button"
                    onClick={handleAddClick}
                >
                    הוספת משימה
                </button>
            </div>

            {showTaskForm && (
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
                    <span className={styles.fieldLabel}>שלב</span>
                    <select
                        className={styles.input}
                        value={draft.stage ?? "לפני פתיחה"}
                        onChange={(event) =>
                            setDraft({
                                ...draft,
                                stage: event.target.value as DaycareTaskStage,
                            })
                        }
                    >
                        {daycareTaskStages.map((stage) => (
                            <option key={stage} value={stage}>
                                {stage}
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

                <label className={styles.field}>
                    <span className={styles.fieldLabel}>שם קישור עזר</span>
                    <input
                        className={styles.input}
                        value={draft.resourceLabel ?? ""}
                        onChange={(event) =>
                            setDraft({
                                ...draft,
                                resourceLabel: event.target.value,
                            })
                        }
                    />
                </label>

                <label className={styles.fieldWide}>
                    <span className={styles.fieldLabel}>קישור עזר / טופס</span>
                    <input
                        className={styles.input}
                        value={draft.resourceUrl ?? ""}
                        onChange={(event) =>
                            setDraft({
                                ...draft,
                                resourceUrl: event.target.value,
                            })
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
            )}

            <div className={styles.categoryFilterBar} aria-label="סינון משימות">
                <span className={styles.categoryFilterLabel}>סינון לפי קטגוריה</span>
                <button
                    className={
                        selectedCategory === "הכל"
                            ? styles.categoryFilterActive
                            : styles.categoryFilterButton
                    }
                    type="button"
                    onClick={() => setSelectedCategory("הכל")}
                >
                    הכל
                </button>
                {daycareTaskCategories.map((category) => (
                    <button
                        className={
                            selectedCategory === category
                                ? `${styles.categoryFilterActive} ${getCategoryClassName(
                                      category
                                  )}`
                                : `${styles.categoryFilterButton} ${getCategoryClassName(
                                      category
                                  )}`
                        }
                        key={category}
                        type="button"
                        onClick={() => setSelectedCategory(category)}
                    >
                        {category}
                    </button>
                ))}
                <span className={styles.categoryFilterCount}>
                    {visibleTasks.length} משימות
                </span>
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
                                <th className={styles.tableHeader}>שלב</th>
                                <th className={styles.tableHeader}>סטטוס</th>
                                <th className={styles.tableHeader}>עדיפות</th>
                                <th className={styles.tableHeader}>יעד</th>
                                <th className={styles.tableHeader}>עזר</th>
                                <th className={styles.tableHeader}>פעולות</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleTasks.map((task) => (
                                <tr
                                    className={
                                        task.status === "הושלם"
                                            ? `${styles.tableRow} ${styles.completedRow}`
                                            : styles.tableRow
                                    }
                                    key={task._id}
                                >
                                    <td className={styles.tableCell} data-label="משימה">
                                        <label className={styles.taskCheckLabel}>
                                            <input
                                                checked={task.status === "הושלם"}
                                                className={styles.taskCheckbox}
                                                disabled={updatingTaskId === task._id}
                                                onChange={() =>
                                                    handleCompleteToggle(task)
                                                }
                                                type="checkbox"
                                            />
                                            <span className={styles.taskTitleText}>
                                                {task.title}
                                            </span>
                                            {task.notes && (
                                                <span className={styles.taskNoteText}>
                                                    {task.notes}
                                                </span>
                                            )}
                                        </label>
                                    </td>
                                    <td className={styles.tableCell} data-label="קטגוריה">
                                        <span
                                            className={`${styles.categoryBadge} ${getCategoryClassName(
                                                task.category
                                            )}`}
                                        >
                                            {task.category}
                                        </span>
                                    </td>
                                    <td className={styles.tableCell} data-label="שלב">
                                        <span className={styles.stageBadge}>
                                            {task.stage ?? "לפני פתיחה"}
                                        </span>
                                    </td>
                                    <td className={styles.tableCell} data-label="סטטוס">
                                        <select
                                            aria-label={`סטטוס ${task.title}`}
                                            className={styles.statusSelect}
                                            disabled={updatingTaskId === task._id}
                                            value={task.status}
                                            onChange={(event) =>
                                                handleStatusChange(
                                                    task,
                                                    event.target.value as DaycareTaskStatus
                                                )
                                            }
                                        >
                                            {daycareTaskStatuses.map((status) => (
                                                <option key={status} value={status}>
                                                    {status}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className={styles.tableCell} data-label="עדיפות">
                                        {task.priority}
                                    </td>
                                    <td className={styles.tableCell} data-label="יעד">
                                        {toDateInputValue(task.dueDate) || "-"}
                                    </td>
                                    <td className={styles.tableCell} data-label="עזר">
                                        {task.resourceUrl ? (
                                            <a
                                                className={styles.inlineLink}
                                                href={task.resourceUrl}
                                                rel="noreferrer"
                                                target="_blank"
                                            >
                                                {task.resourceLabel || "פתיחה"}
                                            </a>
                                        ) : (
                                            "-"
                                        )}
                                    </td>
                                    <td className={styles.tableCell} data-label="פעולות">
                                        <div className={styles.rowActions}>
                                            <button
                                                className={styles.linkButton}
                                                type="button"
                                                onClick={() => handleEdit(task)}
                                            >
                                                עריכה
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
