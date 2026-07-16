import { useEffect, useMemo, useState } from "react";
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

const emptyTask = (): ProjectTask => ({
    title: "משימה חדשה",
    status: "לא התחילה",
    assignee: "",
    subtasks: [],
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

const AdminProjectsTab = () => {
    const [projects, setProjects] = useState<ProjectAdmin[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [overviewFilter, setOverviewFilter] = useState<OverviewFilter>("active");
    const [expandedTaskIndex, setExpandedTaskIndex] = useState<number | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<string | null>(null);
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
                setProjects(await getProjects());
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

    const showOverview = (filter: OverviewFilter = overviewFilter) => {
        setSelectedProjectId(null);
        setOverviewFilter(filter);
        setExpandedTaskIndex(null);
    };

    const openProject = (projectId: string) => {
        setSelectedProjectId(projectId);
        setExpandedTaskIndex(null);
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
            changeProject(updated);
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
        changeProject({ ...project, tasks: [...project.tasks, emptyTask()] });
        setExpandedTaskIndex(project.tasks.length);
    };

    if (loading) {
        return <div className={styles.loading}>טוען פרויקטים...</div>;
    }

    const selectedProgress = selectedProject
        ? getProgress(selectedProject)
        : null;

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
                            {formErrors.name ? <span className={styles.error}>{formErrors.name.message}</span> : null}
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
                            {formErrors.goal ? <span className={styles.error}>{formErrors.goal.message}</span> : null}
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
                        <div><h3>משימות</h3><span>פותחים רק את המשימה שרוצים לערוך</span></div>
                        <button type="button" className={styles.secondaryButton} onClick={() => addTask(selectedProject)}>+ משימה</button>
                    </div>

                    {selectedProject.tasks.length === 0 ? (
                        <div className={styles.noTasks}>עדיין אין משימות בפרויקט. לחצו על „+ משימה” כדי להתחיל.</div>
                    ) : (
                        <div className={styles.savedTasks}>
                            {selectedProject.tasks.map((task, taskIndex) => {
                                const isExpanded = expandedTaskIndex === taskIndex;
                                const completedSubtasks = task.subtasks.filter((subtask) => subtask.completed).length;
                                return (
                                    <div className={isExpanded ? styles.savedTaskExpanded : styles.savedTask} key={task._id ?? taskIndex}>
                                        <button type="button" className={styles.taskSummary} onClick={() => setExpandedTaskIndex(isExpanded ? null : taskIndex)} aria-expanded={isExpanded}>
                                            <span className={styles.chevron}>{isExpanded ? "−" : "+"}</span>
                                            <strong>{task.title || "משימה ללא שם"}</strong>
                                            <span className={styles.statusPill} data-status={task.status}>{task.status}</span>
                                            <span className={styles.assignee}>{task.assignee || "ללא אחראי"}</span>
                                            <span className={styles.subtaskCount}>{completedSubtasks}/{task.subtasks.length} תתי־משימות</span>
                                        </button>

                                        {isExpanded && (
                                            <div className={styles.taskDetails}>
                                                <div className={styles.taskGrid}>
                                                    <label><span>שם המשימה</span><input value={task.title} onChange={(event) => changeTask(selectedProject, taskIndex, { ...task, title: event.target.value })} /></label>
                                                    <label><span>סטטוס</span><select value={task.status} onChange={(event) => changeTask(selectedProject, taskIndex, { ...task, status: event.target.value as ProjectTask["status"] })}>{PROJECT_TASK_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
                                                    <label><span>מי מטפל?</span><input value={task.assignee} placeholder="שם האחראי/ת" onChange={(event) => changeTask(selectedProject, taskIndex, { ...task, assignee: event.target.value })} /></label>
                                                </div>
                                                <div className={styles.subtasks}>
                                                    {task.subtasks.map((subtask, subtaskIndex) => (
                                                        <div className={styles.savedSubtask} key={subtask._id ?? subtaskIndex}>
                                                            <input type="checkbox" checked={subtask.completed} aria-label={`סימון ${subtask.title} כהושלמה`} onChange={(event) => changeTask(selectedProject, taskIndex, { ...task, subtasks: task.subtasks.map((item, index) => index === subtaskIndex ? { ...item, completed: event.target.checked } : item) })} />
                                                            <input value={subtask.title} className={subtask.completed ? styles.completedText : ""} onChange={(event) => changeTask(selectedProject, taskIndex, { ...task, subtasks: task.subtasks.map((item, index) => index === subtaskIndex ? { ...item, title: event.target.value } : item) })} />
                                                            <button type="button" aria-label="מחיקת תת־משימה" onClick={() => changeTask(selectedProject, taskIndex, { ...task, subtasks: task.subtasks.filter((_, index) => index !== subtaskIndex) })}>×</button>
                                                        </div>
                                                    ))}
                                                    <button type="button" className={styles.addSubtask} onClick={() => changeTask(selectedProject, taskIndex, { ...task, subtasks: [...task.subtasks, { title: "תת־משימה חדשה", completed: false }] })}>+ הוספת תת־משימה</button>
                                                </div>
                                                <button type="button" className={styles.removeTask} onClick={() => { changeProject({ ...selectedProject, tasks: selectedProject.tasks.filter((_, index) => index !== taskIndex) }); setExpandedTaskIndex(null); }}>מחיקת המשימה</button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className={styles.projectActions}>
                        <button type="button" className={styles.deleteButton} onClick={() => setProjectPendingDeletion(selectedProject)}>מחיקת פרויקט</button>
                        <div>
                            {!selectedProject.archived && !isCompleted(selectedProject) && <button type="button" className={styles.archiveButton} onClick={() => toggleArchive(selectedProject)}>העברה לארכיון</button>}
                            <button type="button" className={styles.primaryButton} disabled={savingId === selectedProject._id} onClick={() => persistProject(selectedProject)}>{savingId === selectedProject._id ? "שומר..." : "שמירת שינויים"}</button>
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
