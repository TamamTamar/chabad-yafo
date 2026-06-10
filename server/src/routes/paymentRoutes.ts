import express, { Router } from "express";

import { Payment } from "../models/PaymentModel";
import type { PaymentDataToSave } from "../types/payment";

const router = Router();

const toNum = (value: unknown): number => {
    const num = Number.parseFloat(
        String(value ?? "").replace(/[^\d.-]/g, "")
    );

    return Number.isFinite(num) ? num : 0;
};

const toInt = (value: unknown): number => {
    const num = Number.parseInt(
        String(value ?? "").replace(/[^\d-]/g, ""),
        10
    );

    return Number.isFinite(num) ? num : 0;
};

router.post("/payment-callback", express.json(), async (req, res) => {
    try {
        const body = req.body ?? {};

        console.log("Nedarim callback:", JSON.stringify(body, null, 2));

        const statusOk =
            String(body.Status ?? "").trim().toUpperCase() === "OK";

        if (!statusOk) {
            console.log("Nedarim payment declined:", body);
            return res.status(200).send("OK");
        }

        const amount = toNum(body.Amount);
        const tashlumim = toInt(body.Tashlumim ?? body.Tashloumim ?? 1) || 1;
        const transactionType = String(body.TransactionType ?? "").trim();
        const comments = String(body.Comments ?? "").trim();

        const isHK =
            /HK|הקמ|הו.?ק/i.test(transactionType) ||
            String(body.KevaId ?? "").trim() !== "";

        const paymentType: "HK" | "Ragil" = isHK ? "HK" : "Ragil";

        const normalizedTotal =
            paymentType === "HK"
                ? amount * tashlumim
                : amount;

        const clientName = String(body.ClientName ?? "").trim();
        const [firstName = "", ...lastNameParts] = clientName.split(/\s+/);
        const lastName = lastNameParts.join(" ");

        const paymentToSave: PaymentDataToSave = {
            FirstName: firstName,
            LastName: lastName,
            Phone: String(body.Phone ?? "").trim(),
            Mail: String(body.Mail ?? "").trim(),
            PaymentType: paymentType,
            Amount: amount,
            Tashlumim: tashlumim,
            NormalizedTotal: normalizedTotal,

            lizchut: comments,
        };

        await Payment.create(paymentToSave);

        console.log("Payment saved:", paymentToSave);

        return res.status(200).send("OK");
    } catch (error) {
        console.error("payment-callback error:", error);

        return res.status(200).send("OK");
    }
});

export { router as paymentRoutes };