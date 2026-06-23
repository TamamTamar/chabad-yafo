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
            required: true,
            trim: true,
        },
        birthDate: {
            type: Date,
            required: true,
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
        },
        costApproval: {
            type: Boolean,
            required: true,
            validate: {
                validator: (value: boolean) => value === true,
                message: "יש לאשר שהעלות המשוערת מתאימה עבורכם",
            },
        },
        notes: {
            type: String,
            trim: true,
            maxlength: 700,
        },
    },
    {
        timestamps: true,
    }
);
