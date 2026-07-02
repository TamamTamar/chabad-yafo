import { Router } from "express";
import { DaycareEnrollment } from "../models/DaycareEnrollment";
import { requireAdmin } from "../middleware/adminAuth";
import type { DaycareEnrollmentStatus } from "../types/daycareEnrollment";

const router = Router();

const validStatuses: DaycareEnrollmentStatus[] = [
    "submitted",
    "reviewed",
    "approved",
    "missingDocuments",
    "rejected",
];

const cleanDigits = (value: unknown) =>
    typeof value === "string" ? value.replace(/\D/g, "") : value;

const normalizeEnrollmentPayload = (body: any) => ({
    ...body,
    child: {
        ...body.child,
        israeliId: cleanDigits(body.child?.israeliId),
    },
    parents: {
        ...body.parents,
        motherPhone: cleanDigits(body.parents?.motherPhone),
        fatherPhone: cleanDigits(body.parents?.fatherPhone),
        motherIsraeliId: cleanDigits(body.parents?.motherIsraeliId),
        fatherIsraeliId: cleanDigits(body.parents?.fatherIsraeliId),
    },
    emergencyContacts: Array.isArray(body.emergencyContacts)
        ? body.emergencyContacts.map((contact: any) => ({
              ...contact,
              phone: cleanDigits(contact.phone),
          }))
        : body.emergencyContacts,
    status: "submitted",
    signature: {
        ...body.signature,
        signedAt: body.signature?.signedAt || new Date(),
    },
});

router.post("/", async (req, res) => {
    try {
        const payload = normalizeEnrollmentPayload(req.body);
        const enrollment = await DaycareEnrollment.create(payload);

        return res.status(201).json({
            success: true,
            data: enrollment,
        });
    } catch (error: any) {
        if (error?.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "כבר קיימת הרשמה עם תעודת הזהות של הילד/ה.",
            });
        }

        return res.status(400).json({
            success: false,
            message: "אירעה שגיאה בשמירת ההרשמה. בדקו את הפרטים ונסו שוב.",
        });
    }
});

router.get("/", requireAdmin, async (_req, res) => {
    try {
        const enrollments = await DaycareEnrollment.find().sort({
            createdAt: -1,
        });

        return res.json({
            success: true,
            data: enrollments,
        });
    } catch {
        return res.status(500).json({
            success: false,
            message: "Failed to get daycare enrollments",
        });
    }
});

router.patch("/:id/status", requireAdmin, async (req, res) => {
    try {
        if (!validStatuses.includes(req.body.status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid enrollment status",
            });
        }

        const enrollment = await DaycareEnrollment.findByIdAndUpdate(
            req.params.id,
            { status: req.body.status },
            { new: true, runValidators: true }
        );

        if (!enrollment) {
            return res.status(404).json({
                success: false,
                message: "Enrollment not found",
            });
        }

        return res.json({
            success: true,
            data: enrollment,
        });
    } catch {
        return res.status(400).json({
            success: false,
            message: "Failed to update daycare enrollment",
        });
    }
});

export { router as daycareEnrollmentRoutes };
