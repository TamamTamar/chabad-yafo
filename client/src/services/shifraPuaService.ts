import axios from 'axios';
import http from './http';
import type { BirthHistory, RegistrationInput, RegistrationList, ShifraRegistration } from '../types/shifraPua';
export async function registerShifraPua(payload: RegistrationInput) {
    await http.post('/shifra-pua', payload);
}
export async function listShifraPua(params: Record<string, string | number>, signal?: AbortSignal) {
    return (await http.get<{ data: RegistrationList }>('/admin/shifra-pua', { params, signal })).data.data;
}
export async function updateShifraPua(item: ShifraRegistration) {
    await http.patch(`/admin/shifra-pua/${item._id}`, item);
}
export async function getShifraHistory(id: string) {
    return (await http.get<{ data: BirthHistory[] }>(`/admin/shifra-pua/${id}/history`)).data.data;
}
export const shifraError = (error: unknown) => axios.isAxiosError(error) && typeof error.response?.data?.message === 'string' ? error.response.data.message : 'הפעולה לא הושלמה. בדקו את החיבור ונסו שוב.';
