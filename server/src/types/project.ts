export const projectTaskStatuses = [
    "לא התחילה",
    "בתהליך",
    "ממתינה",
    "הושלמה",
] as const;

export type ProjectTaskStatus = (typeof projectTaskStatuses)[number];

export interface IProjectSubtask {
    title: string;
    completed: boolean;
}

export interface IProjectTask {
    title: string;
    status: ProjectTaskStatus;
    assignee: string;
    subtasks: IProjectSubtask[];
}

export interface IProject {
    name: string;
    goal: string;
    tasks: IProjectTask[];
    archived: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
