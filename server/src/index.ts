import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { healthRoutes } from "./routes/healthRoutes";
import { shabbatRoutes } from "./routes/shabbatRoutes";
import { connectDB } from "./config/connectDB";
import { familyRoutes } from "./routes/familyRoutes";
import { adminRoutes } from "./routes/adminRoutes";
import { adminAuthRoutes } from "./routes/adminAuth";
import { paymentRoutes } from "./routes/paymentRoutes";
import { logger } from "./utils/logger";
import { rebbeLetterRoutes } from "./routes/rebbeLetterRoutes";
import { daycareRegistrationRoutes } from "./routes/daycareRegistrationRoutes";

dotenv.config();

const app = express();

logger.log("SERVER STARTING");

app.set("trust proxy", 1);

const allowedOrigins = [
    process.env.CLIENT_ORIGIN,
    "https://www.chabadyafo.org",
    "https://chabadyafo.org",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
].filter(Boolean) as string[];

app.use(
    cors({
        origin: allowedOrigins,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
    })
);

app.use(express.json());

app.get("/", (_req, res) => res.send("OK"));

app.use("/api/health", healthRoutes);
app.use("/api/shabbat", shabbatRoutes);
app.use("/api/families", familyRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/auth", adminAuthRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/rebbe-letters", rebbeLetterRoutes);
app.use("/api/daycare-registrations", daycareRegistrationRoutes);

const port = Number(process.env.PORT) || 4000;

const startServer = async () => {
    try {
        logger.log("Connecting to Mongo...");
        await connectDB();
        logger.log("Mongo finished");

        app.listen(port, () => {
            logger.log(`✅ Server listening on ${port}`);
        });
    } catch (error) {
        console.error("❌ Server failed to start");
        console.error(error);

        process.exit(1);
    }
};

startServer();
