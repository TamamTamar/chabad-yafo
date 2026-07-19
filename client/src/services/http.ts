import axios from "axios";

export const apiBaseUrl = import.meta.env.VITE_API_URL
    ?? "/api";

const http = axios.create({
    baseURL: apiBaseUrl,
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true,
});

http.interceptors.request.use((config) => {
    const localAdminToken = window.sessionStorage.getItem("local_admin_token");

    if (localAdminToken) {
        config.headers.Authorization = `Bearer ${localAdminToken}`;
    }

    return config;
});

http.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            const isAdminPage = window.location.pathname.startsWith("/admin");
            const isLoginPage = window.location.pathname === "/admin/login";

            if (isAdminPage && !isLoginPage) {
                window.location.replace("/admin/login");
            }
        }

        return Promise.reject(error);
    }
);

export default http;
