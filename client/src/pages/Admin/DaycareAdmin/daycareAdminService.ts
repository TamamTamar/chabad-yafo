import http from "../../../services/http";
import type { ApiResponse } from "../../../types/api";
import type {
    DaycareDocument,
    DaycareFinanceSettings,
    DaycareLead,
    DaycareOverview,
    DaycareRegistrationsResponse,
    DaycareTask,
    EditableDaycareDocument,
    EditableDaycareLead,
    EditableDaycareTask,
} from "./types";

const cleanPayload = <T extends Record<string, unknown>>(payload: T) => {
    return Object.fromEntries(
        Object.entries(payload).map(([key, value]) => [
            key,
            value === "" ? undefined : value,
        ])
    );
};

export const getDaycareOverview = async () => {
    const response = await http.get<ApiResponse<DaycareOverview>>(
        "/admin/daycare/overview"
    );

    return response.data.data;
};

export const getDaycareTasks = async () => {
    const response = await http.get<ApiResponse<DaycareTask[]>>(
        "/admin/daycare/tasks"
    );

    return response.data.data;
};

export const createDaycareTask = async (task: EditableDaycareTask) => {
    const response = await http.post<ApiResponse<DaycareTask>>(
        "/admin/daycare/tasks",
        cleanPayload(task)
    );

    return response.data.data;
};

export const updateDaycareTask = async (
    id: string,
    task: Partial<EditableDaycareTask>
) => {
    const response = await http.patch<ApiResponse<DaycareTask>>(
        `/admin/daycare/tasks/${id}`,
        cleanPayload(task)
    );

    return response.data.data;
};

export const deleteDaycareTask = async (id: string) => {
    await http.delete(`/admin/daycare/tasks/${id}`);
};

export const getDaycareRegistrations = async () => {
    const response = await http.get<ApiResponse<DaycareRegistrationsResponse>>(
        "/admin/daycare/registrations"
    );

    return response.data.data;
};

export const createDaycareLead = async (lead: EditableDaycareLead) => {
    const response = await http.post<ApiResponse<DaycareLead>>(
        "/admin/daycare/registrations",
        cleanPayload(lead)
    );

    return response.data.data;
};

export const updateDaycareLead = async (
    id: string,
    lead: Partial<EditableDaycareLead>
) => {
    const response = await http.patch<ApiResponse<DaycareLead>>(
        `/admin/daycare/registrations/${id}`,
        cleanPayload(lead)
    );

    return response.data.data;
};

export const deleteDaycareLead = async (id: string) => {
    await http.delete(`/admin/daycare/registrations/${id}`);
};

export const getDaycareDocuments = async () => {
    const response = await http.get<ApiResponse<DaycareDocument[]>>(
        "/admin/daycare/documents"
    );

    return response.data.data;
};

export const createDaycareDocument = async (
    document: EditableDaycareDocument
) => {
    const response = await http.post<ApiResponse<DaycareDocument>>(
        "/admin/daycare/documents",
        cleanPayload(document)
    );

    return response.data.data;
};

export const updateDaycareDocument = async (
    id: string,
    document: Partial<EditableDaycareDocument>
) => {
    const response = await http.patch<ApiResponse<DaycareDocument>>(
        `/admin/daycare/documents/${id}`,
        cleanPayload(document)
    );

    return response.data.data;
};

export const deleteDaycareDocument = async (id: string) => {
    await http.delete(`/admin/daycare/documents/${id}`);
};

export const getDaycareFinance = async () => {
    const response = await http.get<ApiResponse<DaycareFinanceSettings>>(
        "/admin/daycare/finance"
    );

    return response.data.data;
};

export const updateDaycareFinance = async (
    settings: DaycareFinanceSettings
) => {
    const response = await http.patch<ApiResponse<DaycareFinanceSettings>>(
        "/admin/daycare/finance",
        settings
    );

    return response.data.data;
};
