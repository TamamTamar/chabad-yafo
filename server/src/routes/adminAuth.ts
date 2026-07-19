import { Router, type Request } from "express";
import jwt from "jsonwebtoken";
import { requireAdmin } from "../middleware/adminAuth";

const router = Router();
const adminCookieName = "admin_token";
const adminTokenMaxAgeMs = 7 * 24 * 60 * 60 * 1000;

const isLocalAdminRequest = (req: Request) => {
    const origin = req.get("origin") ?? "";
    const localHostnames = new Set(["localhost", "127.0.0.1", "::1"]);

    return localHostnames.has(req.hostname) ||
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:");
};

const getAdminCookieOptions = (req: Request) => {
    const isSecureRequest = !isLocalAdminRequest(req) && req.secure;

    return {
        httpOnly: true,
        secure: isSecureRequest,
        sameSite: isSecureRequest ? "none" as const : "lax" as const,
        path: "/",
    };
};

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
        ...getAdminCookieOptions(req),
        maxAge: adminTokenMaxAgeMs,
    });

    res.json({
        success: true,
        token: isLocalAdminRequest(req) ? token : undefined,
    });
});

router.get("/me", requireAdmin, (_req, res) => {
    res.json({
        success: true,
        admin: true,
    });
});

router.post("/logout", (req, res) => {
    res.clearCookie(adminCookieName, getAdminCookieOptions(req));

    res.json({
        success: true,
    });
});

export { router as adminAuthRoutes };
