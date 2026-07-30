import { useEffect, useRef, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import {
    daycarePriorities,
    daycareTaskCategories,
    emptyTask,
} from "../daycareAdminConfig";
import {
    createDaycareTask,
    deleteDaycareTask,
    getDaycareTasks,
    updateDaycareTask,
    updateDaycareTaskSubtask,
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
    onFinanceChanged?: () => void;
};

type CategoryFilter =
    | DaycareTaskCategory
    | "הכל"
    | "פתוחות"
    | "דחופות"
    | "הושלמו";

const quickTaskFilters: CategoryFilter[] = [
    "הכל",
    "פתוחות",
    "דחופות",
    "הושלמו",
];

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

const getStatusFromSubtasks = (
    subtasks: DaycareTask["subtasks"]
): DaycareTaskStatus => {
    if (!subtasks || subtasks.length === 0) {
        return "לא התחיל";
    }

    const completedCount = subtasks.filter((subtask) => subtask.completed).length;
    const hasStartedSubtask = subtasks.some(
        (subtask) =>
            subtask.completed ||
            subtask.ordered ||
            subtask.installed ||
            (subtask.actualCost ?? 0) > 0
    );

    if (completedCount === subtasks.length) {
        return "הושלם";
    }

    if (hasStartedSubtask) {
        return "בטיפול";
    }

    return "לא התחיל";
};

const getSubtaskProgressText = (task: DaycareTask) => {
    const subtasks = task.subtasks || [];

    if (subtasks.length === 0) {
        return "";
    }

    const completedCount = subtasks.filter((subtask) => subtask.completed).length;

    return `${completedCount}/${subtasks.length}`;
};

const hasSubtasks = (task: DaycareTask) => {
    return Boolean(task.subtasks && task.subtasks.length > 0);
};

const shouldShowProcurementFields = (task: DaycareTask) => {
    return (
        task.title.startsWith("הקמה מלאה") ||
        task.title === "רשימת ציוד לקנייה לפתיחת המעון" ||
        task.title === "ניהול תרומות ופריטים שאפשר לבקש"
    );
};

type SubtaskUpdate =
    NonNullable<DaycareTask["subtasks"]>[number];

const parseCostValue = (value: string) => {
    const numericValue = Number(value.replace(/[^\d.]/g, ""));

    return Number.isFinite(numericValue) ? numericValue : 0;
};

const DaycareTasks = ({ onChanged, onFinanceChanged }: DaycareTasksProps) => {
    const [tasks, setTasks] = useState<DaycareTask[]>([]);
    const [draft, setDraft] = useState<EditableDaycareTask>(emptyTask);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] =
        useState<CategoryFilter>("הכל");
    const [showTaskForm, setShowTaskForm] = useState(false);
    const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
    const [expandedTaskIds, setExpandedTaskIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const taskFormRef = useRef<HTMLDivElement | null>(null);
    const taskTitleInputRef = useRef<HTMLInputElement | null>(null);
    const visibleTasks = sortTasksByStatus(
        tasks.filter((task) => {
            if (selectedCategory === "הכל") {
                return true;
            }

            if (selectedCategory === "פתוחות") {
                return task.status !== "הושלם";
            }

            if (selectedCategory === "דחופות") {
                return task.priority === "דחופה" && task.status !== "הושלם";
            }

            if (selectedCategory === "הושלמו") {
                return task.status === "הושלם";
            }

            return task.category === selectedCategory;
        })
    );
    const openTasksCount = tasks.filter((task) => task.status !== "הושלם")
        .length;
    const urgentOpenTasksCount = tasks.filter(
        (task) => task.priority === "דחופה" && task.status !== "הושלם"
    ).length;
    const completedTasksCount = tasks.filter(
        (task) => task.status === "הושלם"
    ).length;

    const loadTasks = async () => {
        const data = await getDaycareTasks();
        setTasks(data);
        setLoading(false);
    };

    useEffect(() => {
        let active = true;

        void getDaycareTasks()
            .then((data) => {
                if (active) setTasks(data);
            })
            .catch((error) => {
                console.error("Failed to load daycare tasks:", error);
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, []);

    const resetDraft = () => {
        setDraft(emptyTask);
        setEditingId(null);
        setShowTaskForm(false);
    };

    const focusTaskForm = () => {
        window.setTimeout(() => {
            taskFormRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
            taskTitleInputRef.current?.focus({ preventScroll: true });
        }, 0);
    };

    const handleAddClick = () => {
        setDraft(emptyTask);
        setEditingId(null);
        setShowTaskForm(true);
        focusTaskForm();
    };

    const handleEdit = (task: DaycareTask) => {
        setEditingId(task._id);
        setShowTaskForm(true);
        setDraft({
            ...task,
            subtasks: task.subtasks?.length
                ? task.subtasks
                : [{ title: "", completed: false }],
        });
        focusTaskForm();
    };

    const updateDraftSubtaskTitle = (subtaskIndex: number, title: string) => {
        const subtasks = draft.subtasks?.length
            ? draft.subtasks
            : [{ title: "", completed: false }];

        setDraft({
            ...draft,
            subtasks: subtasks.map((subtask, index) =>
                index === subtaskIndex ? { ...subtask, title } : subtask
            ),
        });
    };

    const addDraftSubtask = () => {
        setDraft({
            ...draft,
            subtasks: [
                ...(draft.subtasks || []),
                { title: "", completed: false },
            ],
        });
    };

    const removeDraftSubtask = (subtaskIndex: number) => {
        const nextSubtasks = (draft.subtasks || []).filter(
            (_subtask, index) => index !== subtaskIndex
        );

        setDraft({
            ...draft,
            subtasks: nextSubtasks.length
                ? nextSubtasks
                : [{ title: "", completed: false }],
        });
    };

    const handleSave = async () => {
        if (!draft.title.trim()) {
            return;
        }

        const cleanSubtasks = (draft.subtasks || [])
            .map((subtask) => ({ ...subtask, title: subtask.title.trim() }))
            .filter((subtask) => subtask.title);
        const taskToSave = {
            ...draft,
            subtasks: cleanSubtasks,
            status: getStatusFromSubtasks(cleanSubtasks),
        };

        if (editingId) {
            await updateDaycareTask(editingId, taskToSave);
        } else {
            await createDaycareTask(taskToSave);
        }

        resetDraft();
        await loadTasks();
        onChanged();
    };

    const handleSubtaskToggle = async (
        task: DaycareTask,
        subtaskIndex: number
    ) => {
        const subtask = task.subtasks?.[subtaskIndex];

        if (!subtask) {
            return;
        }

        setUpdatingTaskId(task._id);
        try {
            const updatedTask = await updateDaycareTaskSubtask(
                task._id,
                subtaskIndex,
                { completed: !subtask.completed }
            );
            setTasks((currentTasks) =>
                currentTasks.map((currentTask) =>
                    currentTask._id === updatedTask._id
                        ? updatedTask
                        : currentTask
                )
            );
            onChanged();
        } finally {
            setUpdatingTaskId(null);
        }
    };

    const handleSubtaskUpdate = async (
        task: DaycareTask,
        subtaskIndex: number,
        updates: Partial<SubtaskUpdate>,
        updateScope: "all" | "finance" = "all"
    ) => {
        setUpdatingTaskId(task._id);
        try {
            const updatedTask = await updateDaycareTaskSubtask(
                task._id,
                subtaskIndex,
                updates
            );
            setTasks((currentTasks) =>
                currentTasks.map((currentTask) =>
                    currentTask._id === updatedTask._id
                        ? updatedTask
                        : currentTask
                )
            );
            if (updateScope === "finance") {
                onFinanceChanged?.();
            } else {
                onChanged();
            }
        } finally {
            setUpdatingTaskId(null);
        }
    };

    const handleSubtaskCostSave = (
        task: DaycareTask,
        subtaskIndex: number,
        value: string
    ) => {
        const subtask = task.subtasks?.[subtaskIndex];

        if (!subtask) {
            return;
        }

        const actualCost = parseCostValue(value);

        if ((subtask.actualCost ?? 0) === actualCost) {
            return;
        }

        handleSubtaskUpdate(task, subtaskIndex, { actualCost }, "finance");
    };

    const toggleTaskDetails = (taskId: string) => {
        setExpandedTaskIds((currentIds) =>
            currentIds.includes(taskId)
                ? currentIds.filter((id) => id !== taskId)
                : [...currentIds, taskId]
        );
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
            <div className={styles.inlineForm} ref={taskFormRef}>
                <label className={styles.field}>
                    <span className={styles.fieldLabel}>כותרת משימה</span>
                    <input
                        className={styles.input}
                        ref={taskTitleInputRef}
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

                <div className={styles.subtaskEditPanel}>
                    <div className={styles.subtaskEditHeader}>
                        <span className={styles.fieldLabel}>תתי־משימות</span>
                        <button
                            className={styles.secondaryButton}
                            type="button"
                            onClick={addDraftSubtask}
                        >
                            הוספת תת־משימה
                        </button>
                    </div>
                    {(draft.subtasks?.length
                        ? draft.subtasks
                        : [{ title: "", completed: false }]
                    ).map((subtask, index) => (
                        <div
                            className={styles.subtaskEditRow}
                            key={index}
                        >
                            <input
                                className={styles.input}
                                placeholder="שם תת־משימה"
                                value={subtask.title}
                                onChange={(event) =>
                                    updateDraftSubtaskTitle(
                                        index,
                                        event.target.value
                                    )
                                }
                            />
                            <button
                                className={styles.dangerButton}
                                type="button"
                                onClick={() => removeDraftSubtask(index)}
                            >
                                מחיקה
                            </button>
                        </div>
                    ))}
                </div>

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

            <div className={styles.taskFocusSummary}>
                <div className={styles.taskFocusItem}>
                    <span>פתוחות</span>
                    <strong>{openTasksCount}</strong>
                </div>
                <div className={styles.taskFocusItem}>
                    <span>דחופות</span>
                    <strong>{urgentOpenTasksCount}</strong>
                </div>
                <div className={styles.taskFocusItem}>
                    <span>הושלמו</span>
                    <strong>{completedTasksCount}</strong>
                </div>
                <button
                    className={styles.taskFocusButton}
                    type="button"
                    onClick={() => setSelectedCategory("דחופות")}
                >
                    הצג דחופות
                </button>
            </div>

            <div className={styles.categoryFilterBar} aria-label="סינון משימות">
                <div className={styles.filterSummaryRow}>
                    <span className={styles.categoryFilterLabel}>סינון משימות</span>
                    <span className={styles.categoryFilterCount}>
                        {visibleTasks.length} משימות
                    </span>
                </div>

                <div className={styles.quickFilterGroup}>
                    {quickTaskFilters.map((filter) => (
                        <button
                            className={
                                selectedCategory === filter
                                    ? styles.quickFilterActive
                                    : styles.quickFilterButton
                            }
                            key={filter}
                            type="button"
                            onClick={() => setSelectedCategory(filter)}
                        >
                            {filter}
                        </button>
                    ))}
                </div>

                <label className={styles.categorySelectField}>
                    <span className={styles.categoryFilterLabel}>קטגוריה</span>
                    <select
                        className={styles.categorySelect}
                        value={
                            daycareTaskCategories.includes(
                                selectedCategory as DaycareTaskCategory
                            )
                                ? selectedCategory
                                : ""
                        }
                        onChange={(event) => {
                            const nextCategory = event.target
                                .value as CategoryFilter;

                            setSelectedCategory(
                                nextCategory === "" ? "הכל" : nextCategory
                            );
                        }}
                    >
                        <option value="">כל הקטגוריות</option>
                        {daycareTaskCategories.map((category) => (
                            <option key={category} value={category}>
                                {category}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            {loading ? (
                <div className={styles.loading}>טוען משימות...</div>
            ) : (
                <div className={styles.taskCards}>
                    {visibleTasks.map((task) => {
                        const showProcurementFields =
                            shouldShowProcurementFields(task);
                        const isExpanded = expandedTaskIds.includes(task._id);

                        return (
                            <article
                                className={
                                    task.status === "הושלם"
                                        ? `${styles.taskCard} ${styles.taskCardCompleted}`
                                        : styles.taskCard
                                }
                                key={task._id}
                            >
                                <button
                                    className={styles.taskCardHeader}
                                    disabled={!hasSubtasks(task)}
                                    type="button"
                                    onClick={() => toggleTaskDetails(task._id)}
                                >
                                    <span className={styles.taskCheckLabel}>
                                        <span
                                            aria-hidden="true"
                                            className={
                                                task.status === "הושלם"
                                                    ? `${styles.taskCheckboxVisual} ${styles.taskCheckboxVisualChecked}`
                                                    : styles.taskCheckboxVisual
                                            }
                                        />
                                        <span className={styles.taskTitleText}>
                                            {task.title}
                                        </span>
                                    </span>

                                    {hasSubtasks(task) && (
                                        <span className={styles.taskHeaderProgress}>
                                            {isExpanded ? "סגור" : "פתח"}
                                            <strong>
                                                {getSubtaskProgressText(task)}
                                            </strong>
                                        </span>
                                    )}
                                </button>

                                <div className={styles.rowActions}>
                                    <button
                                        aria-label={`עריכת ${task.title}`}
                                        className={`${styles.linkButton} ${styles.iconActionButton}`}
                                        title="עריכה"
                                        type="button"
                                        onClick={() => handleEdit(task)}
                                    >
                                        <Pencil aria-hidden="true" size={17} />
                                    </button>
                                    <button
                                        aria-label={`מחיקת ${task.title}`}
                                        className={`${styles.dangerButton} ${styles.iconActionButton}`}
                                        title="מחיקה"
                                        type="button"
                                        onClick={() => handleDelete(task._id)}
                                    >
                                        <Trash2 aria-hidden="true" size={17} />
                                    </button>
                                </div>

                                <div className={styles.taskCardMeta}>
                                    <span
                                        className={`${styles.categoryBadge} ${getCategoryClassName(
                                            task.category
                                        )}`}
                                    >
                                        {task.category}
                                    </span>
                                    <span
                                        className={`${styles.statusSelect} ${styles.lockedStatus}`}
                                        title="הסטטוס נקבע אוטומטית לפי תתי־המשימות"
                                    >
                                        {task.status}
                                    </span>
                                    <span className={styles.priorityPill}>
                                        {task.priority}
                                    </span>
                                    {hasSubtasks(task) && (
                                        <button
                                            className={styles.subtaskToggle}
                                            type="button"
                                            onClick={() =>
                                                toggleTaskDetails(task._id)
                                            }
                                        >
                                            {isExpanded ? "סגירת פירוט" : "פירוט"}
                                            <span>
                                                {getSubtaskProgressText(task)}
                                            </span>
                                        </button>
                                    )}
                                </div>

                                {task.subtasks &&
                                    task.subtasks.length > 0 &&
                                    isExpanded && (
                                        <div
                                            className={`${styles.subtaskList} ${
                                                showProcurementFields
                                                    ? styles.subtaskListDetailed
                                                    : styles.subtaskListSimple
                                            }`}
                                        >
                                            <div
                                                className={`${styles.subtaskHeader} ${
                                                    showProcurementFields
                                                        ? styles.subtaskHeaderDetailed
                                                        : styles.subtaskHeaderSimple
                                                }`}
                                            >
                                                <span>פריט</span>
                                                {showProcurementFields && (
                                                    <>
                                                        <span>כמה עלה</span>
                                                        <span>הוזמן</span>
                                                        <span>הותקן</span>
                                                    </>
                                                )}
                                                {!showProcurementFields && (
                                                    <span>בוצע</span>
                                                )}
                                            </div>
                                            {task.subtasks.map(
                                                (subtask, index) => (
                                                    <div
                                                        className={`${styles.subtaskItem} ${
                                                            showProcurementFields
                                                                ? styles.subtaskItemDetailed
                                                                : styles.subtaskItemSimple
                                                        }`}
                                                        key={`${task._id}-${subtask.title}`}
                                                    >
                                                        <span>{subtask.title}</span>
                                                        {!showProcurementFields && (
                                                            <label
                                                                className={
                                                                    styles.subtaskFlag
                                                                }
                                                            >
                                                                <span
                                                                    className={
                                                                        styles.subtaskFlagText
                                                                    }
                                                                >
                                                                    בוצע
                                                                </span>
                                                                <input
                                                                    checked={
                                                                        subtask.completed
                                                                    }
                                                                    className={
                                                                        styles.subtaskCheckbox
                                                                    }
                                                                    disabled={
                                                                        updatingTaskId ===
                                                                        task._id
                                                                    }
                                                                    onChange={() =>
                                                                        handleSubtaskToggle(
                                                                            task,
                                                                            index
                                                                        )
                                                                    }
                                                                    type="checkbox"
                                                                />
                                                            </label>
                                                        )}
                                                        {showProcurementFields && (
                                                            <>
                                                                <label
                                                                    className={
                                                                        styles.subtaskCostField
                                                                    }
                                                                >
                                                                    <span
                                                                        className={
                                                                            styles.subtaskFlagText
                                                                        }
                                                                    >
                                                                        כמה עלה
                                                                    </span>
                                                                    <input
                                                                        aria-label={`כמה עלה - ${subtask.title}`}
                                                                        className={
                                                                            styles.subtaskCostInput
                                                                        }
                                                                        defaultValue={
                                                                            subtask.actualCost
                                                                                ? String(
                                                                                      subtask.actualCost
                                                                                  )
                                                                                : ""
                                                                        }
                                                                        disabled={
                                                                            updatingTaskId ===
                                                                            task._id
                                                                        }
                                                                        inputMode="decimal"
                                                                        onBlur={(event) =>
                                                                            handleSubtaskCostSave(
                                                                                task,
                                                                                index,
                                                                                event
                                                                                    .currentTarget
                                                                                    .value
                                                                            )
                                                                        }
                                                                        onKeyDown={(
                                                                            event
                                                                        ) => {
                                                                            if (
                                                                                event.key !==
                                                                                "Enter"
                                                                            ) {
                                                                                return;
                                                                            }

                                                                            event.preventDefault();
                                                                            event.currentTarget.blur();
                                                                        }}
                                                                        placeholder="₪"
                                                                        type="text"
                                                                    />
                                                                </label>
                                                                <label
                                                                    className={
                                                                        styles.subtaskFlag
                                                                    }
                                                                >
                                                                    <span
                                                                        className={
                                                                            styles.subtaskFlagText
                                                                        }
                                                                    >
                                                                        הוזמן
                                                                    </span>
                                                                    <input
                                                                        aria-label={`הוזמן - ${subtask.title}`}
                                                                        checked={
                                                                            subtask.ordered ||
                                                                            false
                                                                        }
                                                                        className={
                                                                            styles.subtaskCheckbox
                                                                        }
                                                                        disabled={
                                                                            updatingTaskId ===
                                                                            task._id
                                                                        }
                                                                        onChange={() =>
                                                                            handleSubtaskUpdate(
                                                                                task,
                                                                                index,
                                                                                {
                                                                                    ordered:
                                                                                        !subtask.ordered,
                                                                                }
                                                                            )
                                                                        }
                                                                        type="checkbox"
                                                                    />
                                                                </label>
                                                                <label
                                                                    className={
                                                                        styles.subtaskFlag
                                                                    }
                                                                >
                                                                    <span
                                                                        className={
                                                                            styles.subtaskFlagText
                                                                        }
                                                                    >
                                                                        הותקן
                                                                    </span>
                                                                    <input
                                                                        aria-label={`הותקן - ${subtask.title}`}
                                                                        checked={
                                                                            subtask.installed ||
                                                                            false
                                                                        }
                                                                        className={
                                                                            styles.subtaskCheckbox
                                                                        }
                                                                        disabled={
                                                                            updatingTaskId ===
                                                                            task._id
                                                                        }
                                                                        onChange={() =>
                                                                            handleSubtaskUpdate(
                                                                                task,
                                                                                index,
                                                                                {
                                                                                    installed:
                                                                                        !subtask.installed,
                                                                                    completed:
                                                                                        !subtask.installed,
                                                                                }
                                                                            )
                                                                        }
                                                                        type="checkbox"
                                                                    />
                                                                </label>
                                                            </>
                                                        )}
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    )}
                            </article>
                        );
                    })}
                </div>
            )}
        </section>
    );
};

export default DaycareTasks;
