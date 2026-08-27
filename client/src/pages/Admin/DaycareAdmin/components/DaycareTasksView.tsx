import { ChevronDown, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import styles from "../DaycareAdmin.module.scss";
import type { DaycarePriority, DaycareTaskCategory } from "../types";
import type { useDaycareTasks } from "./useDaycareTasks";

type DaycareTasksViewProps = { model: ReturnType<typeof useDaycareTasks> };

const DaycareTasksView = ({ model }: DaycareTasksViewProps) => {
    const {
        draft, editingId, selectedCategory, searchQuery, showTaskForm,
        updatingTaskId, expandedTaskIds, loading, taskTitleInputRef, visibleTasks,
        setDraft, setSelectedCategory, setSearchQuery, resetDraft, handleAddClick,
        handleEdit, updateDraftSubtaskTitle, addDraftSubtask, removeDraftSubtask,
        handleSave, handleSubtaskToggle, handleSubtaskUpdate,
        handleSubtaskCostSave, toggleTaskDetails, handleDelete, getFilterCount,
        quickTaskFilters, getCategoryClassName, hasSubtasks,
        shouldShowProcurementFields, getSubtaskProgressLabel,
        daycarePriorities, daycareTaskCategories,
    } = model;

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
                    <Plus aria-hidden="true" size={18} />
                    משימה חדשה
                </button>
            </div>

            {showTaskForm && (
            <div
                className={styles.taskModalBackdrop}
                role="presentation"
                onMouseDown={(event) => {
                    if (event.currentTarget === event.target) resetDraft();
                }}
            >
            <div
                aria-labelledby="task-editor-title"
                aria-modal="true"
                className={`${styles.inlineForm} ${styles.taskEditor}`}
                role="dialog"
            >
                <div className={styles.taskEditorHeader}>
                    <div>
                        <h3 id="task-editor-title">
                            {editingId ? "עריכת משימה" : "משימה חדשה"}
                        </h3>
                        <p>שם, סיווג ורשימת ביצוע — הכול נשמר יחד.</p>
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
                        disabled={!draft.title.trim()}
                        type="button"
                        onClick={handleSave}
                    >
                        {editingId ? "שמירה" : "הוספת משימה"}
                    </button>
                    <button
                        className={styles.secondaryButton}
                        type="button"
                        onClick={resetDraft}
                    >
                        ביטול
                    </button>
                </div>
            </div>
            </div>
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
                            type="button"
                            onClick={() => setSelectedCategory(filter)}
                        >
                            <span>{filter}</span>
                            <strong>{getFilterCount(filter)}</strong>
                        </button>
                    ))}
                </div>

                <label className={styles.taskSearchField}>
                    <Search aria-hidden="true" size={18} />
                    <input
                        aria-label="חיפוש משימה"
                        placeholder="חיפוש משימה או פריט..."
                        type="search"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                    />
                </label>

                <label className={styles.categorySelectField}>
                    <span className={styles.visuallyHidden}>קטגוריה</span>
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

                <span className={styles.categoryFilterCount} aria-live="polite">
                    מוצגות {visibleTasks.length} משימות
                </span>
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
                                    [
                                        styles.taskCard,
                                        task.status === "הושלם"
                                            ? styles.taskCardCompleted
                                            : "",
                                        isExpanded ? styles.taskCardExpanded : "",
                                    ].filter(Boolean).join(" ")
                                }
                                key={task._id}
                            >
                                <div className={styles.taskCardTop}>
                                    <button
                                        aria-expanded={
                                            hasSubtasks(task)
                                                ? isExpanded
                                                : undefined
                                        }
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
                                        className={`${styles.dangerButton} ${styles.iconActionButton}`}
                                        title="מחיקה"
                                        type="button"
                                        onClick={() => handleDelete(task._id)}
                                    >
                                        <Trash2 aria-hidden="true" size={17} />
                                    </button>
                                    </div>
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
                                        סטטוס: {task.status}
                                    </span>
                                    <span className={styles.priorityPill}>
                                        {task.priority}
                                    </span>
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
                    {visibleTasks.length === 0 && (
                        <div className={styles.emptyState}>
                            לא נמצאו משימות שמתאימות לסינון. אפשר לנקות את
                            החיפוש או לבחור “הכל”.
                        </div>
                    )}
                </div>
            )}
        </section>
    );
};

export default DaycareTasksView;
