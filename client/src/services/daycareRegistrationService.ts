import type { DaycareRegistrationFormValues } from "../types/daycareRegistration";
import http from "./http";

export const createDaycareRegistration = async (
    data: DaycareRegistrationFormValues
) => {
    const response = await http.post("/daycare-registrations", data);
    return response.data;
};
