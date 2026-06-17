import http from "./http";
import type {
    RebbeLetterAdmin,
    RebbeLetterStatus,
} from "../types/chabad";
import type { FamilyAdmin } from "../types/family";
import type { ApiResponse } from "../types/api";



export const getAllFamilies = async () => {
    const response = await http.get<ApiResponse<FamilyAdmin[]>>(
        "/admin/families"
    );

    return response.data.data;
};

export const getAllRebbeLetters = async () => {
    const response = await http.get<ApiResponse<RebbeLetterAdmin[]>>(
        "/admin/rebbe-letters"
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