import { Router } from "express";
import { requireAdmin } from "../../middleware/adminAuth";
import { DaycareDocument } from "../../models/DaycareDocument";
import { ensureDefaultDocuments } from "./daycareAdminService";

const router = Router();

router.get("/daycare/documents", requireAdmin, async (_req, res) => {
    try {
        await ensureDefaultDocuments();
        const documents = await DaycareDocument.find().sort({ createdAt: 1 });

        return res.json({
            success: true,
            data: documents,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to get daycare documents",
        });
    }
});

router.post("/daycare/documents", requireAdmin, async (req, res) => {
    try {
        const document = await DaycareDocument.create(req.body);

        return res.status(201).json({
            success: true,
            data: document,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: "Failed to create daycare document",
        });
    }
});

router.patch("/daycare/documents/:id", requireAdmin, async (req, res) => {
    try {
        const document = await DaycareDocument.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true,
            }
        );

        if (!document) {
            return res.status(404).json({
                success: false,
                message: "Document not found",
            });
        }

        return res.json({
            success: true,
            data: document,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: "Failed to update daycare document",
        });
    }
});

router.delete("/daycare/documents/:id", requireAdmin, async (req, res) => {
    try {
        await DaycareDocument.findByIdAndDelete(req.params.id);

        return res.json({
            success: true,
            data: { id: req.params.id },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to delete daycare document",
        });
    }
});

export { router as daycareDocumentRoutes };
