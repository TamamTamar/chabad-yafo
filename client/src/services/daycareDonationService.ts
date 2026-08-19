import http from "./http";
import type { ApiResponse } from "../types/api";
import type {
    DaycareDonationCampaignData,
    DaycareDonationAudit,
    DaycareDonationAmbassador,
    DaycareDonationDiagnostics,
    DaycareDonationLead,
    DaycareDonationContactMethod,
    DaycareDonationLeadStatus,
    DaycareDonationRecord,
} from "../pages/DaycareDonations/types";

export type ManualDonationInput = {
    amount: number;
    currency: "ILS" | "USD";
    exchangeRate?: number;
    itemId?: string;
    ambassadorId?: string;
    donorName?: string;
    displayDonorName?: boolean;
    phone?: string;
    email?: string;
    dedication?: string;
    note?: string;
    manualSource: "bank_transfer" | "cash" | "check" | "other";
    reference?: string;
    receivedAt: string;
};

export type DaycareDonationIntentInput = {
    amount: number;
    paymentType: "HK" | "Ragil";
    installments: number;
    itemId?: string;
    donorName: string;
    displayDonorName?: boolean;
    phone: string;
    email: string;
    dedication?: string;
    refCode?: string;
};

export type DaycareDonationIntentResponse = {
    intentId: string;
    callbackUrl: string;
    param1: string;
    param2: string;
    expiresAt: string;
};

export type DaycareDonationAmbassadorReference = {
    name: string;
    refCode: string;
    linkSlug?: string;
};

export const getDaycareDonationCampaign = async () => {
    const response = await http.get<ApiResponse<DaycareDonationCampaignData>>(
        "/daycare-donations/campaign"
    );
    return response.data.data;
};

export const getDaycareDonationAmbassadorReference = async (
    identifier: string
) => {
    const response = await http.get<
        ApiResponse<DaycareDonationAmbassadorReference>
    >(`/daycare-donations/ambassadors/${encodeURIComponent(identifier)}`);
    return response.data.data;
};

export const createDaycareDonationIntent = async (
    input: DaycareDonationIntentInput
) => {
    const response = await http.post<ApiResponse<DaycareDonationIntentResponse>>(
        "/daycare-donations/intents",
        input
    );
    return response.data.data;
};

export const createAdminDiagnosticDonationIntent = async (
    input: DaycareDonationIntentInput
) => {
    const response = await http.post<
        ApiResponse<DaycareDonationIntentResponse>
    >("/admin/daycare/donations/diagnostic-intents", input);
    return response.data.data;
};

export const getAdminDaycareDonationCampaign = async () => {
    const response = await http.get<ApiResponse<DaycareDonationCampaignData>>(
        "/admin/daycare/donations/campaign"
    );
    return response.data.data;
};

export type DaycareUsdExchangeRate = {
    currency: "USD";
    rate: number;
    updatedAt: string;
    source: "bank_of_israel";
};

export const getAdminDaycareUsdExchangeRate = async (date?: string) => {
    const response = await http.get<ApiResponse<DaycareUsdExchangeRate>>(
        "/admin/daycare/donations/exchange-rates/USD",
        { params: date ? { date } : undefined }
    );
    return response.data.data;
};

export const getAdminDaycareDonationRecords = async () => {
    const response = await http.get<ApiResponse<DaycareDonationRecord[]>>(
        "/admin/daycare/donations/records"
    );
    return response.data.data;
};

export const getAdminDaycareDonationAmbassadors = async () => {
    const response = await http.get<ApiResponse<DaycareDonationAmbassador[]>>(
        "/admin/daycare/donations/ambassadors"
    );
    return response.data.data;
};

export const createDaycareDonationAmbassador = async (
    input: {
        name: string;
        linkSlug: string;
        goal: number;
        notes?: string;
    }
) => {
    const response = await http.post<ApiResponse<DaycareDonationAmbassador>>(
        "/admin/daycare/donations/ambassadors",
        input
    );
    return response.data.data;
};

export const updateDaycareDonationAmbassador = async (
    id: string,
    updates: {
        name?: string;
        linkSlug?: string;
        goal?: number;
        active?: boolean;
        notes?: string;
    }
) => {
    const response = await http.patch<ApiResponse<DaycareDonationAmbassador>>(
        `/admin/daycare/donations/ambassadors/${id}`,
        updates
    );
    return response.data.data;
};

export const deleteDaycareDonationAmbassador = async (id: string) => {
    await http.delete(`/admin/daycare/donations/ambassadors/${id}`);
};

export type DaycareDonationLeadInput = {
    donorName: string;
    phone?: string;
    ambassadorId?: string;
    targetAmount?: number;
    pledgedAmount?: number;
    contactMethod?: DaycareDonationContactMethod;
    status?: DaycareDonationLeadStatus;
    lastContactAt?: string;
    nextFollowUpAt?: string;
    notes?: string;
};

export const getAdminDaycareDonationLeads = async () => {
    const response = await http.get<ApiResponse<DaycareDonationLead[]>>(
        "/admin/daycare/donations/leads"
    );
    return response.data.data;
};

export const createDaycareDonationLead = async (
    input: DaycareDonationLeadInput
) => {
    const response = await http.post<ApiResponse<DaycareDonationLead>>(
        "/admin/daycare/donations/leads",
        input
    );
    return response.data.data;
};

export const updateDaycareDonationLead = async (
    id: string,
    updates: Partial<DaycareDonationLeadInput>
) => {
    const response = await http.patch<ApiResponse<DaycareDonationLead>>(
        `/admin/daycare/donations/leads/${id}`,
        updates
    );
    return response.data.data;
};

export const getAdminDaycareDonationAudit = async () => {
    const response = await http.get<ApiResponse<DaycareDonationAudit[]>>(
        "/admin/daycare/donations/audit"
    );
    return response.data.data;
};

export const getAdminDaycareDonationDiagnostics = async () => {
    const response = await http.get<ApiResponse<DaycareDonationDiagnostics>>(
        "/admin/daycare/donations/diagnostics"
    );
    return response.data.data;
};

export const clearAdminDaycareDonationDiagnostics = async () => {
    const response = await http.delete<
        ApiResponse<{ cleared: number }>
    >("/admin/daycare/donations/diagnostics");
    return response.data.data;
};

export const createManualDaycareDonation = async (
    input: ManualDonationInput
) => {
    const response = await http.post<ApiResponse<DaycareDonationRecord>>(
        "/admin/daycare/donations/records",
        input
    );
    return response.data.data;
};

export const updateDaycareDonationRecord = async (
    id: string,
    updates: {
        itemId?: string;
        allocations?: Array<{ itemId: string; amount: number }>;
        ambassadorId?: string;
        status?: DaycareDonationRecord["status"];
        displayDonorName?: boolean;
        reason: string;
    }
) => {
    const response = await http.patch<ApiResponse<DaycareDonationRecord>>(
        `/admin/daycare/donations/records/${id}`,
        updates
    );
    return response.data.data;
};

export const updateDaycareDonationItem = async (
    itemId: string,
    updates: {
        goal?: number;
        statusOverride?: "auto" | "open" | "closed";
        acceptingDonations?: boolean;
        reason?: string;
    }
) => {
    const response = await http.patch<ApiResponse<DaycareDonationCampaignData>>(
        `/admin/daycare/donations/items/${itemId}`,
        updates
    );
    return response.data.data;
};

export const updateDaycareDonationCategory = async (
    categoryId: string,
    updates: { goal: number }
) => {
    const response = await http.patch<ApiResponse<DaycareDonationCampaignData>>(
        `/admin/daycare/donations/categories/${categoryId}`,
        updates
    );
    return response.data.data;
};

export const updateDaycareDonationCampaign = async (updates: {
    goal?: number;
    active?: boolean;
    recommendedChoiceIds?: string[];
}) => {
    const response = await http.patch<ApiResponse<DaycareDonationCampaignData>>(
        "/admin/daycare/donations/campaign",
        updates
    );
    return response.data.data;
};

export type DaycareDonationFieldUpdateInput = {
    title: string;
    description: string;
    imageAlt: string;
    itemId?: string;
    published: boolean;
    image?: File;
};

const toFieldUpdateFormData = (
    input: Partial<DaycareDonationFieldUpdateInput>
) => {
    const formData = new FormData();
    Object.entries(input).forEach(([key, value]) => {
        if (value === undefined) return;
        if (value instanceof File) formData.append(key, value);
        else formData.append(key, String(value));
    });
    return formData;
};

export const createDaycareDonationFieldUpdate = async (
    input: DaycareDonationFieldUpdateInput & { image: File }
) => {
    const response = await http.post<ApiResponse<DaycareDonationCampaignData>>(
        "/admin/daycare/donations/field-updates",
        toFieldUpdateFormData(input),
        { headers: { "Content-Type": "multipart/form-data" } }
    );
    return response.data.data;
};

export const updateDaycareDonationFieldUpdate = async (
    id: string,
    input: Partial<DaycareDonationFieldUpdateInput>
) => {
    const response = await http.patch<ApiResponse<DaycareDonationCampaignData>>(
        `/admin/daycare/donations/field-updates/${id}`,
        toFieldUpdateFormData(input),
        { headers: { "Content-Type": "multipart/form-data" } }
    );
    return response.data.data;
};

export const deleteDaycareDonationFieldUpdate = async (id: string) => {
    const response = await http.delete<ApiResponse<DaycareDonationCampaignData>>(
        `/admin/daycare/donations/field-updates/${id}`,
        { data: {} }
    );
    return response.data.data;
};
