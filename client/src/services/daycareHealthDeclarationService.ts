import type { ApiResponse } from "../types/api";
import type { DaycareHealthDeclarationPayload, DaycareHealthDeclarationSubmission, DaycareHealthDeclarationStatus, PublicDaycareHealthDeclaration } from "../types/daycareHealthDeclaration";
import http from "./http";
import type { DaycareCorrectionDisposition } from "../types/daycareAgreement";

const encode = (value: string) => encodeURIComponent(value);

export const getPublicDaycareHealthDeclaration = async (token: string) => {
    const response = await http.get<ApiResponse<PublicDaycareHealthDeclaration>>(`/daycare/health-declarations/public/${encode(token)}`);
    return response.data.data;
};

export const submitPublicDaycareHealthDeclaration = async (token: string, payload: DaycareHealthDeclarationPayload, signature: Blob) => {
    const formData = new FormData();
    formData.append("payload", JSON.stringify(payload));
    formData.append("signature", signature, "health-signature.png");
    const response = await http.post<ApiResponse<DaycareHealthDeclarationSubmission>>(`/daycare/health-declarations/public/${encode(token)}/submit`, formData, { headers: { "Content-Type": "multipart/form-data" } });
    return response.data.data;
};

export const downloadPublicDaycareHealthDeclaration = async (token: string) => {
    const response = await http.get<Blob>(`/daycare/health-declarations/public/${encode(token)}/signed-copy`, { responseType: "blob" });
    return response.data;
};

export const downloadBlankPublicDaycareHealthDeclaration = async (token: string) => {
    const response = await http.get<Blob>(`/daycare/health-declarations/public/${encode(token)}/blank-form`, { responseType: "blob" });
    return response.data;
};

export const uploadPublicDaycareHealthDeclaration = async (token: string, document: File) => {
    const formData = new FormData();
    formData.append("document", document);
    const response = await http.post<ApiResponse<DaycareHealthDeclarationSubmission>>(`/daycare/health-declarations/public/${encode(token)}/upload`, formData, { headers: { "Content-Type": "multipart/form-data" } });
    return response.data.data;
};

export const getAdminDaycareHealthDeclaration = async (onboardingId: string) => {
    const response = await http.get<ApiResponse<DaycareHealthDeclarationSubmission | null>>(`/admin/daycare/health-declarations/by-onboarding/${encode(onboardingId)}`);
    return response.data.data;
};

export const reviewAdminDaycareHealthDeclaration = async (id: string, status: Exclude<DaycareHealthDeclarationStatus, "pendingReview">, parentMessage?: string, correctionDisposition?: DaycareCorrectionDisposition) => {
    const response = await http.patch<ApiResponse<DaycareHealthDeclarationSubmission>>(`/admin/daycare/health-declarations/${encode(id)}/review`, { status, parentMessage, correctionDisposition });
    return response.data.data;
};

export const downloadAdminDaycareHealthDeclaration = async (id: string) => {
    const response = await http.get<Blob>(`/admin/daycare/health-declarations/${encode(id)}/signed-copy`, { responseType: "blob" });
    return response.data;
};
