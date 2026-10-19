import mongoose from "mongoose";
import { logger } from "../utils/logger";
import { monitorMongoConnection } from "./mongoConnectionDiagnostics";
import { mongoConnectionPolicy } from "./mongoSafety";
export const connectDB = async () => {
    const policy = mongoConnectionPolicy(); // Validate before opening any socket.
    monitorMongoConnection(mongoose.connection);
    await mongoose.connect(policy.uri, { autoIndex:false, autoCreate:false });
    if (policy.managed) {
        const marker = await mongoose.connection.db!.collection('__runtime_identity').findOne({ _id:'managed-runtime' as any });
        if (!marker || marker.nonce !== policy.managed.nonce || marker.mode !== policy.managed.mode || mongoose.connection.name !== policy.managed.database) {
            await mongoose.disconnect();
            throw new Error('MANAGED_MONGO_IDENTITY_MISMATCH');
        }
    }
    logger.log("MongoDB connection policy and identity verified");
};
