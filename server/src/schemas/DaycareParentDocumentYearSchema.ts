import { Schema } from "mongoose";
import type { IDaycareParentDocumentYear } from "../types/daycareParentDocuments";

const routineItemSchema = new Schema({ time: { type: String, required: true, maxlength: 40 }, activity: { type: String, required: true, maxlength: 500 } }, { _id: false });
const holidayItemSchema = new Schema({ occasion: { type: String, required: true, maxlength: 300 }, hebrewDate: { type: String, required: true, maxlength: 200 }, vacationDates: { type: String, required: true, maxlength: 300 } }, { _id: false });
const menuItemSchema = new Schema({
    day: { type: String, maxlength: 200 },
    breakfast: { type: String, maxlength: 1000 },
    lunch: { type: String, maxlength: 1000 },
    afternoon: { type: String, maxlength: 1000 },
    // Kept temporarily so previously stored menu rows can be normalized on read.
    meal: { type: String, maxlength: 200 },
    description: { type: String, maxlength: 1000 },
}, { _id: false });
const welcomeSchema = new Schema({
    key: { type: String, enum: ["welcome"], required: true },
    title: { type: String, required: true, maxlength: 200 },
    subtitle: { type: String, required: true, maxlength: 300 },
    filename: { type: String, required: true },
    intro: { type: [String], default: [] },
    hours: {
        weekdays: { type: String, required: true, maxlength: 200 },
        friday: { type: String, required: true, maxlength: 200 },
        address: { type: String, required: true, maxlength: 300 },
    },
    day: { type: [String], default: [] },
    parents: { type: [String], default: [] },
    join: { type: [String], default: [] },
    contactName: { type: String, required: true, maxlength: 120 },
    contactPhone: { type: String, required: true, maxlength: 40 },
}, { _id: false });
const routineSchema = new Schema({ key: { type: String, enum: ["routine"], required: true }, title: { type: String, required: true, maxlength: 200 }, subtitle: { type: String, required: true, maxlength: 300 }, filename: { type: String, required: true }, items: { type: [routineItemSchema], default: [] }, note: { type: String, required: true, maxlength: 1000 } }, { _id: false });
const holidaysSchema = new Schema({ key: { type: String, enum: ["holidays"], required: true }, title: { type: String, required: true, maxlength: 200 }, subtitle: { type: String, required: true, maxlength: 300 }, filename: { type: String, required: true }, items: { type: [holidayItemSchema], default: [] }, clarifications: { type: [String], default: [] } }, { _id: false });
const menuSchema = new Schema({ key: { type: String, enum: ["menu"], required: true }, title: { type: String, required: true, maxlength: 200 }, subtitle: { type: String, required: true, maxlength: 300 }, filename: { type: String, required: true }, items: { type: [menuItemSchema], default: [] }, note: { type: String, maxlength: 1000 } }, { _id: false });
const equipmentSchema = new Schema({ key: { type: String, enum: ["equipment"], required: true }, title: { type: String, required: true, maxlength: 200 }, subtitle: { type: String, required: true, maxlength: 300 }, filename: { type: String, required: true }, items: { type: [String], default: [] }, important: { type: String, required: true, maxlength: 1000 }, note: { type: String, required: true, maxlength: 2000 } }, { _id: false });

export const daycareParentDocumentYearSchema = new Schema<IDaycareParentDocumentYear>({
    schoolYear: { type: String, required: true, unique: true, immutable: true, match: /^\d{4}-\d{4}$/ },
    version: { type: String, required: true, maxlength: 60, immutable: true },
    documents: {
        welcome: { type: welcomeSchema, required: true },
        routine: { type: routineSchema, required: true },
        holidays: { type: holidaysSchema, required: true },
        menu: { type: menuSchema, required: true },
        equipment: { type: equipmentSchema, required: true },
    },
    sharedDocumentKeys: {
        type: [String],
        enum: ["welcome", "routine", "holidays", "menu", "equipment"],
        default: ["routine", "holidays", "menu"],
    },
    lockedAt: Date,
    lockedByAgreementId: { type: Schema.Types.ObjectId, ref: "DaycareAgreement" },
}, { timestamps: true });
