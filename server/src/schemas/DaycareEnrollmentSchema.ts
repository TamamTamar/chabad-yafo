import { Schema } from "mongoose";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^0\d{8,9}$/;

const isValidIsraeliId = (value: string) => {
    const id = value.replace(/\D/g, "").padStart(9, "0");

    if (!/^\d{9}$/.test(id)) {
        return false;
    }

    const sum = id
        .split("")
        .map(Number)
        .reduce((total, digit, index) => {
            const multiplied = digit * ((index % 2) + 1);
            return total + (multiplied > 9 ? multiplied - 9 : multiplied);
        }, 0);

    return sum % 10 === 0;
};

const requiredString = {
    type: String,
    required: true,
    trim: true,
};

const optionalText = {
    type: String,
    trim: true,
    maxlength: 1200,
};

const phoneField = {
    type: String,
    required: true,
    trim: true,
    validate: {
        validator: (value: string) => phonePattern.test(value),
        message: "מספר טלפון לא תקין",
    },
};

const emailField = {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    validate: {
        validator: (value: string) => emailPattern.test(value),
        message: "כתובת דוא״ל לא תקינה",
    },
};

const israeliIdField = {
    type: String,
    required: true,
    trim: true,
    validate: {
        validator: isValidIsraeliId,
        message: "תעודת זהות לא תקינה",
    },
};

const emergencyContactSchema = new Schema(
    {
        fullName: requiredString,
        relation: requiredString,
        phone: phoneField,
    },
    { _id: false }
);

export const daycareEnrollmentSchema = new Schema(
    {
        child: {
            firstName: requiredString,
            lastName: requiredString,
            israeliId: {
                ...israeliIdField,
                unique: true,
                index: true,
            },
            birthDate: {
                type: Date,
                required: true,
            },
            gender: {
                type: String,
                required: true,
                enum: ["female", "male", "other"],
            },
            address: requiredString,
            homeLanguage: requiredString,
        },
        parents: {
            motherName: requiredString,
            motherPhone: phoneField,
            motherEmail: emailField,
            motherIsraeliId: israeliIdField,
            fatherName: requiredString,
            fatherPhone: phoneField,
            fatherEmail: emailField,
            fatherIsraeliId: israeliIdField,
            differentParentAddress: optionalText,
        },
        emergencyContacts: {
            type: [emergencyContactSchema],
            required: true,
            validate: {
                validator: (contacts: unknown[]) => contacts.length >= 2,
                message: "יש להזין לפחות שני אנשי קשר לשעת חירום",
            },
        },
        medical: {
            allergies: optionalText,
            foodSensitivities: optionalText,
            regularMedications: optionalText,
            medicalLimitations: optionalText,
            healthFund: requiredString,
            pediatricianName: optionalText,
            additionalNotes: optionalText,
        },
        consents: {
            detailsCorrect: {
                type: Boolean,
                required: true,
                validate: (value: boolean) => value === true,
            },
            emergencyContact: {
                type: Boolean,
                required: true,
                validate: (value: boolean) => value === true,
            },
            medicalUpdateCommitment: {
                type: Boolean,
                required: true,
                validate: (value: boolean) => value === true,
            },
            daycareRules: {
                type: Boolean,
                required: true,
                validate: (value: boolean) => value === true,
            },
            registrationDeposit: {
                type: Boolean,
                required: true,
                validate: (value: boolean) => value === true,
            },
            monthlyTuition: {
                type: Boolean,
                required: true,
                validate: (value: boolean) => value === true,
            },
            internalPhotos: {
                type: Boolean,
                default: false,
            },
            whatsappUpdates: {
                type: Boolean,
                default: false,
            },
        },
        signature: {
            signerFullName: requiredString,
            signedAt: {
                type: Date,
                required: true,
                default: Date.now,
            },
            digitalSignatureConsent: {
                type: Boolean,
                required: true,
                validate: (value: boolean) => value === true,
            },
        },
        status: {
            type: String,
            required: true,
            enum: [
                "submitted",
                "reviewed",
                "approved",
                "missingDocuments",
                "rejected",
            ],
            default: "submitted",
        },
    },
    {
        timestamps: true,
    }
);
