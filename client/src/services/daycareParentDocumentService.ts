import type { ApiResponse } from "../types/api";
import http, { apiBaseUrl } from "./http";

export type DaycareParentDocumentKey = "welcome" | "routine" | "holidays" | "menu" | "equipment";
export interface DaycareWelcomeDocument {
    key: "welcome";
    title: string;
    subtitle: string;
    filename: string;
    intro: string[];
    hours: { weekdays: string; friday: string; address: string };
    day: string[];
    parents: string[];
    join: string[];
    contactName: string;
    contactPhone: string;
}
export interface DaycareRoutineDocument {
    key: "routine";
    title: string;
    subtitle: string;
    filename: string;
    items: Array<{ time: string; activity: string }>;
    note: string;
}
export interface DaycareHolidaysDocument {
    key: "holidays";
    title: string;
    subtitle: string;
    filename: string;
    items: Array<{ occasion: string; hebrewDate: string; vacationDates: string }>;
    clarifications: string[];
}
export interface DaycareMenuDocument {
    key: "menu";
    title: string;
    subtitle: string;
    filename: string;
    items: Array<{
        day: string;
        breakfast: string;
        lunch?: string;
        afternoon?: string;
    }>;
    note?: string;
}
export interface DaycareEquipmentDocument {
    key: "equipment";
    title: string;
    subtitle: string;
    filename: string;
    items: string[];
    important: string;
    note: string;
}
export interface DaycareParentDocumentBundle {
    version: string;
    schoolYear: string;
    documents: {
        welcome: DaycareWelcomeDocument;
        routine: DaycareRoutineDocument;
        holidays: DaycareHolidaysDocument;
        menu: DaycareMenuDocument;
        equipment: DaycareEquipmentDocument;
    };
}
export interface PublicDaycareParentDocumentBundle {
    version: string;
    schoolYear: string;
    sharedDocumentKeys: DaycareParentDocumentKey[];
    documents: Partial<DaycareParentDocumentBundle["documents"]>;
}
export interface AdminDaycareParentDocumentYear extends DaycareParentDocumentBundle {
    sharedDocumentKeys: DaycareParentDocumentKey[];
    lockedAt?: string;
    createdAt: string;
    updatedAt: string;
}

const encode = encodeURIComponent;

export const getCurrentDaycareParentDocuments = async () => {
    const response = await http.get<ApiResponse<PublicDaycareParentDocumentBundle>>("/daycare/parent-documents/current");
    return response.data.data;
};

export const currentParentDocumentPdfUrl = (key: DaycareParentDocumentKey) =>
    `${apiBaseUrl}/daycare/parent-documents/current/${key}/pdf`;

export const adminParentDocumentPdfUrl = (schoolYear: string, key: DaycareParentDocumentKey) =>
    `${apiBaseUrl}/admin/daycare/parent-documents/${encode(schoolYear)}/${key}/pdf`;

export const tokenParentDocumentPdfUrl = (token: string, key: DaycareParentDocumentKey) =>
    `${apiBaseUrl}/daycare/parent-documents/public/${encode(token)}/${key}/pdf`;

export const listAdminDaycareParentDocumentYears = async () => {
    const response = await http.get<ApiResponse<AdminDaycareParentDocumentYear[]>>("/admin/daycare/parent-documents");
    return response.data.data;
};

export const saveAdminDaycareParentDocumentYear = async (schoolYear: string, documents: DaycareParentDocumentBundle["documents"]) => {
    const response = await http.put<ApiResponse<AdminDaycareParentDocumentYear>>(
        `/admin/daycare/parent-documents/${encode(schoolYear)}`,
        { documents }
    );
    return response.data.data;
};

export const unlockAdminDaycareParentDocumentYear = async (schoolYear: string) => {
    const response = await http.post<ApiResponse<AdminDaycareParentDocumentYear>>(
        `/admin/daycare/parent-documents/${encode(schoolYear)}/unlock`,
        {}
    );
    return response.data.data;
};

export const updateAdminDaycareParentDocumentSharing = async (schoolYear: string, key: DaycareParentDocumentKey, shared: boolean) => {
    const response = await http.patch<ApiResponse<AdminDaycareParentDocumentYear>>(
        `/admin/daycare/parent-documents/${encode(schoolYear)}/${key}/sharing`,
        { shared }
    );
    return response.data.data;
};

export const tokenAnnualPlanPdfUrl = (token: string) =>
    `${apiBaseUrl}/daycare/parent-documents/public/${encode(token)}/annualPlan/pdf`;
