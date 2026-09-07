import http from './http';
import type { SaleContent, SaleSeason, SalePublication } from '../types/arbaatHaminim';
import type { ApiResponse } from '../types/api';
export const getPublicSale = async () => (await http.get<ApiResponse<SaleContent | null>>('/arbaat-haminim')).data.data;
export const getSaleSeasons = async () => (await http.get<ApiResponse<{ seasons: SaleSeason[]; publication: SalePublication | null }>>('/admin/arbaat-haminim')).data.data;
export const saveSaleSeason = async (content: SaleContent, season?: SaleSeason) => season
    ? (await http.put<ApiResponse<SaleSeason>>(`/admin/arbaat-haminim/${season._id}`, { content, revision: season.revision })).data.data
    : (await http.post<ApiResponse<SaleSeason>>('/admin/arbaat-haminim', { content })).data.data;
export const publishSaleSeason = async (season: SaleSeason) => (await http.post<ApiResponse<SalePublication>>(`/admin/arbaat-haminim/${season._id}/publish`, { revision: season.revision })).data.data;
