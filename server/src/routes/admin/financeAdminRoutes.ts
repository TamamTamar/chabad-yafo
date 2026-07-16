import { Router } from "express";
import { requireAdmin } from "../../middleware/adminAuth";
import { FinanceEntryModel } from "../../models/FinanceEntry";
import { getAllPayments } from "../../services/adminService";
import {
    getCategorySummary,
    getFinanceEntryPayload,
    getFinanceSummary,
    getMonthRange,
    getWebsitePaymentTitle,
} from "./financeHelpers";

const router = Router();

router.get("/finance", requireAdmin, async (req, res) => {
    try {
        const monthRange = getMonthRange(req.query.month);
        const dateFilter = monthRange
            ? {
                  createdAt: {
                      $gte: monthRange.start,
                      $lt: monthRange.end,
                  },
              }
            : {};
        const occurredAtFilter = monthRange
            ? {
                  occurredAt: {
                      $gte: monthRange.start,
                      $lt: monthRange.end,
                  },
              }
            : {};

        const [payments, manualEntries] = await Promise.all([
            getAllPayments(dateFilter),
            FinanceEntryModel.find(occurredAtFilter).sort({
                occurredAt: -1,
                createdAt: -1,
            }),
        ]);

        const websiteEntries = payments.map((payment) => {
            const paymentWithDates = payment as typeof payment & {
                createdAt?: Date;
                updatedAt?: Date;
            };

            return {
                _id: `payment-${payment._id}`,
                type: "income" as const,
                source: "website",
                category: "תרומות מהאתר",
                title: getWebsitePaymentTitle(payment),
                amount: payment.NormalizedTotal,
                occurredAt: paymentWithDates.createdAt || new Date(),
                donorName: [payment.FirstName, payment.LastName]
                    .filter(Boolean)
                    .join(" "),
                phone: payment.Phone,
                email: payment.Mail,
                notes: payment.lizchut,
                linkedPaymentId: payment._id,
                createdAt: paymentWithDates.createdAt,
                updatedAt: paymentWithDates.updatedAt,
            };
        });

        const allEntries = [...websiteEntries, ...manualEntries].sort(
            (entryA, entryB) =>
                new Date(entryB.occurredAt).getTime() -
                new Date(entryA.occurredAt).getTime()
        );

        return res.json({
            success: true,
            data: {
                summary: getFinanceSummary(allEntries),
                categorySummary: getCategorySummary(allEntries),
                entries: allEntries,
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to get finance overview",
        });
    }
});

router.post("/finance-entries", requireAdmin, async (req, res) => {
    try {
        const payload = getFinanceEntryPayload(req.body);
        const entry = await FinanceEntryModel.create(payload);

        return res.status(201).json({
            success: true,
            data: entry,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: "Failed to create finance entry",
        });
    }
});

export { router as financeAdminRoutes };
