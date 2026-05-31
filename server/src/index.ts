import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { healthRoutes } from "./routes/healthRoutes";
import { shabbatRoutes } from "./routes/shabbatRoutes";
import { connectDB } from "./config/connectDB";
import { familyRoutes } from "./routes/familyRoutes";

dotenv.config();

const app = express();

console.log("SERVER STARTING");

app.use(
    cors({
        origin: [
            "https://www.chabadyafo.org",
            "https://chabadyafo.org",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ],
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

app.use(express.json());

app.get("/", (_req, res) => res.send("OK"));

app.use("/api/health", healthRoutes);
app.use("/api/shabbat", shabbatRoutes);
app.use("/api/families", familyRoutes);

const port = Number(process.env.PORT) || 4000;

const startServer = async () => {
    try {
        console.log("Connecting to Mongo...");
        await connectDB();
        console.log("Mongo finished");

        app.listen(port, () => {
            console.log(`✅ Server listening on ${port}`);
        });
    } catch (error) {
        console.error("❌ Server failed to start");
        console.error(error);

        process.exit(1);
    }
};

startServer();

