import { Router } from "express";
import { DaycareEnrollment } from "../models/DaycareEnrollment";
import { requireAdmin } from "../middleware/adminAuth";
import type {
    DaycareEnrollmentStatus,
    IDaycareEnrollment,
} from "../types/daycareEnrollment";

const router = Router();

const validStatuses: DaycareEnrollmentStatus[] = [
    "submitted",
    "reviewed",
    "approved",
    "missingDocuments",
    "rejected",
];

const asRecord = (value: unknown): Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};

const cleanDigits = (value: unknown) =>
    typeof value === "string" ? value.replace(/\D/g, "") : value;

const normalizeEnrollmentPayload = (value: unknown) => {
    const body = asRecord(value);
    const child = asRecord(body.child);
    const parents = asRecord(body.parents);
    const signature = asRecord(body.signature);

    return {
        ...body,
        child: {
            ...child,
            israeliId: cleanDigits(child.israeliId),
        },
        parents: {
            ...parents,
            motherPhone: cleanDigits(parents.motherPhone),
            fatherPhone: cleanDigits(parents.fatherPhone),
            motherIsraeliId: cleanDigits(parents.motherIsraeliId),
            fatherIsraeliId: cleanDigits(parents.fatherIsraeliId),
        },
        emergencyContacts: Array.isArray(body.emergencyContacts)
            ? body.emergencyContacts.map((value) => {
                  const contact = asRecord(value);
                  return {
                      ...contact,
                      phone: cleanDigits(contact.phone),
                  };
              })
            : body.emergencyContacts,
        status: "submitted",
        signature: {
            ...signature,
            signedAt: signature.signedAt || new Date(),
        },
    };
};

const isDuplicateKeyError = (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000;

router.post("/", async (req, res) => {
    try {
        const payload = normalizeEnrollmentPayload(req.body);
        // The schema remains the authority for validating this normalized
        // public payload; the cast only bridges the unknown-safe parser.
        const enrollment = await DaycareEnrollment.create(
            payload as unknown as IDaycareEnrollment
        );

        return res.status(201).json({
            success: true,
            data: enrollment,
        });
    } catch (error: unknown) {
        if (isDuplicateKeyError(error)) {
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
        const requestedStatus = asRecord(req.body).status;

        if (
            typeof requestedStatus !== "string" ||
            !validStatuses.includes(
                requestedStatus as DaycareEnrollmentStatus
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid enrollment status",
            });
        }

        const enrollment = await DaycareEnrollment.findByIdAndUpdate(
            req.params.id,
            { status: requestedStatus },
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
