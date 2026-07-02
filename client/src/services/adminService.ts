import http from "./http";
import type {
    CreateFinanceEntryPayload,
    FinanceEntryAdmin,
    FinanceOverview,
    PaymentAdmin,
    RebbeLetterAdmin,
    RebbeLetterStatus,
} from "../types/chabad";
import type { DaycareRegistrationAdmin } from "../types/daycareRegistration";
import type { FamilyAdmin } from "../types/family";
import type { ApiResponse } from "../types/api";



export const getAllFamilies = async () => {
    const response = await http.get<ApiResponse<FamilyAdmin[]>>(
        "/admin/families"
    );

    return response.data.data;
};

export const getAllDaycareRegistrations = async () => {
    const response = await http.get<ApiResponse<DaycareRegistrationAdmin[]>>(
        "/admin/daycare-registrations"
    );

    return response.data.data;
};

export const getAllRebbeLetters = async () => {
    const response = await http.get<ApiResponse<RebbeLetterAdmin[]>>(
        "/admin/rebbe-letters"
    );

    return response.data.data;
};

export const getAllPayments = async () => {
    const response = await http.get<ApiResponse<PaymentAdmin[]>>(
        "/admin/payments"
    );

    return response.data.data;
};

export const getFinanceOverview = async (month?: string) => {
    const response = await http.get<ApiResponse<FinanceOverview>>(
        "/admin/finance",
        {
            params: month ? { month } : undefined,
        }
    );

    return response.data.data;
};

export const createFinanceEntry = async (
    payload: CreateFinanceEntryPayload
) => {
    const response = await http.post<ApiResponse<FinanceEntryAdmin>>(
        "/admin/finance-entries",
        payload
    );

    return response.data.data;
};

export const updateRebbeLetterStatus = async (
    id: string,
    status: RebbeLetterStatus
) => {
    const response = await http.patch<ApiResponse<RebbeLetterAdmin>>(
        `/admin/rebbe-letters/${id}/status`,
        { status }
    );

    return response.data.data;
};
