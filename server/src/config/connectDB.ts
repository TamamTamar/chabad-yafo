import mongoose from "mongoose";
import { logger } from "../utils/logger";

export const connectDB = async () => {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
        console.error("❌ MONGO_URI environment variable is missing");
        throw new Error("MONGO_URI is missing");
    }

    await mongoose.connect(mongoUri);

    logger.log("✅ MongoDB Connected");
};