import type { ApiResponse } from "../types/api";
import type {
    AdminAgreementByOnboarding,
    DaycareAgreementSubmission,
    DaycareAgreementVersion,
    PublicDaycareAgreement,
    DaycareStructuredDocument,
    DaycareCorrectionDisposition,
} from "../types/daycareAgreement";
import http from "./http";

const encode = (value: string) => encodeURIComponent(value);

export const getPublicDaycareAgreement = async (token: string) => {
    const response = await http.get<ApiResponse<PublicDaycareAgreement>>(
        `/daycare/agreements/public/${encode(token)}`
    );
    return response.data.data;
};

export const signPublicDaycareAgreement = async (
    token: string,
    input: {
        signedBy: string;
        signerRole: "mother" | "father" | "guardian";
        signerIsraeliId: string;
        signature: Blob;
        parentDocumentsAccepted: boolean;
    }
) => {
    const formData = new FormData();
    formData.append("signedBy", input.signedBy);
    formData.append("signerRole", input.signerRole);
    formData.append("signerIsraeliId", input.signerIsraeliId);
    formData.append("acceptedTerms", "true");
    formData.append("parentDocumentsAccepted", String(input.parentDocumentsAccepted));
    formData.append("signature", input.signature, "signature.png");
    const response = await http.post<ApiResponse<Omit<DaycareAgreementSubmission, "id">>>(
        `/daycare/agreements/public/${encode(token)}/sign`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
    );
    return response.data.data;
};

export const downloadPublicSignedAgreement = async (token: string) => {
    const response = await http.get<Blob>(
        `/daycare/agreements/public/${encode(token)}/signed-copy`,
        { responseType: "blob" }
    );
    return response.data;
};

export const downloadPublicDaycareAgreementPdf = async (token: string) => {
    const response = await http.get<Blob>(
        `/daycare/agreements/public/${encode(token)}/pdf`,
        { responseType: "blob" }
    );
    return response.data;
};

export const uploadPublicSignedAgreementPdf = async (token: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await http.post<ApiResponse<Omit<DaycareAgreementSubmission, "id">>>(
        `/daycare/agreements/public/${encode(token)}/upload-signed-pdf`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
    );
    return response.data.data;
};

export const listAdminAgreementVersions = async () => {
    const response = await http.get<ApiResponse<DaycareAgreementVersion[]>>(
        "/admin/daycare/agreements/versions"
    );
    return response.data.data;
};

export const createAdminAgreementDraft = async (input: {
    version: string;
    schoolYear: string;
    document: DaycareStructuredDocument;
}) => {
    const response = await http.post<ApiResponse<DaycareAgreementVersion>>(
        "/admin/daycare/agreements/versions",
        input
    );
    return response.data.data;
};

export const updateAdminAgreementDraft = async (
    id: string,
    document: DaycareStructuredDocument
) => {
    const response = await http.patch<ApiResponse<DaycareAgreementVersion>>(
        `/admin/daycare/agreements/versions/${encode(id)}`,
        { document }
    );
    return response.data.data;
};

export const publishAdminAgreementDraft = async (id: string) => {
    const response = await http.post<ApiResponse<DaycareAgreementVersion>>(
        `/admin/daycare/agreements/versions/${encode(id)}/publish`,
        { legalReviewConfirmed: true }
    );
    return response.data.data;
};

export const getAdminAgreementByOnboarding = async (onboardingId: string) => {
    const response = await http.get<ApiResponse<AdminAgreementByOnboarding>>(
        `/admin/daycare/agreements/by-onboarding/${encode(onboardingId)}`
    );
    return response.data.data;
};

export const reviewAdminAgreement = async (
    agreementId: string,
    status: "completed" | "requiresCorrection",
    parentMessage?: string,
    correctionDisposition?: DaycareCorrectionDisposition
) => {
    const response = await http.patch<ApiResponse<DaycareAgreementSubmission>>(
        `/admin/daycare/agreements/${encode(agreementId)}/review`,
        { status, parentMessage, correctionDisposition }
    );
    return response.data.data;
};

export const downloadAdminAgreementFile = async (
    agreementId: string,
    kind: "signature" | "signedPdf"
) => {
    const response = await http.get<Blob>(
        `/admin/daycare/agreements/${encode(agreementId)}/files/${kind}`,
        { responseType: "blob" }
    );
    return response.data;
};
