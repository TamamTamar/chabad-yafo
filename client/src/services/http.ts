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

    // Axios removes Content-Type from bodyless DELETE requests. Admin mutations
    // intentionally require JSON as a CSRF safeguard, so keep DELETE requests
    // compliant by sending an explicit empty JSON object.
    if (
        config.method?.toLowerCase() === "delete" &&
        config.url?.startsWith("/admin/") &&
        config.data === undefined
    ) {
        config.data = {};
        config.headers["Content-Type"] = "application/json";
    }

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
