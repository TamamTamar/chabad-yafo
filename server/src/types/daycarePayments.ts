import type { Types } from "mongoose";

export type DaycarePaymentStatus = "created" | "confirmed" | "failed" | "expired";

export type DaycarePaymentDocument = {
    paymentType: "daycare_payment";
    providerPaymentType: "HK";
    installments: 12;
    publicId: string;
    onboardingId: Types.ObjectId;
    childId?: Types.ObjectId;
    childName: string;
    schoolYear: string;
    billingPeriod?: string;
    monthlyTuitionAmount: number;
    requestedAmount: number;
    paidAmount?: number;
    payerName?: string;
    payerPhone?: string;
    payerEmail?: string;
    externalTransactionId?: string;
    providerMessage?: string;
    status: DaycarePaymentStatus;
    expiresAt: Date;
    paidAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
};
