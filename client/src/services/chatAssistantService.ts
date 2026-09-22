import type { ChatAssistantResponse, ChatMessage } from '../types/chatAssistant';

export class ChatRequestError extends Error {
    readonly status: number;
    readonly code: string;
    constructor(status: number, code: string) {
        super('CHAT_REQUEST_FAILED');
        this.status = status;
        this.code = code;
    }
}

export type ChatDiagnosticCode = 'frontend_fetch_failed' | 'frontend_response_not_ok' | 'frontend_response_parse_failed';
export const logChatDiagnostic = (code: ChatDiagnosticCode, status?: number) => {
    console.error('Assistant diagnostic', { code, ...(Number.isInteger(status) ? { status } : {}) });
};

export function buildChatPayload(message: string, history: ChatMessage[]) {
    return { message, history: history.slice(-6).map(({ role, content }) => ({ role, content: content.slice(0, 1000) })) };
}

export function chatErrorMessage(error: unknown): string {
    if (error instanceof ChatRequestError) {
        if (error.code === 'DAILY_QUOTA') return 'מכסת הפניות היומית מוצתה. אפשר לנסות שוב לאחר האיפוס בחצות UTC.';
        if (error.status === 429) return 'בוצעו יותר מדי פניות בזמן קצר. אפשר לנסות שוב בעוד מעט.';
        if (error.status === 400) return 'ההודעה אינה תקינה. אפשר לקצר אותה או להתחיל שיחה חדשה.';
        return 'לא ניתן לעבד את הפנייה כרגע. אפשר לנסות שוב מאוחר יותר.';
    }
    return 'לא ניתן להתחבר לצ׳אט כרגע. בדקו את החיבור ונסו שוב.';
}

export async function sendChatMessage(message: string, history: ChatMessage[], signal?: AbortSignal): Promise<ChatAssistantResponse> {
    const base = import.meta.env.VITE_API_URL ?? '/api';
    let response: Response;
    try {
        response = await fetch(`${base.replace(/\/$/, '')}/assistant/chat`, {
        method: 'POST', credentials: 'omit', redirect: 'error',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildChatPayload(message, history)), signal,
        });
    } catch (error) {
        if (error instanceof Error && (error.name === 'AbortError' || error.name === 'CanceledError')) throw error;
        logChatDiagnostic('frontend_fetch_failed');
        throw error;
    }
    if (!response.ok) {
        logChatDiagnostic('frontend_response_not_ok', response.status);
        let data: { code?: string } | null = null;
        try {
            data = await response.json();
        } catch {
            logChatDiagnostic('frontend_response_parse_failed', response.status);
        }
        const knownCode = data?.code;
        const code = knownCode && ['DAILY_QUOTA', 'IP_RATE_LIMIT', 'INVALID_MESSAGE', 'INVALID_HISTORY'].includes(knownCode) ? knownCode : 'REQUEST_FAILED';
        throw new ChatRequestError(response.status, code);
    }
    try {
        return await response.json();
    } catch (error) {
        logChatDiagnostic('frontend_response_parse_failed', response.status);
        throw error;
    }
}
