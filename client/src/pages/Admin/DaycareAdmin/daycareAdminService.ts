import http from "../../../services/http";
import type { ApiResponse } from "../../../types/api";
import type {
    DaycareDocument,
    DaycareFinanceSettings,
    DaycareOverview,
    DaycareRegistrationsResponse,
    DaycareTask,
    EditableDaycareDocument,
    EditableDaycareTask,
} from "./types";
import type {
    DaycareInterestStatus,
    DaycareRegistrationAdmin,
} from "../../../types/daycareRegistration";

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

export const updateDaycareTaskSubtask = async (
    taskId: string,
    subtaskIndex: number,
    updates: Partial<NonNullable<DaycareTask["subtasks"]>[number]>
) => {
    const response = await http.patch<ApiResponse<DaycareTask>>(
        `/admin/daycare/tasks/${taskId}/subtasks/${subtaskIndex}`,
        cleanPayload(updates)
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

export const updateDaycarePublicRegistration = async (
    id: string,
    registration: Partial<DaycareRegistrationAdmin>
) => {
    const response = await http.patch<ApiResponse<DaycareRegistrationAdmin>>(
        `/admin/daycare/public-registrations/${id}`,
        cleanPayload(registration)
    );

    return response.data.data;
};

export const updateDaycarePublicRegistrationStatus = async (
    id: string,
    status: DaycareInterestStatus
) => updateDaycarePublicRegistration(id, { status });

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

const getFinancePayload = (settings: DaycareFinanceSettings) => ({
    pricePerChild: settings.pricePerChild ?? 0,
    currentChildren: settings.currentChildren ?? 0,
    targetChildren: settings.targetChildren ?? 0,
    rent: settings.rent ?? 0,
    directorSalary: settings.directorSalary ?? 0,
    staffSalaries: settings.staffSalaries ?? 0,
    food: settings.food ?? 0,
    supplies: settings.supplies ?? 0,
    insuranceAndPermits: settings.insuranceAndPermits ?? 0,
    extraExpenses: settings.extraExpenses ?? 0,
    renovationKitchen: settings.renovationKitchen ?? 0,
    renovationYard: settings.renovationYard ?? 0,
    renovationConstruction: settings.renovationConstruction ?? 0,
    renovationSafety: settings.renovationSafety ?? 0,
    renovationEquipment: settings.renovationEquipment ?? 0,
    renovationLabor: settings.renovationLabor ?? 0,
    renovationOther: settings.renovationOther ?? 0,
    monthlyCashflows: (settings.monthlyCashflows || []).map((cashflow) => ({
        month: cashflow.month,
        children: cashflow.children ?? 0,
        pricePerChild: cashflow.pricePerChild ?? 0,
        income: cashflow.income ?? 0,
        extraIncome: cashflow.extraIncome ?? 0,
        rent: cashflow.rent ?? 0,
        directorSalary: cashflow.directorSalary ?? 0,
        staffSalaries: cashflow.staffSalaries ?? 0,
        food: cashflow.food ?? 0,
        supplies: cashflow.supplies ?? 0,
        insuranceAndPermits: cashflow.insuranceAndPermits ?? 0,
        extraExpenses: cashflow.extraExpenses ?? 0,
        renovationKitchen: cashflow.renovationKitchen ?? 0,
        renovationYard: cashflow.renovationYard ?? 0,
        renovationConstruction: cashflow.renovationConstruction ?? 0,
        renovationSafety: cashflow.renovationSafety ?? 0,
        renovationEquipment: cashflow.renovationEquipment ?? 0,
        renovationLabor: cashflow.renovationLabor ?? 0,
        renovationOther: cashflow.renovationOther ?? 0,
        renovationRepayment: cashflow.renovationRepayment ?? 0,
    })),
});

export const updateDaycareFinance = async (
    settings: DaycareFinanceSettings
) => {
    const response = await http.patch<ApiResponse<DaycareFinanceSettings>>(
        "/admin/daycare/finance",
        getFinancePayload(settings)
    );

    return response.data.data;
};
