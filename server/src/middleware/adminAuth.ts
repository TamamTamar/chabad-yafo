import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

type AdminPayload = {
    role: "admin";
};

export const requireAdmin = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized",
        });
    }

    const token = authHeader.split(" ")[1];

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