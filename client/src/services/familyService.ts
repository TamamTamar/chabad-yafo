import type { FormValues } from "../types/family";
import http from "./http";


export const createFamily = async (data: FormValues) => {
    const response = await http.post("/families", data);

    return response.data;
};