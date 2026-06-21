import axios from "axios";

const http = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:4000/api",
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true,
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
