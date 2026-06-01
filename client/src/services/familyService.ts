import type { FormValues } from "../types/family";
import http from "./http";


// Create a new family form submission
export const createFamily = async (data: FormValues) => {
    const response = await http.post("/families", data);
    return response.data;
};

