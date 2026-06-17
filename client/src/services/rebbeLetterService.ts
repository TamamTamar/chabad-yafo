import http from "./http";

type CreateRebbeLetterData = {
    fullName: string;
    motherName: string;
    phone: string;
    email: string;
    letter: string;
    wantsUpdates: boolean;
    occasion: string;
};

export const createRebbeLetter = async (
    data: CreateRebbeLetterData
) => {
    const response = await http.post(
        "/rebbe-letters",
        data
    );

    return response.data;
};