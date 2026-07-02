export type DaycareEnrollmentStatus =
    | "submitted"
    | "reviewed"
    | "approved"
    | "missingDocuments"
    | "rejected";

export type ChildGender = "female" | "male" | "other";

export type EmergencyContact = {
    fullName: string;
    relation: string;
    phone: string;
};

export type DaycareEnrollmentFormValues = {
    child: {
        firstName: string;
        lastName: string;
        israeliId: string;
        birthDate: string;
        gender: ChildGender | "";
        address: string;
        healthFund: string;
        homeLanguage: string;
    };
    parents: {
        motherName: string;
        motherPhone: string;
        motherEmail: string;
        motherIsraeliId: string;
        fatherName: string;
        fatherPhone: string;
        fatherEmail: string;
        fatherIsraeliId: string;
        differentParentAddress?: string;
    };
    emergencyContacts: EmergencyContact[];
    medical: {
        allergies?: string;
        foodSensitivities?: string;
        regularMedications?: string;
        medicalLimitations?: string;
        healthFund: string;
        pediatricianName?: string;
        additionalNotes?: string;
    };
    consents: {
        detailsCorrect: boolean;
        emergencyContact: boolean;
        medicalUpdateCommitment: boolean;
        daycareRules: boolean;
        internalPhotos?: boolean;
        whatsappUpdates?: boolean;
    };
    signature: {
        signerFullName: string;
        signedAt: string;
        digitalSignatureConsent: boolean;
    };
};

export type DaycareEnrollmentAdmin = DaycareEnrollmentFormValues & {
    _id: string;
    status: DaycareEnrollmentStatus;
    createdAt?: string;
    updatedAt?: string;
};

export const daycareEnrollmentStatusLabels: Record<
    DaycareEnrollmentStatus,
    string
> = {
    submitted: "נשלח",
    reviewed: "נבדק",
    approved: "אושר",
    missingDocuments: "חסרים מסמכים",
    rejected: "נדחה",
};
