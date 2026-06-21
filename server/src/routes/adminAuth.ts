import { Router } from "express";
import jwt from "jsonwebtoken";
import { requireAdmin } from "../middleware/adminAuth";

const router = Router();
const adminCookieName = "admin_token";
const adminTokenMaxAgeMs = 7 * 24 * 60 * 60 * 1000;

const isProduction =
    process.env.NODE_ENV === "production" ||
    process.env.RAILWAY_ENVIRONMENT === "production";

router.post("/login", (req, res) => {
    const { password } = req.body;

    if (!process.env.ADMIN_PASSWORD || !process.env.JWT_SECRET) {
        return res.status(500).json({
            success: false,
            message: "Admin auth is not configured",
        });
    }

    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({
            success: false,
            message: "סיסמה שגויה",
        });
    }

    const token = jwt.sign(
        { role: "admin" },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );

    res.cookie(adminCookieName, token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        path: "/",
        maxAge: adminTokenMaxAgeMs,
    });

    res.json({
        success: true,
    });
});

router.get("/me", requireAdmin, (_req, res) => {
    res.json({
        success: true,
        admin: true,
    });
});

router.post("/logout", (_req, res) => {
    res.clearCookie(adminCookieName, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        path: "/",
    });

    res.json({
        success: true,
    });
});

export { router as adminAuthRoutes };
