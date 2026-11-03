import { AdminButton } from "../../../../components/AdminUI";
import { useRef, useState } from "react";
import TaskActionsPopover from "./TaskActionsPopover";
import AdminDialog from "../../../../components/AdminUI/AdminDialog";
import { ChevronDown, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import styles from "./DaycareTasks.styles";
import type { DaycarePriority, DaycareTaskCategory, DaycareTask } from "../types";
import type { CategoryFilter, useDaycareTasks } from "./useDaycareTasks";

type DaycareTasksViewProps = { model: ReturnType<typeof useDaycareTasks> };

const DaycareTasksView = ({ model }: DaycareTasksViewProps) => {
    const addButton = useRef<HTMLButtonElement>(null);
    const [deleteTarget, setDeleteTarget] = useState<DaycareTask | null>(null);
    const [deleting, setDeleting] = useState(false);
    const {
        draft, editingId, selectedCategory, searchQuery, showTaskForm,
        updatingTaskId, expandedTaskIds, loading, saving, error, taskTitleInputRef, visibleTasks,
        setDraft, setSelectedCategory, setSearchQuery, resetDraft, handleAddClick,
        handleEdit, updateDraftSubtaskTitle, addDraftSubtask, removeDraftSubtask,
        handleSave, handleSubtaskToggle, handleSubtaskUpdate,
        handleSubtaskCostSave, toggleTaskDetails, handleDelete, getFilterCount,
        quickTaskFilters, hasSubtasks,
        shouldShowProcurementFields, getSubtaskProgressLabel,
        daycarePriorities, daycareTaskCategories,
    } = model;

    return (
        <section className={styles.section} aria-labelledby="admin-page-title">
            {deleteTarget && <AdminDialog labelledBy="task-delete-title" onClose={() => { if (!deleting) setDeleteTarget(null); }} className={styles.deleteDialog}>
                <h2 id="task-delete-title">מחיקת משימה</h2>
                <p>למחוק את המשימה ״{deleteTarget.title}״? לא ניתן לבטל את המחיקה.</p>
                <div className={styles.formActions}>
                    <AdminButton type="button" className={styles.secondaryButton} data-dialog-initial-focus disabled={deleting} onClick={() => setDeleteTarget(null)}>ביטול</AdminButton>
                    <button type="button" className={styles.dangerButton} disabled={deleting} aria-busy={deleting} onClick={async () => {
                        setDeleting(true);
                        try {
                            await handleDelete(deleteTarget._id);
                            setDeleteTarget(null);
                            requestAnimationFrame(() => {
                                if (document.activeElement === document.body) addButton.current?.focus();
                            });
                        }
                        finally { setDeleting(false); }
                    }}>{deleting ? "מוחק..." : "אישור מחיקה"}</button>
                </div>
            </AdminDialog>}
            <header className={styles.sectionHeader}>
                <p className={styles.sectionDescription}>ניהול העבודה לפי קטגוריה, עדיפות והתקדמות תתי־המשימות</p>
                <AdminButton variant="primary" ref={addButton} className={styles.primaryButton} type="button" onClick={handleAddClick}>
                    <Plus aria-hidden="true" size={18} /> משימה חדשה
                </AdminButton>
            </header>
            {error && !showTaskForm && <p className={styles.error} role="alert">{error}</p>}
            {showTaskForm && (
                <AdminDialog labelledBy="task-editor-title" onClose={resetDraft} className={styles.taskEditor}>
                    <div className={styles.taskEditorHeader}>
                        <div>
                            <h3 id="task-editor-title">
                                {editingId ? "עריכת משימה" : "משימה חדשה"}
                            </h3>
                            <p>שם, סיווג ורשימת ביצוע - הכול נשמר יחד.</p>
                        </div>
                        <button
                            aria-label="סגירת הטופס"
                            className={styles.taskEditorClose}
                            type="button"
                            onClick={resetDraft}
                        >
                            <X aria-hidden="true" size={20} />
                        </button>
                    </div>
                    <label className={styles.field}>
                        <span>כותרת משימה</span>
                        <input
                            ref={taskTitleInputRef}
                            data-dialog-initial-focus
                            value={draft.title}
                            onChange={(event) =>
                                setDraft({ ...draft, title: event.target.value })
                            }
                        />
                    </label>

                    <label className={styles.field}>
                        <span>קטגוריה</span>
                        <select
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
                        <span>עדיפות</span>
                        <select
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
                            <span>תתי־משימות</span>
                            <AdminButton
                                className={styles.secondaryButton}
                                type="button"
                                onClick={addDraftSubtask}
                            >
                                הוספת תת־משימה
                            </AdminButton>
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
                                    aria-label={`שם תת־משימה ${index + 1}`}
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
                                    aria-label={`מחיקת תת־משימה ${index + 1}`}
                                    onClick={() => removeDraftSubtask(index)}
                                >
                                    מחיקה
                                </button>
                            </div>
                        ))}
                    </div>

                    {error && <p className={styles.error} role="alert">{error}</p>}
                    <div className={styles.formActions}>
                        <AdminButton variant="primary"
                            className={styles.primaryButton}
                            disabled={!draft.title.trim() || saving}
                            aria-busy={saving}
                            type="button"
                            onClick={handleSave}
                        >
                            {saving ? "שומר..." : editingId ? "שמירה" : "הוספת משימה"}
                        </AdminButton>
                        <AdminButton
                            className={styles.secondaryButton}
                            type="button"
                            onClick={resetDraft}
                        >
                            ביטול
                        </AdminButton>
                    </div>
                </AdminDialog>
            )}

            <div className={styles.categoryFilterBar} aria-label="סינון משימות">
                <div className={styles.quickFilterGroup}>
                    {quickTaskFilters.map((filter) => (
                        <button
                            className={
                                selectedCategory === filter
                                    ? styles.quickFilterActive
                                    : styles.quickFilterButton
                            }
                            key={filter}
                            aria-pressed={selectedCategory === filter}
                            type="button"
                            onClick={() => setSelectedCategory(filter)}
                        >
                            <span>{filter}</span>
                            <strong>{getFilterCount(filter)}</strong>
                        </button>
                    ))}
                </div>

                <label className={styles.taskSearchField}>
                    <span>חיפוש משימה</span><span className={styles.searchControl}><Search aria-hidden="true" size={18} />
                        <input
                            aria-label="חיפוש משימה"
                            placeholder="חיפוש משימה או פריט..."
                            type="search"
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                        />
                    </span>
                </label>

                <label className={styles.categorySelectField}>
                    <span>קטגוריה</span>
                    <select
                        value={
                            daycareTaskCategories.includes(
                                selectedCategory as DaycareTaskCategory
                            )
                                ? selectedCategory
                                : ""
                        }
                        onChange={(event) => {
                            const nextCategory = event.target
                                .value as CategoryFilter | "";

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

                <span className={styles.categoryFilterCount} aria-live="polite">
                    מוצגות {visibleTasks.length} משימות
                </span>
            </div>

            {loading ? (
                <div className={styles.loading} role="status">טוען משימות...</div>
            ) : (
                <div className={styles.taskCards}>
                    {visibleTasks.map((task) => {
                        const showProcurementFields =
                            shouldShowProcurementFields(task);
                        const isExpanded = expandedTaskIds.includes(task._id);

                        return (
                            <article
                                className={
                                    [
                                        styles.taskCard,
                                        isExpanded ? styles.taskCardExpanded : "",
                                    ].filter(Boolean).join(" ")
                                }
                                key={task._id}
                                data-task-id={task._id}
                                aria-busy={updatingTaskId === task._id}
                            >
                                <div className={styles.taskCardTop}>
                                    <button
                                        aria-expanded={
                                            hasSubtasks(task)
                                                ? isExpanded
                                                : undefined
                                        }
                                        aria-controls={hasSubtasks(task) && isExpanded ? `task-details-${task._id}` : undefined}
                                        className={styles.taskCardHeader}
                                        aria-disabled={!hasSubtasks(task)}
                                        type="button"
                                        onClick={() => { if (hasSubtasks(task)) toggleTaskDetails(task._id); }}
                                    >
                                        <span className={styles.taskCheckLabel}>
                                            <span className={styles.taskTitleText}>
                                                {task.title}
                                            </span>
                                            {hasSubtasks(task) && (
                                                <span className={styles.taskProgressText}>
                                                    {getSubtaskProgressLabel(task)}
                                                </span>
                                            )}
                                        </span>

                                        {hasSubtasks(task) && (
                                            <ChevronDown
                                                aria-hidden="true"
                                                className={
                                                    isExpanded
                                                        ? styles.taskChevronOpen
                                                        : styles.taskChevron
                                                }
                                                size={20}
                                            />
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
                                            className={`${styles.dangerButton} ${styles.iconActionButton} ${styles.desktopDelete}`}
                                            title="מחיקה"
                                            type="button"
                                            onClick={() => setDeleteTarget(task)}
                                        >
                                            <Trash2 aria-hidden="true" size={17} />
                                        </button>
                                        <TaskActionsPopover title={task.title} onDelete={() => setDeleteTarget(task)} />
                                    </div>
                                </div>

                                <div className={styles.taskCardMeta}>
                                    <span
                                        className={styles.categoryBadge}
                                    >
                                        {task.category}
                                    </span>
                                    <span
                                        className={styles.lockedStatus}
                                        data-tone={task.status === "הושלם" ? "success" : task.status === "בטיפול" ? "info" : "neutral"}
                                        title="הסטטוס נקבע אוטומטית לפי תתי־המשימות"
                                    >
                                        סטטוס: {task.status}
                                    </span>
                                    <span className={styles.priorityPill} data-tone={task.priority === "דחופה" ? "warning" : "neutral"}>
                                        {task.priority}
                                    </span>
                                </div>

                                {task.subtasks &&
                                    task.subtasks.length > 0 &&
                                    isExpanded && (
                                        <div
                                            id={`task-details-${task._id}`}
                                            className={styles.subtaskList}
                                        >
                                            <div
                                                className={`${styles.subtaskHeader} ${showProcurementFields
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
                                                        className={`${styles.subtaskItem} ${showProcurementFields
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
                                                                    aria-label={`בוצע - ${subtask.title}`}
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
                    {visibleTasks.length === 0 && !error && (
                        <div className={styles.emptyState}>
                            {getFilterCount("הכל") === 0
                                ? "עדיין אין משימות. אפשר להתחיל ביצירת משימה חדשה."
                                : "לא נמצאו משימות שמתאימות לסינון. אפשר לנקות את החיפוש או לבחור ״הכל״."}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
};

export default DaycareTasksView;
