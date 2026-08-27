import { useEffect, useRef, useState } from "react";
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
    "פתוחות",
    "דחופות",
    "הכל",
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

const getSubtaskProgressLabel = (task: DaycareTask) => {
    const subtasks = task.subtasks || [];
    const completedCount = subtasks.filter((subtask) => subtask.completed).length;

    return `בוצעו ${completedCount} מתוך ${subtasks.length}`;
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

export const useDaycareTasks = ({ onChanged, onFinanceChanged }: DaycareTasksProps) => {
    const [tasks, setTasks] = useState<DaycareTask[]>([]);
    const [draft, setDraft] = useState<EditableDaycareTask>(emptyTask);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] =
        useState<CategoryFilter>("פתוחות");
    const [searchQuery, setSearchQuery] = useState("");
    const [showTaskForm, setShowTaskForm] = useState(false);
    const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
    const [expandedTaskIds, setExpandedTaskIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const taskTitleInputRef = useRef<HTMLInputElement | null>(null);
    const visibleTasks = sortTasksByStatus(
        tasks.filter((task) => {
            const normalizedQuery = searchQuery.trim().toLocaleLowerCase("he");
            const matchesSearch =
                !normalizedQuery ||
                task.title.toLocaleLowerCase("he").includes(normalizedQuery) ||
                Boolean(
                    task.subtasks?.some((subtask) =>
                        subtask.title
                            .toLocaleLowerCase("he")
                            .includes(normalizedQuery)
                    )
                );

            if (!matchesSearch) {
                return false;
            }

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

    useEffect(() => {
        if (!showTaskForm) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setDraft(emptyTask);
                setEditingId(null);
                setShowTaskForm(false);
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [showTaskForm]);

    const resetDraft = () => {
        setDraft(emptyTask);
        setEditingId(null);
        setShowTaskForm(false);
    };

    const focusTaskForm = () => {
        window.setTimeout(() => {
            taskTitleInputRef.current?.focus();
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

    const getFilterCount = (filter: CategoryFilter) => {
        if (filter === "פתוחות") return openTasksCount;
        if (filter === "דחופות") return urgentOpenTasksCount;
        if (filter === "הושלמו") return completedTasksCount;
        return tasks.length;
    };

    return {
        draft, editingId, selectedCategory, searchQuery, showTaskForm,
        updatingTaskId, expandedTaskIds, loading, taskTitleInputRef, visibleTasks,
        setDraft, setSelectedCategory, setSearchQuery, resetDraft, handleAddClick,
        handleEdit, updateDraftSubtaskTitle, addDraftSubtask, removeDraftSubtask,
        handleSave, handleSubtaskToggle, handleSubtaskUpdate,
        handleSubtaskCostSave, toggleTaskDetails, handleDelete, getFilterCount,
        quickTaskFilters, getCategoryClassName, hasSubtasks,
        shouldShowProcurementFields, getSubtaskProgressLabel,
        daycarePriorities, daycareTaskCategories,
    };
};
