export type DaycareEnrollmentStatus =
    | "submitted"
    | "reviewed"
    | "approved"
    | "missingDocuments"
    | "rejected";

export type ChildGender = "female" | "male" | "other";

export interface IEmergencyContact {
    fullName: string;
    relation: string;
    phone: string;
}

export interface IDaycareEnrollment {
    child: {
        firstName: string;
        lastName: string;
        israeliId: string;
        birthDate: Date;
        gender: ChildGender;
        address: string;
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
    emergencyContacts: IEmergencyContact[];
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
        registrationDeposit: boolean;
        monthlyTuition: boolean;
        internalPhotos?: boolean;
        whatsappUpdates?: boolean;
    };
    signature: {
        signerFullName: string;
        signedAt: Date;
        digitalSignatureConsent: boolean;
    };
    status: DaycareEnrollmentStatus;
    createdAt?: Date;
    updatedAt?: Date;
}
