import http from './http';
import type { SaleContent, SaleSettings } from '../types/arbaatHaminim';
import type { ApiResponse } from '../types/api';
export const getPublicSale = async () => (await http.get<ApiResponse<SaleContent | null>>('/arbaat-haminim')).data.data;
export const getSaleSettings = async () => (await http.get<ApiResponse<SaleSettings | null>>('/admin/arbaat-haminim')).data.data;
export const saveSaleSettings = async (content: SaleContent, revision: number | null) =>
    (await http.put<ApiResponse<SaleSettings>>('/admin/arbaat-haminim', { content, revision })).data.data;
