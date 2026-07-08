import { Schema } from "mongoose";

const taskCategories = [
    "תכנון",
    "שיפוץ",
    "בטיחות",
    "אישורים",
    "כוח אדם",
    "ציוד",
    "שיווק",
    "הרשמות",
];

export const daycareTaskSchema = new Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        category: {
            type: String,
            required: true,
            enum: taskCategories,
        },
        status: {
            type: String,
            required: true,
            enum: ["לא התחיל", "בטיפול", "הושלם"],
            default: "לא התחיל",
        },
        priority: {
            type: String,
            required: true,
            enum: ["נמוכה", "רגילה", "דחופה"],
            default: "רגילה",
        },
        stage: {
            type: String,
            enum: ["עכשיו", "השבוע", "לפני פתיחה", "אחרי פתיחה", "התרחבות"],
            default: "לפני פתיחה",
        },
        subtasks: [
            {
                title: {
                    type: String,
                    required: true,
                    trim: true,
                },
                completed: {
                    type: Boolean,
                    default: false,
                },
                exists: {
                    type: Boolean,
                    default: false,
                },
                donated: {
                    type: Boolean,
                    default: false,
                },
                ordered: {
                    type: Boolean,
                    default: false,
                },
                installed: {
                    type: Boolean,
                    default: false,
                },
                actualCost: {
                    type: Number,
                    default: 0,
                    min: 0,
                },
            },
        ],
        dueDate: Date,
        notes: {
            type: String,
            trim: true,
            maxlength: 1000,
        },
        resourceLabel: {
            type: String,
            trim: true,
        },
        resourceUrl: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

export const daycareLeadSchema = new Schema(
    {
        childName: {
            type: String,
            required: true,
            trim: true,
        },
        childAge: {
            type: String,
            trim: true,
        },
        parentName: {
            type: String,
            required: true,
            trim: true,
        },
        phone: {
            type: String,
            required: true,
            trim: true,
        },
        area: {
            type: String,
            trim: true,
        },
        status: {
            type: String,
            required: true,
            enum: [
                "מתעניין",
                "שיחה בוצעה",
                "הגיע לראות",
                "רוצה להירשם",
                "נרשם",
                "לא רלוונטי",
            ],
            default: "מתעניין",
        },
        interestLevel: {
            type: String,
            enum: ["גבוה", "בינוני", "נמוך"],
        },
        priceFits: {
            type: String,
            enum: ["כן", "לא"],
        },
        desiredHours: {
            type: String,
            trim: true,
            maxlength: 160,
        },
        parentPriority: {
            type: String,
            trim: true,
            maxlength: 240,
        },
        inquiryDate: Date,
        notes: {
            type: String,
            trim: true,
            maxlength: 1000,
        },
        callNotes: {
            type: String,
            trim: true,
            maxlength: 1000,
        },
        followUpDate: Date,
    },
    {
        timestamps: true,
    }
);

export const daycareDocumentSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        status: {
            type: String,
            required: true,
            enum: ["חסר", "בטיפול", "קיים"],
            default: "חסר",
        },
        dueDate: Date,
        notes: {
            type: String,
            trim: true,
            maxlength: 1000,
        },
        fileUrl: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

export const daycareFinanceSettingsSchema = new Schema(
    {
        pricePerChild: {
            type: Number,
            required: true,
            default: 4500,
            min: 0,
        },
        currentChildren: {
            type: Number,
            required: true,
            default: 6,
            min: 0,
        },
        targetChildren: {
            type: Number,
            required: true,
            default: 10,
            min: 0,
        },
        rent: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
        directorSalary: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
        staffSalaries: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
        food: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
        supplies: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
        insuranceAndPermits: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
        extraExpenses: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
        renovationKitchen: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
        renovationYard: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
        renovationConstruction: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
        renovationSafety: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
        renovationEquipment: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
        renovationLabor: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
        renovationOther: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
    },
    {
        timestamps: true,
    }
);
