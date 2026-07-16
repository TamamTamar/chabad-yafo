import type { ApiResponse } from "../types/api";
import http, { apiBaseUrl } from "./http";

export type DaycareParentDocumentKey = "routine" | "holidays" | "menu";
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
    items: Array<{ meal: string; description: string }>;
    note?: string;
}
export interface DaycareParentDocumentBundle {
    version: string;
    schoolYear: string;
    documents: {
        routine: DaycareRoutineDocument;
        holidays: DaycareHolidaysDocument;
        menu: DaycareMenuDocument;
    };
}
export interface AdminDaycareParentDocumentYear extends DaycareParentDocumentBundle {
    lockedAt?: string;
    createdAt: string;
    updatedAt: string;
}

const encode = encodeURIComponent;

export const getCurrentDaycareParentDocuments = async () => {
    const response = await http.get<ApiResponse<DaycareParentDocumentBundle>>("/daycare/parent-documents/current");
    return response.data.data;
};

export const currentParentDocumentPdfUrl = (key: DaycareParentDocumentKey) =>
    `${apiBaseUrl}/daycare/parent-documents/current/${key}/pdf`;

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
