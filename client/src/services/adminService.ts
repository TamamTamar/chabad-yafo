import http from "./http";

// Get all families (for admin use)
export const getAllFamilies = async () => {
    const response = await http.get("/admin/families");
    return response.data.data;
};