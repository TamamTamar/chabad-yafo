import { Family } from "../models/Family";
import { Payment } from "../models/PaymentModel";
import { rebbeLetter } from "../models/RebbeLetterModel";

const allowedRebbeLetterStatuses = [
    "new",
    "printed",
    "sentToOhel",
    "handled",
] as const;

export type RebbeLetterStatus =
    (typeof allowedRebbeLetterStatuses)[number];

export const getAllFamilies = async () => {
    return Family.find().sort({ createdAt: -1 });
};

export const getAllRebbeLetters = async () => {
    return rebbeLetter.find().sort({ createdAt: -1 });
};

export const getAllPayments = async () => {
    return Payment.find().sort({ createdAt: -1 });
};

export const isValidRebbeLetterStatus = (
    status: string
): status is RebbeLetterStatus => {
    return allowedRebbeLetterStatuses.includes(
        status as RebbeLetterStatus
    );
};

export const updateRebbeLetterStatus = async (
    id: string,
    status: RebbeLetterStatus
) => {
    return rebbeLetter.findByIdAndUpdate(
        id,
        {
            status,
            updatedStatusAt: new Date(),
        },
        { new: true }
    );
};
