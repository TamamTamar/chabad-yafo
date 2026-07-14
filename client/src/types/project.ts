export const PROJECT_TASK_STATUSES = [
    "לא התחילה",
    "בתהליך",
    "ממתינה",
    "הושלמה",
] as const;

export type ProjectTaskStatus = (typeof PROJECT_TASK_STATUSES)[number];

export interface ProjectSubtask {
    _id?: string;
    title: string;
    completed: boolean;
}

export interface ProjectTask {
    _id?: string;
    title: string;
    status: ProjectTaskStatus;
    assignee: string;
    subtasks: ProjectSubtask[];
}

export interface ProjectAdmin {
    _id: string;
    name: string;
    goal: string;
    tasks: ProjectTask[];
    archived: boolean;
    createdAt: string;
    updatedAt: string;
}

export type ProjectPayload = Pick<
    ProjectAdmin,
    "name" | "goal" | "tasks" | "archived"
>;
