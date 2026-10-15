import mongoose from "mongoose";
import { logger } from "../utils/logger";
import { monitorMongoConnection } from "./mongoConnectionDiagnostics";

export const connectDB = async () => {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
        console.error("❌ MONGO_URI environment variable is missing");
        throw new Error("MONGO_URI is missing");
    }

    monitorMongoConnection(mongoose.connection);
    await mongoose.connect(mongoUri);

    logger.log("✅ MongoDB Connected");
};
