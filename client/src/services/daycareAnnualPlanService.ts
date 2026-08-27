import type { ApiResponse } from "../types/api";
import http, { apiBaseUrl } from "./http";

export interface DaycareAnnualPlan {
    schoolYear: string;
    key: "annualPlan";
    title: string;
    schoolYearLabel: string;
    startDate: string;
    endDate: string;
    filename: string;
    calendar: {
        vacations: Array<{ name: string; startDate: string; endDate: string }>;
        anchors: Array<{ name: string; date: string; topics: string[] }>;
        specialEvents: Array<{ name: string; date: string }>;
    };
    items: Array<{ month: string; dateRange: string; topic: string; specialEvent?: string }>;
    createdAt?: string;
    updatedAt?: string;
    sharedWithParents: boolean;
}

export type EditableDaycareAnnualPlan = Omit<DaycareAnnualPlan, "schoolYear" | "createdAt" | "updatedAt" | "sharedWithParents"> & { sharedWithParents?: boolean };

export const listAdminDaycareAnnualPlans = async () => {
    const response = await http.get<ApiResponse<DaycareAnnualPlan[]>>("/admin/daycare/annual-plans");
    return response.data.data;
};

export const saveAdminDaycareAnnualPlan = async (schoolYear: string, plan: EditableDaycareAnnualPlan) => {
    const response = await http.put<ApiResponse<DaycareAnnualPlan>>(`/admin/daycare/annual-plans/${encodeURIComponent(schoolYear)}`, { plan });
    return response.data.data;
};

export const previewAdminDaycareAnnualPlan = async (plan: EditableDaycareAnnualPlan) => {
    const response = await http.post<Blob>("/admin/daycare/annual-plans/preview", { plan }, { responseType: "blob" });
    return response.data;
};

export const deleteAdminDaycareAnnualPlan = async (schoolYear: string) => {
    await http.delete(`/admin/daycare/annual-plans/${encodeURIComponent(schoolYear)}`);
};

export const syncAdminDaycareAnnualPlanHolidays = async (schoolYear: string) => {
    const response = await http.post<ApiResponse<DaycareAnnualPlan>>(`/admin/daycare/annual-plans/${encodeURIComponent(schoolYear)}/sync-holidays`, {});
    return response.data.data;
};

export const updateAdminDaycareAnnualPlanSharing = async (schoolYear: string, shared: boolean) => {
    const response = await http.patch<ApiResponse<DaycareAnnualPlan>>(`/admin/daycare/annual-plans/${encodeURIComponent(schoolYear)}/sharing`, { shared });
    return response.data.data;
};

export const adminDaycareAnnualPlanPdfUrl = (schoolYear: string) =>
    `${apiBaseUrl}/admin/daycare/annual-plans/${encodeURIComponent(schoolYear)}/pdf`;
