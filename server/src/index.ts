import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { healthRoutes } from "./routes/health";
import { shabbatRoutes } from "./routes/shabbat";


const app = express();

/**
 * CORS
 */
const allowedOrigins = [
    env.CLIENT_ORIGIN,          // פרודקשן
    "http://localhost:5173",    // פיתוח
].filter(Boolean);

app.use(
    cors({
        origin: allowedOrigins,
        methods: ["GET", "POST", "OPTIONS"],
    })
);

/**
 * Body parser
 */
app.use(express.json());

/**
 * Routes
 */
app.use("/health", healthRoutes);              // למשל /health
app.use("/api", shabbatRoutes);     // למשל /api/shabbat-registrations

/**
 * Fallback (אופציונלי אבל מומלץ)
 */
app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
});

/**
 * Start server
 */
const port = Number(env.PORT) || 4000;

app.listen(port, () => {
    console.log(`✅ Server listening on port ${port}`);
});
