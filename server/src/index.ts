import express from "express";
import cors from "cors";
import { healthRoutes } from "./routes/health";
import { shabbatRoutes } from "./routes/shabbat";


const app = express();

// CORS הכי פשוט (ל־API בודד)
// אם את לא משתמשת ב-cookies/credentials אפשר להשאיר origin: "*"
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

// Routes
app.get("/", (_req, res) => res.send("OK"));
app.use("/api/health", healthRoutes);
app.use("/api/shabbat", shabbatRoutes);



const port = Number(process.env.PORT) || 4000;
app.listen(port, () => console.log(`✅ Server listening on ${port}`));
