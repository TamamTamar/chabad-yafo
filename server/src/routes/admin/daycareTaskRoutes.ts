import { Router } from "express";
import { requireAdmin } from "../../middleware/adminAuth";
import { DaycareTask } from "../../models/DaycareTask";
import { ensureDefaultTasks } from "./daycareAdminService";
import { getTaskStatusFromSubtasks, normalizeTaskStatusBySubtasks } from "./daycareTaskStatus";

const router = Router();

router.get("/daycare/tasks", requireAdmin, async (_req, res) => {
    try {
        await ensureDefaultTasks();
        const tasks = await DaycareTask.find().sort({ createdAt: 1 });

        return res.json({
            success: true,
            data: tasks,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to get daycare tasks",
        });
    }
});

router.post("/daycare/tasks", requireAdmin, async (req, res) => {
    try {
        const task = await DaycareTask.create(
            normalizeTaskStatusBySubtasks(req.body)
        );

        return res.status(201).json({
            success: true,
            data: task,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: "Failed to create daycare task",
        });
    }
});

router.patch(
    "/daycare/tasks/:id/subtasks/:subtaskIndex",
    requireAdmin,
    async (req, res) => {
        try {
            const subtaskIndex = Number(req.params.subtaskIndex);

            if (!Number.isInteger(subtaskIndex) || subtaskIndex < 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid subtask index",
                });
            }

            const task = await DaycareTask.findById(req.params.id);

            if (!task || !task.subtasks || !task.subtasks[subtaskIndex]) {
                return res.status(404).json({
                    success: false,
                    message: "Task or subtask not found",
                });
            }

            const updates = { ...req.body };

            if (updates.actualCost !== undefined) {
                updates.actualCost = Number(updates.actualCost) || 0;
            }

            Object.assign(task.subtasks[subtaskIndex], updates);
            task.status = getTaskStatusFromSubtasks(task.subtasks, task.status);
            task.markModified("subtasks");

            const savedTask = await task.save();

            return res.json({
                success: true,
                data: savedTask,
            });
        } catch (error) {
            console.error("Failed to update daycare subtask:", error);

            return res.status(400).json({
                success: false,
                message: "Failed to update daycare subtask",
            });
        }
    }
);

router.patch("/daycare/tasks/:id", requireAdmin, async (req, res) => {
    try {
        const existingTask = await DaycareTask.findById(req.params.id);

        if (!existingTask) {
            return res.status(404).json({
                success: false,
                message: "Task not found",
            });
        }

        const nextSubtasks = req.body.subtasks ?? existingTask.subtasks;
        const payload = normalizeTaskStatusBySubtasks(
            { ...req.body, subtasks: nextSubtasks },
            existingTask.status
        );

        const task = await DaycareTask.findByIdAndUpdate(req.params.id, payload, {
            new: true,
            runValidators: true,
        });

        return res.json({
            success: true,
            data: task,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: "Failed to update daycare task",
        });
    }
});

router.delete("/daycare/tasks/:id", requireAdmin, async (req, res) => {
    try {
        await DaycareTask.findByIdAndDelete(req.params.id);

        return res.json({
            success: true,
            data: { id: req.params.id },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to delete daycare task",
        });
    }
});

export { router as daycareTaskRoutes };
