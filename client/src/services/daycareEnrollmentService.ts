import type {
    DaycareEnrollmentAdmin,
    DaycareEnrollmentFormValues,
    DaycareEnrollmentStatus,
} from "../types/daycareEnrollment";
import type { ApiResponse } from "../types/api";
import http from "./http";

export const createDaycareEnrollment = async (
    data: DaycareEnrollmentFormValues
) => {
    const response = await http.post<ApiResponse<DaycareEnrollmentAdmin>>(
        "/daycare-enrollments",
        data
    );

    return response.data.data;
};

export const getDaycareEnrollments = async () => {
    const response = await http.get<ApiResponse<DaycareEnrollmentAdmin[]>>(
        "/daycare-enrollments"
    );

    return response.data.data;
};

export const updateDaycareEnrollmentStatus = async (
    id: string,
    status: DaycareEnrollmentStatus
) => {
    const response = await http.patch<ApiResponse<DaycareEnrollmentAdmin>>(
        `/daycare-enrollments/${id}/status`,
        { status }
    );

    return response.data.data;
};
