import http from "./http";

export const loginAdmin = async (password: string) => {
    const response = await http.post("/auth/login", { password });
    return response.data;
};

export const getAdminSession = async () => {
    const response = await http.get("/auth/me");
    return response.data;
};

export const logoutAdmin = async () => {
    const response = await http.post("/auth/logout");
    return response.data;
};
