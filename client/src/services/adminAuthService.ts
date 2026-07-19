import http from "./http";

export const loginAdmin = async (password: string) => {
    const response = await http.post("/auth/login", { password });

    if (typeof response.data.token === "string") {
        window.sessionStorage.setItem("local_admin_token", response.data.token);
    }

    return response.data;
};

export const getAdminSession = async () => {
    const response = await http.get("/auth/me");
    return response.data;
};

export const logoutAdmin = async () => {
    try {
        const response = await http.post("/auth/logout");
        return response.data;
    } finally {
        window.sessionStorage.removeItem("local_admin_token");
    }
};
