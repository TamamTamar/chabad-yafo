import { rebbeLetter } from "../models/RebbeLetterModel";

type CreateRebbeLetterArgs = {
    fullName: string;
    motherName: string;
    phone?: string;
    email?: string;
    letter?: string;
    occasion?: string;
    wantsUpdates?: boolean;
};

export const createRebbeLetter = async (args: CreateRebbeLetterArgs) => {
    const {
        fullName,
        motherName,
        phone,
        email,
        letter,
        occasion,
        wantsUpdates,
    } = args;

    return rebbeLetter.create({
        fullName: fullName.trim(),
        motherName: motherName.trim(),
        phone: phone?.trim() || "",
        email: email?.trim() || "",
        letter: letter?.trim() || "",
        occasion: occasion || "general",
        wantsUpdates: !!wantsUpdates,
        status: "new",
    });
};