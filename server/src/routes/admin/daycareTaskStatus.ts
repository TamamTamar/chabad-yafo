import type { IDaycareTask } from "../../types/daycareAdmin";

export const createSubtasks = (titles: string[]) =>
    titles.map((title) => ({ title, completed: false }));

export const createFallbackSubtasks = (status: IDaycareTask["status"]) => {
    if (status === "הושלם") {
        return [{ title: "ביצוע המשימה", completed: true }];
    }

    if (status === "בטיפול") {
        return [
            { title: "התחלת טיפול", completed: true },
            { title: "סיום המשימה", completed: false },
        ];
    }

    return [{ title: "ביצוע המשימה", completed: false }];
};

export const getTaskStatusFromSubtasks = (
    subtasks: IDaycareTask["subtasks"],
    fallbackStatus: IDaycareTask["status"] = "לא התחיל"
): IDaycareTask["status"] => {
    if (!subtasks || subtasks.length === 0) {
        return fallbackStatus;
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

export const normalizeTaskStatusBySubtasks = (
    task: Partial<IDaycareTask>,
    fallbackStatus: IDaycareTask["status"] = "לא התחיל"
) => {
    const normalizedTask = { ...task };
    const statusForFallback = normalizedTask.status ?? fallbackStatus;

    if (!normalizedTask.subtasks || normalizedTask.subtasks.length === 0) {
        normalizedTask.subtasks = createFallbackSubtasks(statusForFallback);
    }

    normalizedTask.status = getTaskStatusFromSubtasks(
        normalizedTask.subtasks,
        statusForFallback
    );

    return normalizedTask;
};
