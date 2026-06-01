import http from "./http";

export const loginAdmin = async (password: string) => {
    const response = await http.post("/auth/login", { password });
    return response.data;
};