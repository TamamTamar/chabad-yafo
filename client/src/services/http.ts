import axios from "axios";

const http = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:4000",
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: false, // אם בעתיד תעבדי עם cookies/auth -> אפשר לשנות ל-true
});

http.interceptors.response.use(
    (response) => response,
    (error) => Promise.reject(error)
);

export default http;
