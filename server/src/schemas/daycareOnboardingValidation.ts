import {
    onboardingOverallStatuses,
    onboardingResponsibleParties,
    onboardingStepSources,
    onboardingStepStatuses,
    type AdminOnboardingStepPatchDto,
    type SubmitPublicDaycareProfileDto,
    type OnboardingOverallStatus,
    type OnboardingResponsibleParty,
    type OnboardingStepSource,
    type OnboardingStepStatus,
} from "../types/daycareOnboarding";

export type ValidationResult<T> =
    | { success: true; data: T }
    | { success: false; message: string };

export interface AdminOverallStatusPatchDto {
    overallStatusOverride: OnboardingOverallStatus | null;
}

export interface AdminAccessPatchDto {
    enabled: false;
}

export interface LegacyOnboardingImportDto {
    schoolYear: string;
    existingFamilyId?: string;
}

export interface CreateOnboardingFromInquiryDto {
    schoolYear: string;
    internalNote?: string;
    existingFamilyId?: string;
}

export interface DeleteOnboardingDto {
    confirmation: "מחיקת תיק";
}

const guardianRoles = new Set([
    "mother",
    "father",
    "guardian",
    "grandfather",
    "grandmother",
    "other",
]);

const parseRequiredText = (
    value: unknown,
    fieldLabel: string,
    maximumLength: number
): ValidationResult<string> => {
    if (typeof value !== "string" || !value.trim()) {
        return { success: false, message: `${fieldLabel} is required` };
    }

    const normalized = value.trim();
    if (normalized.length > maximumLength) {
        return { success: false, message: `${fieldLabel} is too long` };
    }

    return { success: true, data: normalized };
};

const parseGuardian = (
    value: unknown,
    position: number
): ValidationResult<SubmitPublicDaycareProfileDto["guardians"][number]> => {
    if (!isRecord(value)) {
        return { success: false, message: `guardian ${position} is invalid` };
    }

    const allowedFields = new Set([
        "fullName",
        "role",
        "roleDetails",
        "phone",
        "email",
    ]);
    if (Object.keys(value).some((field) => !allowedFields.has(field))) {
        return { success: false, message: `guardian ${position} contains unsupported fields` };
    }

    const fullName = parseRequiredText(value.fullName, `guardian ${position} fullName`, 160);
    if (!fullName.success) return fullName;
    const phone = parseRequiredText(value.phone, `guardian ${position} phone`, 30);
    if (!phone.success) return phone;

    if (typeof value.role !== "string" || !guardianRoles.has(value.role)) {
        return { success: false, message: `guardian ${position} role is invalid` };
    }

    const digitCount = phone.data.replace(/\D/g, "").length;
    if (digitCount < 7 || digitCount > 15 || !/^[+\d()\-\s]+$/.test(phone.data)) {
        return { success: false, message: `guardian ${position} phone is invalid` };
    }

    const roleDetails = parseOptionalText(value.roleDetails, "roleDetails", 100);
    if (!roleDetails.success) return roleDetails;
    if (value.role === "other" && !roleDetails.data) {
        return { success: false, message: `guardian ${position} roleDetails is required` };
    }

    const email = parseOptionalText(value.email, "email", 254);
    if (!email.success) return email;
    if (email.data && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.data)) {
        return { success: false, message: `guardian ${position} email is invalid` };
    }

    return {
        success: true,
        data: {
            fullName: fullName.data,
            role: value.role,
            roleDetails: roleDetails.data ?? undefined,
            phone: phone.data,
            email: email.data?.toLowerCase() ?? undefined,
        },
    };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const hasOwn = (record: Record<string, unknown>, key: string) =>
    Object.prototype.hasOwnProperty.call(record, key);

const isStepStatus = (value: unknown): value is OnboardingStepStatus =>
    typeof value === "string" &&
    onboardingStepStatuses.some((status) => status === value);

const isStepSource = (value: unknown): value is OnboardingStepSource =>
    typeof value === "string" &&
    onboardingStepSources.some((source) => source === value);

const isResponsibleParty = (
    value: unknown
): value is OnboardingResponsibleParty =>
    typeof value === "string" &&
    onboardingResponsibleParties.some((party) => party === value);

const isOverallStatus = (
    value: unknown
): value is OnboardingOverallStatus =>
    typeof value === "string" &&
    onboardingOverallStatuses.some((status) => status === value);

const parseOptionalText = (
    value: unknown,
    fieldLabel: string,
    maximumLength: number
): ValidationResult<string | null> => {
    if (value === undefined || value === null || value === "") {
        return { success: true, data: null };
    }

    if (typeof value !== "string") {
        return { success: false, message: `${fieldLabel} must be text or null` };
    }

    const normalized = value.trim();

    if (normalized.length > maximumLength) {
        return {
            success: false,
            message: `${fieldLabel} is too long`,
        };
    }

    return { success: true, data: normalized || null };
};

const parseOptionalDate = (
    value: unknown
): ValidationResult<Date | null> => {
    if (value === null || value === "") {
        return { success: true, data: null };
    }

    if (typeof value !== "string" && !(value instanceof Date)) {
        return {
            success: false,
            message: "completedAt must be an ISO date or null",
        };
    }

    const parsed = value instanceof Date ? new Date(value) : new Date(value);

    if (Number.isNaN(parsed.getTime())) {
        return {
            success: false,
            message: "completedAt must be a valid date",
        };
    }

    return { success: true, data: parsed };
};

export const parseAdminStepPatch = (
    value: unknown
): ValidationResult<AdminOnboardingStepPatchDto> => {
    if (!isRecord(value)) {
        return { success: false, message: "A JSON object is required" };
    }

    const allowedFields = new Set([
        "status",
        "source",
        "responsibleParty",
        "isVisibleToParent",
        "completedAt",
        "internalNote",
        "parentMessage",
    ]);
    const unsupportedField = Object.keys(value).find(
        (field) => !allowedFields.has(field)
    );

    if (unsupportedField) {
        return {
            success: false,
            message: `Field '${unsupportedField}' cannot be changed`,
        };
    }

    const patch: AdminOnboardingStepPatchDto = {};

    if (hasOwn(value, "status")) {
        if (!isStepStatus(value.status)) {
            return { success: false, message: "Invalid onboarding step status" };
        }

        patch.status = value.status;
    }

    if (hasOwn(value, "source")) {
        if (!isStepSource(value.source)) {
            return { success: false, message: "Invalid onboarding step source" };
        }

        patch.source = value.source;
    }

    if (hasOwn(value, "responsibleParty")) {
        if (!isResponsibleParty(value.responsibleParty)) {
            return {
                success: false,
                message: "Invalid onboarding responsible party",
            };
        }

        patch.responsibleParty = value.responsibleParty;
    }

    if (hasOwn(value, "isVisibleToParent")) {
        if (typeof value.isVisibleToParent !== "boolean") {
            return {
                success: false,
                message: "isVisibleToParent must be boolean",
            };
        }

        patch.isVisibleToParent = value.isVisibleToParent;
    }

    if (hasOwn(value, "completedAt")) {
        const result = parseOptionalDate(value.completedAt);

        if (!result.success) {
            return result;
        }

        patch.completedAt = result.data;
    }

    const textFields = [
        ["internalNote", 2000],
        ["parentMessage", 1000],
    ] as const;

    for (const [field, maximumLength] of textFields) {
        if (!hasOwn(value, field)) {
            continue;
        }

        const result = parseOptionalText(
            value[field],
            field,
            maximumLength
        );

        if (!result.success) {
            return result;
        }

        patch[field] = result.data;
    }

    if (Object.keys(patch).length === 0) {
        return { success: false, message: "At least one change is required" };
    }

    return { success: true, data: patch };
};

export const parseAdminOverallStatusPatch = (
    value: unknown
): ValidationResult<AdminOverallStatusPatchDto> => {
    if (!isRecord(value)) {
        return { success: false, message: "A JSON object is required" };
    }

    const allowedFields = new Set([
        "overallStatus",
        "overallStatusOverride",
        "clearOverallStatusOverride",
    ]);
    const unsupportedField = Object.keys(value).find(
        (field) => !allowedFields.has(field)
    );

    if (unsupportedField) {
        return {
            success: false,
            message: `Field '${unsupportedField}' cannot be changed`,
        };
    }

    if (value.clearOverallStatusOverride === true) {
        return { success: true, data: { overallStatusOverride: null } };
    }

    const candidate = hasOwn(value, "overallStatusOverride")
        ? value.overallStatusOverride
        : value.overallStatus;

    if (candidate === null) {
        return { success: true, data: { overallStatusOverride: null } };
    }

    if (!isOverallStatus(candidate)) {
        return {
            success: false,
            message: "A valid overall status override is required",
        };
    }

    return {
        success: true,
        data: { overallStatusOverride: candidate },
    };
};

export const parseAdminAccessPatch = (
    value: unknown
): ValidationResult<AdminAccessPatchDto> => {
    if (!isRecord(value)) {
        return { success: false, message: "A JSON object is required" };
    }

    const enabled = hasOwn(value, "enabled")
        ? value.enabled
        : value.parentAccessEnabled;

    if (enabled !== false) {
        return {
            success: false,
            message:
                "A revoked link cannot be re-enabled; create a new link instead",
        };
    }

    return { success: true, data: { enabled: false } };
};

export const isValidSchoolYear = (value: string) => {
    const match = /^(\d{4})-(\d{4})$/.exec(value);

    if (!match) {
        return false;
    }

    const firstYear = Number(match[1]);
    const secondYear = Number(match[2]);

    return firstYear >= 2000 && secondYear === firstYear + 1;
};

export const parseLegacyOnboardingImport = (
    value: unknown
): ValidationResult<LegacyOnboardingImportDto> => {
    if (!isRecord(value)) {
        return { success: false, message: "A JSON object is required" };
    }

    const allowedFields = new Set([
        "schoolYear",
        "existingFamilyId",
        "familyId",
    ]);
    const unsupportedField = Object.keys(value).find(
        (field) => !allowedFields.has(field)
    );

    if (unsupportedField) {
        return {
            success: false,
            message: `Field '${unsupportedField}' cannot be imported`,
        };
    }

    if (
        typeof value.schoolYear !== "string" ||
        !isValidSchoolYear(value.schoolYear.trim())
    ) {
        return {
            success: false,
            message: "schoolYear must use consecutive YYYY-YYYY years",
        };
    }

    const familyCandidate = hasOwn(value, "existingFamilyId")
        ? value.existingFamilyId
        : value.familyId;

    if (
        familyCandidate !== undefined &&
        (typeof familyCandidate !== "string" || !familyCandidate.trim())
    ) {
        return {
            success: false,
            message: "existingFamilyId must be a non-empty ID",
        };
    }

    return {
        success: true,
        data: {
            schoolYear: value.schoolYear.trim(),
            existingFamilyId:
                typeof familyCandidate === "string"
                    ? familyCandidate.trim()
                    : undefined,
        },
    };
};

export const parseCreateOnboardingFromInquiry = (
    value: unknown
): ValidationResult<CreateOnboardingFromInquiryDto> => {
    if (!isRecord(value)) {
        return { success: false, message: "A JSON object is required" };
    }

    const allowedFields = new Set([
        "schoolYear",
        "internalNote",
        "existingFamilyId",
    ]);
    const unsupportedField = Object.keys(value).find(
        (field) => !allowedFields.has(field)
    );

    if (unsupportedField) {
        return {
            success: false,
            message: `Field '${unsupportedField}' cannot be used`,
        };
    }

    if (
        typeof value.schoolYear !== "string" ||
        !isValidSchoolYear(value.schoolYear.trim())
    ) {
        return {
            success: false,
            message: "schoolYear must use consecutive YYYY-YYYY years",
        };
    }

    const optionalTextFields = ["internalNote"] as const;

    for (const field of optionalTextFields) {
        if (
            value[field] !== undefined &&
            (typeof value[field] !== "string" || !value[field].trim())
        ) {
            return { success: false, message: `${field} must be non-empty text` };
        }
    }

    if (
        typeof value.internalNote === "string" &&
        value.internalNote.trim().length > 2000
    ) {
        return { success: false, message: "internalNote is too long" };
    }

    if (
        value.existingFamilyId !== undefined &&
        (typeof value.existingFamilyId !== "string" ||
            !/^[a-f\d]{24}$/i.test(value.existingFamilyId.trim()))
    ) {
        return { success: false, message: "existingFamilyId must be a valid ID" };
    }

    return {
        success: true,
        data: {
            schoolYear: (value.schoolYear as string).trim(),
            internalNote:
                typeof value.internalNote === "string"
                    ? value.internalNote.trim() || undefined
                    : undefined,
            existingFamilyId:
                typeof value.existingFamilyId === "string"
                    ? value.existingFamilyId.trim()
                    : undefined,
        },
    };
};

export const parseDeleteOnboarding = (
    value: unknown
): ValidationResult<DeleteOnboardingDto> => {
    if (!isRecord(value)) {
        return { success: false, message: "A JSON object is required" };
    }

    if (
        Object.keys(value).length !== 1 ||
        value.confirmation !== "מחיקת תיק"
    ) {
        return {
            success: false,
            message: "יש להקליד „מחיקת תיק” כדי לאשר את הפעולה",
        };
    }

    return { success: true, data: { confirmation: "מחיקת תיק" } };
};

export const parsePublicDaycareProfile = (
    value: unknown,
    now = new Date()
): ValidationResult<SubmitPublicDaycareProfileDto> => {
    if (!isRecord(value)) {
        return { success: false, message: "A JSON object is required" };
    }

    const allowedFields = new Set(["child", "guardians", "address"]);
    if (Object.keys(value).some((field) => !allowedFields.has(field))) {
        return { success: false, message: "The profile contains unsupported fields" };
    }

    if (!isRecord(value.child)) {
        return { success: false, message: "child details are required" };
    }
    const childFields = new Set(["firstName", "lastName", "birthDate"]);
    if (Object.keys(value.child).some((field) => !childFields.has(field))) {
        return { success: false, message: "child contains unsupported fields" };
    }

    const firstName = parseRequiredText(value.child.firstName, "firstName", 100);
    if (!firstName.success) return firstName;
    const lastName = parseRequiredText(value.child.lastName, "lastName", 100);
    if (!lastName.success) return lastName;

    if (typeof value.child.birthDate !== "string") {
        return { success: false, message: "birthDate is required" };
    }
    const birthDate = new Date(`${value.child.birthDate}T00:00:00.000Z`);
    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(value.child.birthDate) ||
        Number.isNaN(birthDate.getTime()) ||
        birthDate.toISOString().slice(0, 10) !== value.child.birthDate ||
        birthDate.getTime() > now.getTime()
    ) {
        return { success: false, message: "birthDate must be a valid past date" };
    }

    if (!Array.isArray(value.guardians) || value.guardians.length < 1 || value.guardians.length > 2) {
        return { success: false, message: "one or two guardians are required" };
    }
    const guardians: SubmitPublicDaycareProfileDto["guardians"] = [];
    for (const [index, guardianValue] of value.guardians.entries()) {
        const guardian = parseGuardian(guardianValue, index + 1);
        if (!guardian.success) return guardian;
        guardians.push(guardian.data);
    }

    if (!isRecord(value.address)) {
        return { success: false, message: "address is required" };
    }
    const addressFields = new Set(["city", "street", "houseNumber", "apartment"]);
    if (Object.keys(value.address).some((field) => !addressFields.has(field))) {
        return { success: false, message: "address contains unsupported fields" };
    }
    const city = parseRequiredText(value.address.city, "city", 100);
    if (!city.success) return city;
    const street = parseRequiredText(value.address.street, "street", 160);
    if (!street.success) return street;
    const houseNumber = parseRequiredText(value.address.houseNumber, "houseNumber", 20);
    if (!houseNumber.success) return houseNumber;
    const apartment = parseOptionalText(value.address.apartment, "apartment", 20);
    if (!apartment.success) return apartment;

    return {
        success: true,
        data: {
            child: { firstName: firstName.data, lastName: lastName.data, birthDate },
            guardians,
            address: {
                city: city.data,
                street: street.data,
                houseNumber: houseNumber.data,
                apartment: apartment.data ?? undefined,
            },
        },
    };
};
