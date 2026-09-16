import http from './http';
export type AuctionBid = { id: string; name: string; amount: number; receivedAt: string; firstName?: string; lastName?: string; phone?: string; status?: 'active' | 'invalid' };
export type AuctionState = {
    initialized: boolean; name: string; status: 'scheduled' | 'open' | 'paused' | 'ended';
    openingPrice: number; minimumIncrement: number; minimumBid: number;
    opensAt: string; endsAt: string; serverTime: string; revision: number;
    extensionMs: number; extensionWindowMs: number;
    leadingBid: AuctionBid | null; winner: AuctionBid | null; bids: AuctionBid[];
};
export type BidInput = { firstName: string; lastName: string; phone: string; amount: number; accepted: boolean; revision: number; requestId: string };
export const fetchAuction = async (admin = false) => (await http.get<{ data: AuctionState }>(admin ? '/admin/maftir-yona' : '/maftir-yona')).data.data;
export const sendAuctionBid = async (input: BidInput) => (await http.post<{ data: AuctionState; acceptedBidId: string; duplicate: boolean }>('/maftir-yona/bids', input)).data;
export const initializeAuction = async () => (await http.post<{ data: AuctionState }>('/admin/maftir-yona/initialize', {})).data.data;
export const manageAuction = async (input: Record<string, unknown>) => (await http.post<{ data: AuctionState }>('/admin/maftir-yona/manage', input)).data.data;
export const auctionMoney = (value: number) => `${value.toLocaleString('he-IL')} ₪`;
export const auctionDate = (value: string) => new Intl.DateTimeFormat('he-IL', { timeZone: 'Asia/Jerusalem', dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value));
export const israelDateInput = (value: string) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value)).replace(' ', 'T');
export const auctionStatus = { scheduled: 'המכירה טרם נפתחה', open: 'המכירה פתוחה', paused: 'המכירה נעצרה זמנית', ended: 'המכירה הסתיימה' };
