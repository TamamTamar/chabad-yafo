import { Router } from "express";
import mongoose from "mongoose";
import { requireAdmin } from "../middleware/adminAuth";
import { Project } from "../models/Project";
import { projectTaskStatuses } from "../types/project";
import type { IProjectTask, ProjectTaskStatus } from "../types/project";

const router = Router();

router.use(requireAdmin);

const cleanText = (value: unknown) =>
    typeof value === "string" ? value.trim() : "";

const cleanTask = (value: unknown): IProjectTask | null => {
    if (!value || typeof value !== "object") {
        return null;
    }

    const task = value as Record<string, unknown>;
    const title = cleanText(task.title);
    const requestedStatus = cleanText(task.status) as ProjectTaskStatus;
    const status = projectTaskStatuses.includes(requestedStatus)
        ? requestedStatus
        : "לא התחילה";
    const subtasks = Array.isArray(task.subtasks)
        ? task.subtasks
              .map((subtask) => {
                  if (!subtask || typeof subtask !== "object") {
                      return null;
                  }

                  const item = subtask as Record<string, unknown>;
                  const subtaskTitle = cleanText(item.title);
                  const requestedSubtaskStatus = cleanText(
                      item.status
                  ) as ProjectTaskStatus;
                  const completed = Boolean(item.completed);
                  const subtaskStatus = projectTaskStatuses.includes(
                      requestedSubtaskStatus
                  )
                      ? requestedSubtaskStatus
                      : completed
                        ? "הושלמה"
                        : "לא התחילה";

                  return subtaskTitle
                      ? {
                            title: subtaskTitle,
                            completed: subtaskStatus === "הושלמה",
                            status: subtaskStatus,
                            assignee: cleanText(item.assignee),
                        }
                      : null;
              })
              .filter((subtask): subtask is NonNullable<typeof subtask> => Boolean(subtask))
        : [];

    return title
        ? { title, status, assignee: cleanText(task.assignee), subtasks }
        : null;
};

router.get("/", async (_req, res) => {
    try {
        const projects = await Project.find().sort({ updatedAt: -1 });

        return res.json({ success: true, data: projects });
    } catch {
        return res.status(500).json({
            success: false,
            message: "לא הצלחנו לטעון את הפרויקטים",
        });
    }
});

router.post("/", async (req, res) => {
    try {
        const name = cleanText(req.body.name);
        const goal = cleanText(req.body.goal);

        if (!name || !goal) {
            return res.status(400).json({
                success: false,
                message: "יש למלא שם פרויקט ויעד",
            });
        }

        const tasks = Array.isArray(req.body.tasks)
            ? req.body.tasks
                  .map((task: unknown) => cleanTask(task))
                  .filter(
                      (task: IProjectTask | null): task is IProjectTask =>
                          Boolean(task)
                  )
            : [];
        const project = await Project.create({ name, goal, tasks, archived: false });

        return res.status(201).json({ success: true, data: project });
    } catch {
        return res.status(500).json({
            success: false,
            message: "לא הצלחנו ליצור את הפרויקט",
        });
    }
});

router.patch("/:id", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: "מזהה פרויקט לא תקין" });
        }

        const name = cleanText(req.body.name);
        const goal = cleanText(req.body.goal);

        if (!name || !goal || !Array.isArray(req.body.tasks)) {
            return res.status(400).json({
                success: false,
                message: "נתוני הפרויקט אינם תקינים",
            });
        }

        const tasks = req.body.tasks
            .map(cleanTask)
            .filter((task: IProjectTask | null): task is IProjectTask => Boolean(task));
        const project = await Project.findByIdAndUpdate(
            req.params.id,
            { name, goal, tasks, archived: Boolean(req.body.archived) },
            { new: true, runValidators: true }
        );

        if (!project) {
            return res.status(404).json({ success: false, message: "הפרויקט לא נמצא" });
        }

        return res.json({ success: true, data: project });
    } catch {
        return res.status(500).json({
            success: false,
            message: "לא הצלחנו לעדכן את הפרויקט",
        });
    }
});

router.delete("/:id", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: "מזהה פרויקט לא תקין" });
        }

        const project = await Project.findByIdAndDelete(req.params.id);

        if (!project) {
            return res.status(404).json({ success: false, message: "הפרויקט לא נמצא" });
        }

        return res.json({ success: true, data: { id: req.params.id } });
    } catch {
        return res.status(500).json({
            success: false,
            message: "לא הצלחנו למחוק את הפרויקט",
        });
    }
});

export { router as projectRoutes };
