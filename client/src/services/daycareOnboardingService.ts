import http from "./http";
import type { ApiResponse } from "../types/api";
import type {
    AdminDaycareFamilyOption,
    AdminDaycareOnboarding,
    AdminDaycareOnboardingListItem,
    AdminOnboardingAuditEntry,
    AdminOnboardingLinkResponse,
    CreateOnboardingFromInquiryPayload,
    ImportLegacyOnboardingPayload,
    OnboardingOverallStatus,
    PublicDaycareOnboarding,
    SubmitDaycareIdentityProfilePayload,
    UpdateAdminOnboardingStepPayload,
} from "../types/daycareOnboarding";

const encodePathSegment = (value: string) => encodeURIComponent(value);

export const getPublicDaycareOnboarding = async (
    token: string,
    signal?: AbortSignal
) => {
    const response = await http.get<ApiResponse<PublicDaycareOnboarding>>(
        `/daycare/onboarding/public/${encodePathSegment(token)}`,
        { signal }
    );

    return response.data.data;
};

export const submitPublicDaycareProfile = async (
    token: string,
    payload: SubmitDaycareIdentityProfilePayload
) => {
    const response = await http.put<ApiResponse<PublicDaycareOnboarding>>(
        `/daycare/onboarding/public/${encodePathSegment(token)}/profile`,
        payload
    );

    return response.data.data;
};

export const submitPublicDaycareOnboarding = async (token: string) => {
    const response = await http.post<ApiResponse<PublicDaycareOnboarding>>(
        `/daycare/onboarding/public/${encodePathSegment(token)}/submit`,
        {}
    );

    return response.data.data;
};

export type DaycarePaymentIntent = {
    intentId: string;
    amount: number;
    childName: string;
    payer: { name: string; phone: string; email: string };
    callbackUrl: string;
    param1: string;
    param2: string;
    expiresAt: string;
};

export const createDaycarePaymentIntent = async (token: string) => {
    const response = await http.post<ApiResponse<DaycarePaymentIntent>>(
        `/daycare-payments/onboarding/${encodePathSegment(token)}/intents`,
        {}
    );
    return response.data.data;
};

export const updateAdminTuitionPayment = async (
    onboardingId: string,
    input: { monthlyTuitionAmount: number }
) => {
    await http.patch(
        `/admin/daycare/payments/onboarding/${encodePathSegment(onboardingId)}/settings`,
        input
    );
    return getAdminDaycareOnboarding(onboardingId);
};

export type DaycarePaymentHistoryItem = {
    _id: string;
    paymentType: "daycare_payment";
    providerPaymentType: "HK";
    installments: 12;
    childName: string;
    billingPeriod?: string;
    monthlyTuitionAmount: number;
    requestedAmount: number;
    paidAmount?: number;
    externalTransactionId?: string;
    status: "created" | "confirmed" | "failed" | "expired";
    paidAt?: string;
    createdAt?: string;
};

export const getAdminTuitionPaymentHistory = async (onboardingId: string) => {
    const response = await http.get<ApiResponse<DaycarePaymentHistoryItem[]>>(
        `/admin/daycare/payments/onboarding/${encodePathSegment(onboardingId)}/history`
    );
    return response.data.data;
};

export const getAdminDaycareOnboardings = async () => {
    const response = await http.get<ApiResponse<AdminDaycareOnboardingListItem[]>>(
        "/admin/daycare/onboarding"
    );

    return response.data.data;
};

export const getAdminDaycareFamilies = async () => {
    const response = await http.get<ApiResponse<AdminDaycareFamilyOption[]>>(
        "/admin/daycare/onboarding/families"
    );

    return response.data.data;
};

export const getAdminDaycareOnboarding = async (onboardingId: string) => {
    const response = await http.get<ApiResponse<AdminDaycareOnboarding>>(
        `/admin/daycare/onboarding/${encodePathSegment(onboardingId)}`
    );

    return response.data.data;
};

export const getAdminDaycareOnboardingAudit = async (onboardingId: string) => {
    const response = await http.get<ApiResponse<AdminOnboardingAuditEntry[]>>(
        `/admin/daycare/onboarding/${encodePathSegment(onboardingId)}/audit`
    );

    return response.data.data;
};

export const importLegacyDaycareOnboarding = async (
    enrollmentId: string,
    payload: ImportLegacyOnboardingPayload
) => {
    const response = await http.post<AdminOnboardingLinkResponse>(
        `/admin/daycare/onboarding/import/${encodePathSegment(enrollmentId)}`,
        payload
    );

    return response.data;
};

export const createOnboardingFromRegistration = async (
    registrationId: string,
    payload: CreateOnboardingFromInquiryPayload
) => {
    const response = await http.post<AdminOnboardingLinkResponse & { created: boolean }>(
        `/admin/daycare/onboarding/from-registration/${encodePathSegment(registrationId)}`,
        payload
    );

    return response.data;
};

export const updateAdminOnboardingStep = async (
    onboardingId: string,
    stepKey: string,
    updates: UpdateAdminOnboardingStepPayload
) => {
    const response = await http.patch<ApiResponse<AdminDaycareOnboarding>>(
        `/admin/daycare/onboarding/${encodePathSegment(onboardingId)}/steps/${encodePathSegment(stepKey)}`,
        updates
    );

    return response.data.data;
};

export const updateAdminOnboardingOverallStatus = async (
    onboardingId: string,
    overallStatusOverride: OnboardingOverallStatus | null
) => {
    const response = await http.patch<ApiResponse<AdminDaycareOnboarding>>(
        `/admin/daycare/onboarding/${encodePathSegment(onboardingId)}`,
        { overallStatusOverride }
    );

    return response.data.data;
};

export const updateAdminOnboardingAccess = async (
    onboardingId: string,
    enabled: false
) => {
    const response = await http.patch<ApiResponse<AdminDaycareOnboarding>>(
        `/admin/daycare/onboarding/${encodePathSegment(onboardingId)}/access`,
        { enabled }
    );

    return response.data.data;
};

export const regenerateAdminOnboardingLink = async (onboardingId: string) => {
    const response = await http.post<AdminOnboardingLinkResponse>(
        `/admin/daycare/onboarding/${encodePathSegment(onboardingId)}/regenerate-link`,
        {}
    );

    return response.data;
};

export const deleteAdminDaycareOnboarding = async (onboardingId: string) => {
    const response = await http.delete<ApiResponse<{
        onboardingId: string;
        registrationId: string;
        identityPreserved: boolean;
        childDeleted: boolean;
        familyDeleted: boolean;
        filesCleanupFailed: number;
        parentDocumentsUnlocked: boolean;
    }>>(`/admin/daycare/onboarding/${encodePathSegment(onboardingId)}`, {
        data: { confirmation: "מחיקת תיק" },
    });

    return response.data.data;
};
