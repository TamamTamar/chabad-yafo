import { useEffect, useMemo, useState, type DragEvent } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import ConfirmDialog from "../../../../components/ConfirmDialog/ConfirmDialog";
import {
    createProject,
    deleteProject,
    getProjects,
    updateProject,
} from "../../../../services/adminService";
import {
    PROJECT_TASK_STATUSES,
    type ProjectAdmin,
    type ProjectPayload,
    type ProjectTask,
} from "../../../../types/project";
import styles from "./AdminProjectsTab.module.scss";

type OverviewFilter = "active" | "completed" | "archived";
type TaskStatusFilter = "all" | ProjectTask["status"];

const emptyTask = (): ProjectTask => ({
    _id: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title: "משימה חדשה",
    status: "לא התחילה",
    assignee: "",
    subtasks: [],
});

const normalizeProject = (project: ProjectAdmin): ProjectAdmin => ({
    ...project,
    tasks: project.tasks.map((task) => ({
        ...task,
        subtasks: task.subtasks.map((subtask) => {
            const status = subtask.status ?? (
                subtask.completed ? "הושלמה" : "לא התחילה"
            );

            return {
                ...subtask,
                status,
                completed: status === "הושלמה",
                assignee: subtask.assignee ?? "",
            };
        }),
    })),
});

const emptyProject = (): ProjectPayload => ({
    name: "",
    goal: "",
    tasks: [],
    archived: false,
});

const isCompleted = (project: ProjectAdmin) =>
    project.tasks.length > 0 &&
    project.tasks.every((task) => task.status === "הושלמה");

const getProgress = (project: ProjectAdmin) => {
    const completed = project.tasks.filter(
        (task) => task.status === "הושלמה"
    ).length;

    return {
        completed,
        percent: project.tasks.length
            ? Math.round((completed / project.tasks.length) * 100)
            : 0,
    };
};

const getAssigneeNames = (value: string) =>
    value
        .split(/[/,+،]+/)
        .map((name) => name.trim())
        .filter(Boolean);

const AdminProjectsTab = () => {
    const [projects, setProjects] = useState<ProjectAdmin[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [overviewFilter, setOverviewFilter] = useState<OverviewFilter>("active");
    const [expandedTaskIndex, setExpandedTaskIndex] = useState<number | null>(null);
    const [draggedTaskIndex, setDraggedTaskIndex] = useState<number | null>(null);
    const [dragOverTaskIndex, setDragOverTaskIndex] = useState<number | null>(null);
    const [taskSearch, setTaskSearch] = useState("");
    const [taskStatusFilter, setTaskStatusFilter] = useState<TaskStatusFilter>("all");
    const [taskAssigneeFilter, setTaskAssigneeFilter] = useState("all");
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [dirtyProjectIds, setDirtyProjectIds] = useState<Set<string>>(
        () => new Set()
    );
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [projectPendingDeletion, setProjectPendingDeletion] = useState<ProjectAdmin | null>(null);
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors: formErrors, isSubmitting },
    } = useForm<ProjectPayload>({ defaultValues: emptyProject(), mode: "onBlur" });

    useEffect(() => {
        const loadProjects = async () => {
            try {
                const loadedProjects = await getProjects();
                setProjects(loadedProjects.map(normalizeProject));
            } catch {
                setError("לא הצלחנו לטעון את הפרויקטים. אפשר לנסות לרענן את העמוד.");
            } finally {
                setLoading(false);
            }
        };

        loadProjects();
    }, []);

    const activeProjects = useMemo(
        () => projects.filter((project) => !project.archived && !isCompleted(project)),
        [projects]
    );
    const completedProjects = useMemo(
        () => projects.filter((project) => !project.archived && isCompleted(project)),
        [projects]
    );
    const archivedProjects = useMemo(
        () => projects.filter((project) => project.archived),
        [projects]
    );
    const selectedProject = projects.find(
        (project) => project._id === selectedProjectId
    );
    const visibleProjects =
        overviewFilter === "active"
            ? activeProjects
            : overviewFilter === "completed"
              ? completedProjects
              : archivedProjects;
    const tabProjects = projects.filter((project) => !project.archived);
    const navigationProjects =
        selectedProject?.archived &&
        !tabProjects.some((project) => project._id === selectedProject._id)
            ? [selectedProject, ...tabProjects]
            : tabProjects;
    const assigneeOptions = selectedProject
        ? Array.from(new Set(
            selectedProject.tasks.flatMap((task) => [
                ...getAssigneeNames(task.assignee),
                ...task.subtasks.flatMap((subtask) =>
                    getAssigneeNames(subtask.assignee)
                ),
            ])
        )).sort((left, right) => left.localeCompare(right, "he"))
        : [];
    const hasTaskFilters =
        taskSearch.trim() !== "" ||
        taskStatusFilter !== "all" ||
        taskAssigneeFilter !== "all";
    const query = taskSearch.trim().toLocaleLowerCase("he");
    const filteredTaskEntries = selectedProject
        ? selectedProject.tasks
            .map((task, originalIndex) => ({ task, originalIndex }))
            .filter(({ task }) => {
                const searchableText = [
                    task.title,
                    task.assignee,
                    ...task.subtasks.flatMap((subtask) => [
                        subtask.title,
                        subtask.assignee,
                    ]),
                ].join(" ").toLocaleLowerCase("he");
                const matchesSearch = !query || searchableText.includes(query);
                const matchesStatus =
                    taskStatusFilter === "all" || task.status === taskStatusFilter;
                const matchesAssignee =
                    taskAssigneeFilter === "all" ||
                    getAssigneeNames(task.assignee).includes(taskAssigneeFilter) ||
                    task.subtasks.some(
                        (subtask) => getAssigneeNames(subtask.assignee).includes(taskAssigneeFilter)
                    );
                return matchesSearch && matchesStatus && matchesAssignee;
            })
        : [];

    const clearTaskFilters = () => {
        setTaskSearch("");
        setTaskStatusFilter("all");
        setTaskAssigneeFilter("all");
    };

    const showOverview = (filter: OverviewFilter = overviewFilter) => {
        setSelectedProjectId(null);
        setOverviewFilter(filter);
        setExpandedTaskIndex(null);
        clearTaskFilters();
    };

    const openProject = (projectId: string) => {
        setSelectedProjectId(projectId);
        setExpandedTaskIndex(null);
        clearTaskFilters();
        setNotice("");
        setError("");
    };

    const submitProject: SubmitHandler<ProjectPayload> = async (draft) => {
        setError("");
        setNotice("");
        try {
            const project = await createProject(draft);
            setProjects((current) => [project, ...current]);
            reset(emptyProject());
            setShowForm(false);
            setSelectedProjectId(project._id);
            setNotice("הפרויקט נוצר. עכשיו אפשר להוסיף לו משימות.");
        } catch {
            setError("לא הצלחנו ליצור את הפרויקט. כדאי לנסות שוב.");
        }
    };

    const changeProject = (nextProject: ProjectAdmin) => {
        setProjects((current) =>
            current.map((project) =>
                project._id === nextProject._id ? nextProject : project
            )
        );
        setDirtyProjectIds((current) => {
            const next = new Set(current);
            next.add(nextProject._id);
            return next;
        });
    };

    const persistProject = async (
        project: ProjectAdmin,
        successMessage = `השינויים בפרויקט „${project.name}” נשמרו.`
    ) => {
        setSavingId(project._id);
        setError("");
        setNotice("");
        try {
            const updated = await updateProject(project._id, {
                name: project.name,
                goal: project.goal,
                tasks: project.tasks,
                archived: project.archived,
            });
            setProjects((current) =>
                current.map((item) => item._id === updated._id ? updated : item)
            );
            setDirtyProjectIds((current) => {
                const next = new Set(current);
                next.delete(updated._id);
                return next;
            });
            setNotice(successMessage);
            return updated;
        } catch {
            setError("לא הצלחנו לשמור את השינויים בפרויקט.");
            return null;
        } finally {
            setSavingId(null);
        }
    };

    const toggleArchive = async (project: ProjectAdmin) => {
        const archived = !project.archived;
        const updated = await persistProject(
            { ...project, archived },
            archived ? "הפרויקט הועבר לארכיון." : "הפרויקט הוחזר לרשימה."
        );

        if (updated) {
            showOverview(archived ? "archived" : isCompleted(updated) ? "completed" : "active");
        }
    };

    const removeProject = async (project: ProjectAdmin) => {
        setProjectPendingDeletion(null);
        setError("");
        try {
            await deleteProject(project._id);
            setProjects((current) => current.filter((item) => item._id !== project._id));
            setDirtyProjectIds((current) => {
                const next = new Set(current);
                next.delete(project._id);
                return next;
            });
            showOverview("active");
            setNotice("הפרויקט נמחק.");
        } catch {
            setError("לא הצלחנו למחוק את הפרויקט.");
        }
    };

    const changeTask = (
        project: ProjectAdmin,
        taskIndex: number,
        nextTask: ProjectTask
    ) => {
        changeProject({
            ...project,
            tasks: project.tasks.map((task, index) =>
                index === taskIndex ? nextTask : task
            ),
        });
    };

    const addTask = (project: ProjectAdmin) => {
        clearTaskFilters();
        changeProject({ ...project, tasks: [...project.tasks, emptyTask()] });
        setExpandedTaskIndex(project.tasks.length);
    };

    const reorderTasks = (
        project: ProjectAdmin,
        sourceIndex: number,
        destinationIndex: number
    ) => {
        if (sourceIndex === destinationIndex) {
            return;
        }

        const tasks = [...project.tasks];
        const [movedTask] = tasks.splice(sourceIndex, 1);
        tasks.splice(destinationIndex, 0, movedTask);
        changeProject({ ...project, tasks });
        setExpandedTaskIndex((current) => {
            if (current === null) return null;
            if (current === sourceIndex) return destinationIndex;
            if (
                sourceIndex < destinationIndex &&
                current > sourceIndex &&
                current <= destinationIndex
            ) return current - 1;
            if (
                sourceIndex > destinationIndex &&
                current >= destinationIndex &&
                current < sourceIndex
            ) return current + 1;
            return current;
        });
    };

    const handleTaskDrop = (
        event: DragEvent<HTMLDivElement>,
        project: ProjectAdmin,
        destinationIndex: number
    ) => {
        event.preventDefault();
        if (draggedTaskIndex !== null) {
            reorderTasks(project, draggedTaskIndex, destinationIndex);
        }
        setDraggedTaskIndex(null);
        setDragOverTaskIndex(null);
    };

    if (loading) {
        return <div className={styles.loading}>טוען פרויקטים...</div>;
    }

    const selectedProgress = selectedProject
        ? getProgress(selectedProject)
        : null;
    const selectedProjectDirty = selectedProject
        ? dirtyProjectIds.has(selectedProject._id)
        : false;

    return (
        <section className={styles.section}>
            <div className={styles.sectionHeader}>
                <div>
                    <h2>ניהול פרויקטים</h2>
                    <p>רואים את התמונה הכללית ונכנסים רק לפרויקט שרוצים לטפל בו.</p>
                </div>
                <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={() => setShowForm((current) => !current)}
                >
                    {showForm ? "ביטול" : "+ פרויקט חדש"}
                </button>
            </div>

            {error && <div className={styles.error} role="alert">{error}</div>}
            {notice && <div className={styles.notice} role="status">{notice}</div>}

            {showForm && (
                <form className={styles.createCard} noValidate onSubmit={handleSubmit(submitProject)}>
                    <div className={styles.formHeading}>
                        <h3>פרויקט חדש</h3>
                        <span>מתחילים בשם וביעד; את המשימות מוסיפים במסך הבא.</span>
                    </div>
                    <div className={styles.mainFields}>
                        <label>
                            <span>שם הפרויקט *</span>
                            <input
                                {...register("name", {
                                    required: "יש להזין שם לפרויקט",
                                    validate: (value) => value.trim().length > 0 || "יש להזין שם לפרויקט",
                                })}
                                placeholder="לדוגמה: אירוע ל״ג בעומר"
                                maxLength={160}
                                autoFocus
                            />
                            <span className={styles.fieldError}>{formErrors.name?.message || ""}</span>
                        </label>
                        <label>
                            <span>מה היעד? *</span>
                            <textarea
                                {...register("goal", {
                                    required: "יש להזין יעד לפרויקט",
                                    validate: (value) => value.trim().length > 0 || "יש להזין יעד לפרויקט",
                                })}
                                placeholder="מה רוצים להשיג ואיך נדע שהצלחנו?"
                                maxLength={2000}
                                rows={2}
                            />
                            <span className={styles.fieldError}>{formErrors.goal?.message || ""}</span>
                        </label>
                    </div>
                    <button className={styles.submitButton} disabled={isSubmitting}>
                        {isSubmitting ? "יוצר..." : "יצירת הפרויקט והמשך למשימות"}
                    </button>
                </form>
            )}

            {projects.length > 0 && (
                <>
                    <nav className={styles.projectTabs} aria-label="בחירת פרויקט">
                        <button
                            type="button"
                            className={!selectedProject ? styles.projectTabActive : styles.projectTab}
                            onClick={() => showOverview()}
                        >
                            סקירה כללית
                        </button>
                        {navigationProjects.map((project) => (
                            <button
                                type="button"
                                key={project._id}
                                className={selectedProjectId === project._id ? styles.projectTabActive : styles.projectTab}
                                onClick={() => openProject(project._id)}
                            >
                                <span className={isCompleted(project) ? styles.doneDot : styles.activeDot} />
                                {project.name}
                            </button>
                        ))}
                    </nav>
                    <label className={styles.mobileProjectPicker}>
                        <span>מה רוצים לראות?</span>
                        <select
                            value={selectedProjectId ?? "overview"}
                            onChange={(event) => event.target.value === "overview" ? showOverview() : openProject(event.target.value)}
                        >
                            <option value="overview">סקירה כללית</option>
                            {navigationProjects.map((project) => (
                                <option value={project._id} key={project._id}>{project.name}</option>
                            ))}
                        </select>
                    </label>
                </>
            )}

            {!selectedProject ? (
                <div className={styles.overview}>
                    <div className={styles.summaryCards}>
                        <button type="button" className={overviewFilter === "active" ? styles.summaryActive : styles.summaryCard} onClick={() => setOverviewFilter("active")}>
                            <strong>{activeProjects.length}</strong><span>פרויקטים פעילים</span>
                        </button>
                        <button type="button" className={overviewFilter === "completed" ? styles.summaryActive : styles.summaryCard} onClick={() => setOverviewFilter("completed")}>
                            <strong>{completedProjects.length}</strong><span>פרויקטים שהושלמו</span>
                        </button>
                        <button type="button" className={overviewFilter === "archived" ? styles.summaryActive : styles.summaryCard} onClick={() => setOverviewFilter("archived")}>
                            <strong>{archivedProjects.length}</strong><span>בארכיון</span>
                        </button>
                    </div>

                    {visibleProjects.length === 0 ? (
                        <div className={styles.empty}>
                            <strong>{projects.length === 0 ? "עדיין אין פרויקטים" : "אין פרויקטים בקבוצה הזו"}</strong>
                            <span>{projects.length === 0 ? "לחצו על „פרויקט חדש” כדי להתחיל." : "אפשר לבחור קבוצה אחרת בסקירה."}</span>
                        </div>
                    ) : (
                        <div className={styles.overviewList}>
                            {visibleProjects.map((project) => {
                                const progress = getProgress(project);
                                return (
                                    <button type="button" className={styles.overviewProject} key={project._id} onClick={() => openProject(project._id)}>
                                        <div className={styles.overviewProjectMain}>
                                            <strong>{project.name}</strong>
                                            <span>{project.goal}</span>
                                        </div>
                                        <div className={styles.overviewProgress}>
                                            <strong>{progress.percent}%</strong>
                                            <span>{progress.completed}/{project.tasks.length} משימות</span>
                                        </div>
                                        <span className={styles.openHint}>פתיחה ←</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : (
                <article className={styles.projectCard}>
                    {isCompleted(selectedProject) && !selectedProject.archived && (
                        <div className={styles.completedBanner}>
                            <div><strong>הפרויקט הושלם 🎉</strong><span>כל המשימות סומנו כהושלמו.</span></div>
                            <button type="button" onClick={() => toggleArchive(selectedProject)}>העברה לארכיון</button>
                        </div>
                    )}
                    {selectedProject.archived && (
                        <div className={styles.archivedBanner}>
                            <span>הפרויקט נמצא בארכיון</span>
                            <button type="button" onClick={() => toggleArchive(selectedProject)}>החזרה לפרויקטים</button>
                        </div>
                    )}

                    <div className={styles.projectHeader}>
                        <div>
                            <label className={styles.inlineLabel}>שם הפרויקט</label>
                            <input className={styles.projectName} value={selectedProject.name} onChange={(event) => changeProject({ ...selectedProject, name: event.target.value })} />
                            <label className={styles.inlineLabel}>היעד</label>
                            <textarea className={styles.projectGoal} value={selectedProject.goal} rows={2} onChange={(event) => changeProject({ ...selectedProject, goal: event.target.value })} />
                        </div>
                        <div className={styles.progressBox}>
                            <strong>{selectedProgress?.percent}%</strong>
                            <span>{selectedProgress?.completed} מתוך {selectedProject.tasks.length} משימות</span>
                        </div>
                    </div>
                    <div className={styles.progressTrack}><span style={{ width: `${selectedProgress?.percent ?? 0}%` }} /></div>

                    <div className={styles.tasksHeading}>
                        <div><h3>משימות</h3><span>מחפשים, מסננים ופותחים רק את המשימה שרוצים לערוך</span></div>
                        <button type="button" className={styles.secondaryButton} onClick={() => addTask(selectedProject)}>+ משימה</button>
                    </div>

                    {selectedProject.tasks.length > 0 && (
                        <div className={styles.taskFilters}>
                            <label className={styles.searchFilter}>
                                <span>חיפוש</span>
                                <input
                                    type="search"
                                    value={taskSearch}
                                    placeholder="שם משימה, תת־משימה או אחראי..."
                                    onChange={(event) => setTaskSearch(event.target.value)}
                                />
                            </label>
                            <label>
                                <span>סטטוס משימה</span>
                                <select value={taskStatusFilter} onChange={(event) => setTaskStatusFilter(event.target.value as TaskStatusFilter)}>
                                    <option value="all">כל הסטטוסים</option>
                                    {PROJECT_TASK_STATUSES.map((status) => <option value={status} key={status}>{status}</option>)}
                                </select>
                            </label>
                            <label>
                                <span>מי מטפל?</span>
                                <select value={taskAssigneeFilter} onChange={(event) => setTaskAssigneeFilter(event.target.value)}>
                                    <option value="all">כל האחראים</option>
                                    {assigneeOptions.map((assignee) => <option value={assignee} key={assignee}>{assignee}</option>)}
                                </select>
                            </label>
                            {hasTaskFilters && <button type="button" className={styles.clearFilters} onClick={clearTaskFilters}>ניקוי סינון</button>}
                        </div>
                    )}

                    {selectedProject.tasks.length > 0 && (
                        <div className={styles.filterResults} aria-live="polite">
                            <span>מוצגות {filteredTaskEntries.length} מתוך {selectedProject.tasks.length} משימות</span>
                            {hasTaskFilters && <span>כדי לשנות את סדר המשימות יש לנקות את הסינון.</span>}
                        </div>
                    )}

                    {selectedProject.tasks.length === 0 ? (
                        <div className={styles.noTasks}>עדיין אין משימות בפרויקט. לחצו על „+ משימה” כדי להתחיל.</div>
                    ) : filteredTaskEntries.length === 0 ? (
                        <div className={styles.noFilterResults}>
                            <strong>לא נמצאו משימות מתאימות</strong>
                            <span>אפשר לשנות את החיפוש או לנקות את הסינון.</span>
                            <button type="button" onClick={clearTaskFilters}>ניקוי הסינון</button>
                        </div>
                    ) : (
                        <div className={styles.savedTasks}>
                            {filteredTaskEntries.map(({ task, originalIndex: taskIndex }) => {
                                const isExpanded = expandedTaskIndex === taskIndex;
                                const completedSubtasks = task.subtasks.filter((subtask) => subtask.completed).length;
                                return (
                                    <div
                                        className={`${isExpanded ? styles.savedTaskExpanded : styles.savedTask} ${draggedTaskIndex === taskIndex ? styles.taskDragging : ""} ${dragOverTaskIndex === taskIndex && draggedTaskIndex !== taskIndex ? styles.taskDragTarget : ""}`}
                                        key={task._id ?? taskIndex}
                                        onDragOver={(event) => {
                                            event.preventDefault();
                                            setDragOverTaskIndex(taskIndex);
                                        }}
                                        onDragLeave={() => setDragOverTaskIndex((current) => current === taskIndex ? null : current)}
                                        onDrop={(event) => handleTaskDrop(event, selectedProject, taskIndex)}
                                    >
                                        <div className={styles.taskSummaryRow}>
                                            <button
                                                type="button"
                                                className={styles.dragHandle}
                                                draggable={!hasTaskFilters}
                                                disabled={hasTaskFilters}
                                                title={hasTaskFilters ? "יש לנקות את הסינון לפני שינוי הסדר" : "גרירת המשימה למיקום אחר"}
                                                aria-label={`גרירת המשימה ${task.title}`}
                                                onDragStart={(event) => {
                                                    setDraggedTaskIndex(taskIndex);
                                                    event.dataTransfer.effectAllowed = "move";
                                                    event.dataTransfer.setData("text/plain", String(taskIndex));
                                                }}
                                                onDragEnd={() => {
                                                    setDraggedTaskIndex(null);
                                                    setDragOverTaskIndex(null);
                                                }}
                                            >
                                                ⋮⋮
                                            </button>
                                            <button type="button" className={styles.taskSummary} onClick={() => setExpandedTaskIndex(isExpanded ? null : taskIndex)} aria-expanded={isExpanded}>
                                                <span className={styles.chevron}>{isExpanded ? "−" : "+"}</span>
                                                <strong>{task.title || "משימה ללא שם"}</strong>
                                                <span className={styles.statusPill} data-status={task.status}>{task.status}</span>
                                                <span className={styles.assignee}>{task.assignee || "ללא אחראי"}</span>
                                                <span className={styles.subtaskCount}>{completedSubtasks}/{task.subtasks.length} תתי־משימות</span>
                                            </button>
                                            <div className={styles.orderButtons} aria-label="שינוי סדר המשימה">
                                                <button type="button" disabled={hasTaskFilters || taskIndex === 0} aria-label="העברת המשימה למעלה" title={hasTaskFilters ? "יש לנקות את הסינון לפני שינוי הסדר" : "העברה למעלה"} onClick={() => reorderTasks(selectedProject, taskIndex, taskIndex - 1)}>↑</button>
                                                <button type="button" disabled={hasTaskFilters || taskIndex === selectedProject.tasks.length - 1} aria-label="העברת המשימה למטה" title={hasTaskFilters ? "יש לנקות את הסינון לפני שינוי הסדר" : "העברה למטה"} onClick={() => reorderTasks(selectedProject, taskIndex, taskIndex + 1)}>↓</button>
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className={styles.taskDetails}>
                                                <div className={styles.taskGrid}>
                                                    <label><span>שם המשימה</span><input value={task.title} onChange={(event) => changeTask(selectedProject, taskIndex, { ...task, title: event.target.value })} /></label>
                                                    <label><span>סטטוס</span><select value={task.status} onChange={(event) => changeTask(selectedProject, taskIndex, { ...task, status: event.target.value as ProjectTask["status"] })}>{PROJECT_TASK_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
                                                    <label><span>מי מטפל?</span><input value={task.assignee} placeholder="שם האחראי/ת" onChange={(event) => changeTask(selectedProject, taskIndex, { ...task, assignee: event.target.value })} /></label>
                                                </div>
                                                <div className={styles.subtasks}>
                                                    {task.subtasks.length > 0 && (
                                                        <div className={styles.subtaskColumnsHeader} aria-hidden="true">
                                                            <span>תת־משימה</span>
                                                            <span>סטטוס</span>
                                                            <span>מי מטפל?</span>
                                                            <span />
                                                        </div>
                                                    )}
                                                    {task.subtasks.map((subtask, subtaskIndex) => (
                                                        <div className={styles.savedSubtask} key={subtask._id ?? subtaskIndex}>
                                                            <input aria-label="שם תת־המשימה" value={subtask.title} className={subtask.completed ? styles.completedText : ""} onChange={(event) => changeTask(selectedProject, taskIndex, { ...task, subtasks: task.subtasks.map((item, index) => index === subtaskIndex ? { ...item, title: event.target.value } : item) })} />
                                                            <select aria-label={`סטטוס תת־המשימה ${subtask.title}`} value={subtask.status} onChange={(event) => {
                                                                const status = event.target.value as ProjectTask["status"];
                                                                changeTask(selectedProject, taskIndex, { ...task, subtasks: task.subtasks.map((item, index) => index === subtaskIndex ? { ...item, status, completed: status === "הושלמה" } : item) });
                                                            }}>
                                                                {PROJECT_TASK_STATUSES.map((status) => <option key={status}>{status}</option>)}
                                                            </select>
                                                            <input aria-label={`מי מטפל בתת־המשימה ${subtask.title}`} value={subtask.assignee} placeholder="מי מטפל?" onChange={(event) => changeTask(selectedProject, taskIndex, { ...task, subtasks: task.subtasks.map((item, index) => index === subtaskIndex ? { ...item, assignee: event.target.value } : item) })} />
                                                            <button type="button" aria-label="מחיקת תת־משימה" onClick={() => changeTask(selectedProject, taskIndex, { ...task, subtasks: task.subtasks.filter((_, index) => index !== subtaskIndex) })}>×</button>
                                                        </div>
                                                    ))}
                                                    <button type="button" className={styles.addSubtask} onClick={() => changeTask(selectedProject, taskIndex, { ...task, subtasks: [...task.subtasks, { title: "תת־משימה חדשה", completed: false, status: "לא התחילה", assignee: "" }] })}>+ הוספת תת־משימה</button>
                                                </div>
                                                <button type="button" className={styles.removeTask} onClick={() => { changeProject({ ...selectedProject, tasks: selectedProject.tasks.filter((_, index) => index !== taskIndex) }); setExpandedTaskIndex(null); }}>מחיקת המשימה</button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <button type="button" className={styles.bottomAddTask} onClick={() => addTask(selectedProject)}>+ הוספת משימה נוספת</button>

                    <div className={styles.projectActions}>
                        <button type="button" className={styles.deleteButton} onClick={() => setProjectPendingDeletion(selectedProject)}>מחיקת פרויקט</button>
                        <div>
                            {selectedProjectDirty && <span className={styles.unsavedNotice}>יש שינויים שלא נשמרו</span>}
                            {!selectedProject.archived && !isCompleted(selectedProject) && <button type="button" className={styles.archiveButton} onClick={() => toggleArchive(selectedProject)}>העברה לארכיון</button>}
                            <button type="button" className={styles.primaryButton} disabled={savingId === selectedProject._id || !selectedProjectDirty} onClick={() => persistProject(selectedProject)}>{savingId === selectedProject._id ? "שומר..." : selectedProjectDirty ? "שמירת שינויים" : "הכול שמור"}</button>
                        </div>
                    </div>
                </article>
            )}

            <ConfirmDialog
                open={projectPendingDeletion !== null}
                title="מחיקת פרויקט"
                message={projectPendingDeletion
                    ? `למחוק את הפרויקט „${projectPendingDeletion.name}” ואת כל המשימות שלו?`
                    : ""}
                confirmLabel="מחיקת הפרויקט"
                tone="danger"
                onConfirm={() => {
                    if (projectPendingDeletion) {
                        void removeProject(projectPendingDeletion);
                    }
                }}
                onClose={() => setProjectPendingDeletion(null)}
            />
        </section>
    );
};

export default AdminProjectsTab;
