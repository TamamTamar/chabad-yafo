import mongoose, { Schema } from "mongoose";
import type { DaycareAnnualPlanDocument } from "../config/daycareAnnualPlan";

export interface IDaycareAnnualPlan extends DaycareAnnualPlanDocument {
    schoolYear: string;
    sharedWithParents: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const itemSchema = new Schema({
    month: { type: String, required: true, maxlength: 40 },
    dateRange: { type: String, required: true, maxlength: 80 },
    topic: { type: String, required: true, maxlength: 500 },
    specialEvent: { type: String, maxlength: 300 },
}, { _id: false });
const vacationSchema = new Schema({ name: { type: String, required: true, maxlength: 200 }, startDate: { type: String, required: true, maxlength: 10 }, endDate: { type: String, required: true, maxlength: 10 } }, { _id: false });
const anchorSchema = new Schema({ name: { type: String, required: true, maxlength: 200 }, date: { type: String, required: true, maxlength: 10 }, topics: { type: [String], default: [] } }, { _id: false });
const specialEventSchema = new Schema({ name: { type: String, required: true, maxlength: 200 }, date: { type: String, required: true, maxlength: 10 } }, { _id: false });

const schema = new Schema<IDaycareAnnualPlan>({
    schoolYear: { type: String, required: true, unique: true, immutable: true, match: /^\d{4}-\d{4}$/ },
    key: { type: String, enum: ["annualPlan"], default: "annualPlan", required: true },
    title: { type: String, required: true, maxlength: 200 },
    schoolYearLabel: { type: String, required: true, maxlength: 120 },
    startDate: { type: String, required: true, maxlength: 80 },
    endDate: { type: String, required: true, maxlength: 80 },
    filename: { type: String, required: true },
    calendar: {
        vacations: { type: [vacationSchema], default: [] },
        anchors: { type: [anchorSchema], default: [] },
        specialEvents: { type: [specialEventSchema], default: [] },
    },
    items: { type: [itemSchema], default: [] },
    sharedWithParents: { type: Boolean, default: false },
}, { timestamps: true });

export const DaycareAnnualPlan = mongoose.model<IDaycareAnnualPlan>("DaycareAnnualPlan", schema);
