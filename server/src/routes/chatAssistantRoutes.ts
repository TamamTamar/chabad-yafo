import { Router, type RequestHandler } from 'express';
import { generateAssistantReply, type ChatMessage } from '../services/llmService';
import { logger } from '../utils/logger';

export const DEFAULT_DAILY_LIMIT = 500;
export function readDailyLimit(): number {
    const value = Number(process.env.ASSISTANT_DAILY_LIMIT);
    return Number.isInteger(value) && value >= 1 && value <= 10000 ? value : DEFAULT_DAILY_LIMIT;
}

// Per-process memory only: restart clears counters; instances do not share quotas.
// Fixed 60-second IP window, daily reset at UTC midnight (not Israel midnight).
export function createChatHandler(now: () => number = Date.now): RequestHandler {
    const ips = new Map<string, { count: number; resetAt: number }>();
    let utcDay = '';
    let dailyCount = 0;
    let nextCleanup = 0;
    return async (req, res) => {
        const fail = (status: number, code: string, message: string) => res.status(status).json({ success: false, code, message });
        const body = req.body;
        if (!body || typeof body !== 'object' || typeof body.message !== 'string' || !body.message.trim() || body.message.trim().length > 500) {
            fail(400, 'INVALID_MESSAGE', 'יש לשלוח הודעה באורך של עד 500 תווים.'); return;
        }
        if (body.history !== undefined && (!Array.isArray(body.history) || body.history.length > 6 || body.history.some((h: unknown) => {
            if (!h || typeof h !== 'object') return true;
            const item = h as Record<string, unknown>;
            return !['user', 'assistant'].includes(String(item.role)) || typeof item.content !== 'string' || item.content.length > 1000;
        }))) {
            fail(400, 'INVALID_HISTORY', 'היסטוריית השיחה אינה תקינה.'); return;
        }
        const timestamp = now();
        if (timestamp >= nextCleanup) {
            for (const [ip, entry] of ips) if (timestamp >= entry.resetAt) ips.delete(ip);
            nextCleanup = timestamp + 60000;
        }
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        let entry = ips.get(ip);
        if (!entry || timestamp >= entry.resetAt) {
            entry = { count: 0, resetAt: timestamp + 60000 }; ips.set(ip, entry);
        }
        if (entry.count >= 15) {
            res.setHeader('Retry-After', Math.ceil((entry.resetAt - timestamp) / 1000));
            fail(429, 'IP_RATE_LIMIT', 'בוצעו יותר מדי פניות בזמן קצר. אפשר לנסות שוב בעוד מעט.'); return;
        }
        entry.count++;
        const todayUtc = new Date(timestamp).toISOString().slice(0, 10);
        if (utcDay !== todayUtc) { utcDay = todayUtc; dailyCount = 0; }
        // Lazy read: environment configuration is already loaded when a request arrives.
        if (dailyCount >= readDailyLimit()) {
            fail(429, 'DAILY_QUOTA', 'מכסת הפניות היומית מוצתה. אפשר לנסות לאחר האיפוס בחצות UTC.'); return;
        }
        dailyCount++;
        const startedAt = Date.now();
        try {
            const history: ChatMessage[] = (body.history ?? []).map((h: ChatMessage) => ({ role: h.role, content: h.content }));
            const result = await generateAssistantReply({ message: body.message.trim(), history });
            res.json({ success: true, ...result });
        } catch {
            logger.error('Assistant diagnostic', { code: 'server_request_failed', status: 500, latencyMs: Date.now() - startedAt });
            fail(500, 'REQUEST_FAILED', 'לא ניתן לעבד את הפנייה כרגע. אפשר לנסות שוב מאוחר יותר.');
        }
    };
}
export const chatAssistantRoutes = Router();
chatAssistantRoutes.post('/chat', createChatHandler());
