import http from './http';
import { createFailureLogGate, requestDiagnostics } from '../utils/auctionRequestDiagnostics';
export type AuctionBid = { id: string; name: string; amount: number; receivedAt: string; firstName?: string; lastName?: string; phone?: string; status?: 'active' | 'invalid' };
export type AuctionState = {
    initialized: boolean; name: string; status: 'scheduled' | 'open' | 'paused' | 'ended';
    openingPrice: number; minimumIncrement: number; minimumBid: number;
    opensAt: string; endsAt: string; serverTime: string; revision: number;
    extensionMs: number; extensionWindowMs: number;
    leadingBid: AuctionBid | null; winner: AuctionBid | null; bids: AuctionBid[];
};
export type BidInput = { firstName: string; lastName: string; phone: string; amount: number; accepted: boolean; outbidNotificationsConsent: boolean; revision: number; requestId: string };
const pollingFailures = createFailureLogGate();
export const fetchAuction = async (admin = false) => {
    const endpoint = admin ? '/admin/maftir-yona' : '/maftir-yona';
    try {
        const response = await http.get<{ data: AuctionState }>(endpoint);
        pollingFailures.succeeded(endpoint);
        return response.data.data;
    } catch (error) {
        const details = requestDiagnostics(error, endpoint, 'GET');
        if (pollingFailures.failed(endpoint, details)) console.error('Maftir Yona request failed', details);
        throw error;
    }
};
async function auctionMutation<T>(endpoint: string, input: unknown): Promise<T> {
    try { return (await http.post<T>(endpoint, input)).data; }
    catch (error) {
        console.error('Maftir Yona request failed', requestDiagnostics(error, endpoint, 'POST'));
        throw error;
    }
}
export const sendAuctionBid = async (input: BidInput) => auctionMutation<{ data: AuctionState; acceptedBidId: string; duplicate: boolean }>('/maftir-yona/bids', input);
export const initializeAuction = async () => (await auctionMutation<{ data: AuctionState }>('/admin/maftir-yona/initialize', {})).data;
export const manageAuction = async (input: Record<string, unknown>) => (await auctionMutation<{ data: AuctionState }>('/admin/maftir-yona/manage', input)).data;
export const auctionMoney = (value: number) => `${value.toLocaleString('he-IL')} ₪`;
export const auctionDate = (value: string) => new Intl.DateTimeFormat('he-IL', { timeZone: 'Asia/Jerusalem', dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value));
export const israelDateInput = (value: string) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value)).replace(' ', 'T');
export const auctionStatus = { scheduled: 'המכירה טרם נפתחה', open: 'המכירה פתוחה', paused: 'המכירה נעצרה זמנית', ended: 'המכירה הסתיימה' };
