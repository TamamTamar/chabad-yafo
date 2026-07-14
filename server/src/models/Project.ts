import mongoose, { Schema } from "mongoose";
import type { IProject } from "../types/project";
import { projectTaskStatuses } from "../types/project";

const projectSubtaskSchema = new Schema(
    {
        title: { type: String, required: true, trim: true, maxlength: 200 },
        completed: { type: Boolean, default: false },
    },
    { _id: true }
);

const projectTaskSchema = new Schema(
    {
        title: { type: String, required: true, trim: true, maxlength: 200 },
        status: {
            type: String,
            enum: projectTaskStatuses,
            default: "לא התחילה",
        },
        assignee: { type: String, trim: true, maxlength: 120, default: "" },
        subtasks: { type: [projectSubtaskSchema], default: [] },
    },
    { _id: true }
);

const projectSchema = new Schema<IProject>(
    {
        name: { type: String, required: true, trim: true, maxlength: 160 },
        goal: { type: String, required: true, trim: true, maxlength: 2000 },
        tasks: { type: [projectTaskSchema], default: [] },
        archived: { type: Boolean, default: false },
    },
    { timestamps: true }
);

export const Project = mongoose.model<IProject>("Project", projectSchema);
