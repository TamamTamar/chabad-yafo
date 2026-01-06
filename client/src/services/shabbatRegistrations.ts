import http from "./http";

export type ShabbatRegistrationPayload = {
    fullName: string;
    phone: string;
    email: string;
    adults: string;
    children: string;
    notes: string;
};

export const createShabbatRegistration = async (
    payload: ShabbatRegistrationPayload
) => {
    const { data } = await http.post("/api/shabbat", payload);
    return data;
};
