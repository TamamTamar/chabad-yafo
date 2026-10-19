import { shifraPuaPublicRoutes, shifraPuaAdminRoutes } from './routes/shifraPuaRoutes';
import { maftirYonaPublicRoutes, maftirYonaAdminRoutes } from "./routes/maftirYonaRoutes";
import { arbaatHaminimAdminRoutes, arbaatHaminimPublicRoutes } from "./routes/arbaatHaminimRoutes";
import express from "express";
import cors from "cors";
import { createHash } from "node:crypto";
import { mongoConnectionPolicy } from "./config/mongoSafety";
import { loadRuntimeEnvironment } from "./config/runtimeEnvironment";
import { healthRoutes } from "./routes/healthRoutes";
import { shabbatRoutes } from "./routes/shabbatRoutes";
import { connectDB } from "./config/connectDB";
import { reportStartupFailure } from "./config/mongoConnectionDiagnostics";
import { familyRoutes } from "./routes/familyRoutes";
import { adminRoutes } from "./routes/adminRoutes";
import { adminAuthRoutes } from "./routes/adminAuth";
import { paymentRoutes } from "./routes/paymentRoutes";
import { logger } from "./utils/logger";
import { rebbeLetterRoutes } from "./routes/rebbeLetterRoutes";
import { daycareRegistrationRoutes } from "./routes/daycareRegistrationRoutes";
import { daycareEnrollmentRoutes } from "./routes/daycareEnrollmentRoutes";
import {
    daycareOnboardingAdminRoutes,
    daycareOnboardingPublicRoutes,
} from "./routes/daycareOnboardingRoutes";
import { daycareAgreementAdminRoutes, daycareAgreementPublicRoutes } from "./routes/daycareAgreementRoutes";
import { projectRoutes } from "./routes/projectRoutes";
import { daycareParentDocumentAdminRoutes, daycareParentDocumentRoutes } from "./routes/daycareParentDocumentRoutes";
import { daycareAnnualPlanAdminRoutes } from "./routes/daycareAnnualPlanRoutes";
import { daycareHealthDeclarationAdminRoutes, daycareHealthDeclarationPublicRoutes } from "./routes/daycareHealthDeclarationRoutes";
import { daycarePickupAuthorizationAdminRoutes, daycarePickupAuthorizationPublicRoutes } from "./routes/daycarePickupAuthorizationRoutes";
import { daycareDonationRoutes } from "./routes/daycareDonationRoutes";
import { daycareDonationAdminRoutes } from "./routes/admin/daycareDonationAdminRoutes";
import { daycarePaymentAdminRoutes, daycarePaymentPublicRoutes } from "./routes/daycarePaymentRoutes";
import { chatAssistantRoutes } from "./routes/chatAssistantRoutes";

loadRuntimeEnvironment();

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

app.use("/api/maftir-yona", maftirYonaPublicRoutes);
app.use("/api/admin/maftir-yona", maftirYonaAdminRoutes);
app.use("/api/arbaat-haminim", arbaatHaminimPublicRoutes);
app.use("/api/admin/arbaat-haminim", arbaatHaminimAdminRoutes);
app.use("/api/shifra-pua", shifraPuaPublicRoutes);
app.use("/api/admin/shifra-pua", shifraPuaAdminRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/shabbat", shabbatRoutes);
app.use("/api/families", familyRoutes);
app.use(
    "/api/daycare/onboarding/public",
    daycareOnboardingPublicRoutes
);
app.use("/api/daycare/agreements/public", daycareAgreementPublicRoutes);
app.use("/api/daycare/parent-documents", daycareParentDocumentRoutes);
app.use("/api/daycare/health-declarations/public", daycareHealthDeclarationPublicRoutes);
app.use("/api/daycare/pickup-authorizations/public", daycarePickupAuthorizationPublicRoutes);
app.use("/api/daycare-donations", daycareDonationRoutes);
app.use("/api/daycare-payments", daycarePaymentPublicRoutes);
app.use("/api/admin/daycare/payments", daycarePaymentAdminRoutes);
app.use("/api/admin/daycare/donations", daycareDonationAdminRoutes);
app.use("/api/admin/daycare/parent-documents", daycareParentDocumentAdminRoutes);
app.use("/api/admin/daycare/annual-plans", daycareAnnualPlanAdminRoutes);
app.use("/api/admin/daycare/health-declarations", daycareHealthDeclarationAdminRoutes);
app.use("/api/admin/daycare/pickup-authorizations", daycarePickupAuthorizationAdminRoutes);
app.use("/api/admin/daycare/agreements", daycareAgreementAdminRoutes);
app.use(
    "/api/admin/daycare/onboarding",
    daycareOnboardingAdminRoutes
);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/projects", projectRoutes);
app.use("/api/auth", adminAuthRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/rebbe-letters", rebbeLetterRoutes);
app.use("/api/daycare-registrations", daycareRegistrationRoutes);
app.use("/api/daycare-enrollments", daycareEnrollmentRoutes);
app.use("/api/assistant", chatAssistantRoutes);

const port = Number(process.env.PORT) || 4000;

const startServer = async () => {
    try {
        logger.log("Connecting to Mongo...");
        await connectDB();
        if (!process.argv.includes('--production')) {
            const managed = mongoConnectionPolicy().managed!;
            app.get('/__safe-runtime', (_req, res) => res.json({ proof:createHash('sha256').update(managed.nonce).digest('hex') }));
        }
        // Index creation, seeds, reconciliation and backfills are explicit maintenance actions.
        logger.log("Mongo finished");

        app.listen(port, process.argv.includes('--production') ? "0.0.0.0" : "127.0.0.1", () => {
            logger.log(`✅ Server listening on ${port}`);
        });
    } catch (error) {
        reportStartupFailure(error);

        process.exit(1);
    }
};

startServer();
