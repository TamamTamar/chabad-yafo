import { DaycareOnboarding } from "../models/DaycareOnboarding";
import { DaycarePayment } from "../models/DaycarePayment";

export const ensureDaycarePaymentStorage = async () => {
    await DaycarePayment.createIndexes();

    // Existing personal links predate tuition fields. A pipeline keeps any
    // configured values and initializes only missing values atomically.
    await DaycareOnboarding.collection.updateMany(
        {
            $or: [
                { monthlyTuitionAmount: { $exists: false } },
                { standingOrderStatus: { $exists: false } },
            ],
        },
        [
            {
                $set: {
                    monthlyTuitionAmount: { $ifNull: ["$monthlyTuitionAmount", 5500] },
                    standingOrderStatus: {
                        $ifNull: ["$standingOrderStatus", "pending"],
                    },
                },
            },
        ]
    );
};
