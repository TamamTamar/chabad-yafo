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
            if (window.location.pathname.startsWith("/admin")) {
                window.location.href = "/admin/login";
            }
        }

        return Promise.reject(error);
    }
);

export default http;
