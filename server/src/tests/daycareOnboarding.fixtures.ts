import { Types } from "mongoose";
import { createDefaultOnboarding } from "../services/daycareOnboardingService";
import type { IDaycareEnrollment } from "../types/daycareEnrollment";

export const createdAt = new Date("2026-07-13T09:00:00.000Z");
export const familyId = new Types.ObjectId("64b000000000000000000001");
export const childId = new Types.ObjectId("64b000000000000000000002");
export const legacyEnrollmentId = new Types.ObjectId(
    "64b000000000000000000003"
);
export const onboardingId = new Types.ObjectId(
    "64b000000000000000000004"
);
export const tokenA = "A".repeat(43);
export const tokenB = "B".repeat(43);

export const withDefaultTokenLifetime = <T>(callback: () => T): T => {
    const previousValue = process.env.DAYCARE_ONBOARDING_TOKEN_TTL_DAYS;
    delete process.env.DAYCARE_ONBOARDING_TOKEN_TTL_DAYS;

    try {
        return callback();
    } finally {
        if (previousValue === undefined) {
            delete process.env.DAYCARE_ONBOARDING_TOKEN_TTL_DAYS;
        } else {
            process.env.DAYCARE_ONBOARDING_TOKEN_TTL_DAYS = previousValue;
        }
    }
};

export const createOnboardingFixture = (
    rawToken = tokenA,
    schoolYear = "2026-2027"
) =>
    withDefaultTokenLifetime(() =>
        createDefaultOnboarding(
            { familyId, childId, schoolYear },
            createdAt,
            rawToken
        )
    );

export const createLegacyEnrollmentFixture = (): IDaycareEnrollment => ({
    child: {
        firstName: " אורי ",
        lastName: " כהן ",
        israeliId: "123456782",
        birthDate: new Date("2024-01-01T00:00:00.000Z"),
        gender: "male",
        address: "כתובת פרטית",
        homeLanguage: "עברית",
    },
    parents: {
        motherName: " שרה כהן ",
        motherPhone: "0501234567",
        motherEmail: "SARA@EXAMPLE.COM",
        motherIsraeliId: "123456782",
        fatherName: " דוד כהן ",
        fatherPhone: "0521234567",
        fatherEmail: "david@example.com",
        fatherIsraeliId: "123456782",
    },
    emergencyContacts: [
        { fullName: "אשת קשר", relation: "דודה", phone: "0531234567" },
        { fullName: "איש קשר", relation: "דוד", phone: "0541234567" },
    ],
    medical: {
        allergies: "מידע רפואי שאסור לייבא",
        healthFund: "כללית",
    },
    consents: {
        detailsCorrect: true,
        emergencyContact: true,
        medicalUpdateCommitment: true,
        daycareRules: true,
        registrationDeposit: true,
        monthlyTuition: true,
        internalPhotos: true,
        whatsappUpdates: true,
    },
    signature: {
        signerFullName: "שרה כהן",
        signedAt: createdAt,
        digitalSignatureConsent: true,
    },
    status: "submitted",
    createdAt,
    updatedAt: createdAt,
});
