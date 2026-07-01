import { Schema } from "mongoose";

const mobilePhonePattern = /^05\d{8}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const daycareRegistrationSchema = new Schema(
    {
        parentName: {
            type: String,
            required: true,
            trim: true,
        },
        phone: {
            type: String,
            required: true,
            trim: true,
            validate: {
                validator: (value: string) => mobilePhonePattern.test(value),
                message: "מספר טלפון לא תקין",
            },
        },
        email: {
            type: String,
            trim: true,
            validate: {
                validator: (value?: string) => !value || emailPattern.test(value),
                message: "כתובת דוא״ל לא תקינה",
            },
        },
        childName: {
            type: String,
            trim: true,
        },
        birthDate: {
            type: Date,
        },
        childAge: {
            type: String,
            required: true,
            trim: true,
            maxlength: 80,
        },
        requiredHours: {
            type: String,
            required: true,
            enum: ["עד 15:30", "עד 16:00", "אחר"],
        },
        requiredHoursOther: {
            type: String,
            trim: true,
            maxlength: 80,
            validate: {
                validator: function (this: { requiredHours?: string }, value?: string) {
                    return this.requiredHours !== "אחר" || Boolean(value?.trim());
                },
                message: "יש למלא את השעות הרצויות",
            },
        },
        fridayCare: {
            type: String,
            required: true,
            enum: ["כן", "לא"],
            default: "לא",
        },
        costApproval: {
            type: Boolean,
            default: false,
        },
        notes: {
            type: String,
            trim: true,
            maxlength: 700,
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
    },
    {
        timestamps: true,
    }
);
