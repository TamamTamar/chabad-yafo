import express from "express";
import cors from "cors";
import { env } from "./config/env";
import health from "./routes/health";
import shabbat from "./routes/shabbat";


export const createApp = () => {
    const app = express();

    // CORS
    // בלוקאל אפשר להשאיר CLIENT_ORIGIN ריק, ואז נכניס localhost
    const allowedOrigins = [
        env.CLIENT_ORIGIN,
        "http://localhost:5173",
        "http://localhost:3000",
    ].filter(Boolean);

    app.use(
        cors({
            origin: allowedOrigins,
            methods: ["GET", "POST", "OPTIONS"],
        })
    );

    app.use(express.json());

    // Routes
    app.use(health);
    app.use(shabbat);

    return app;
};
