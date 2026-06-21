import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

type AdminPayload = {
    role: "admin";
};

const adminCookieName = "admin_token";

const getCookie = (cookieHeader: string | undefined, name: string) => {
    if (!cookieHeader) {
        return null;
    }

    const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
    const matchingCookie = cookies.find((cookie) => cookie.startsWith(`${name}=`));

    if (!matchingCookie) {
        return null;
    }

    return decodeURIComponent(matchingCookie.slice(name.length + 1));
};

export const requireAdmin = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const authHeader = req.headers.authorization;
    const cookieToken = getCookie(req.headers.cookie, adminCookieName);
    const bearerToken = authHeader?.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null;
    const token = cookieToken ?? bearerToken;

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized",
        });
    }

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET as string
        ) as AdminPayload;

        if (decoded.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Forbidden",
            });
        }

        next();
    } catch {
        return res.status(401).json({
            success: false,
            message: "Invalid token",
        });
    }
};
