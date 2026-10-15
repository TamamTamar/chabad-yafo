import { trackEvent } from './googleAnalyticsService';
import type { SuggestedAction } from '../types/chatAssistant';

const actionTypes = ['whatsapp', 'gallery', 'daycare', 'donation', 'home', 'contact', 'other'] as const;
const errorCodes = ['frontend_fetch_failed', 'frontend_response_not_ok', 'frontend_response_parse_failed', 'rate_limited', 'daily_limit', 'request_failed'] as const;
type ActionType = typeof actionTypes[number];
type ErrorCode = typeof errorCodes[number];
type EventName = 'chat_open' | 'chat_conversation_started' | 'chat_message_sent' | 'chat_action_clicked' | 'chat_no_info' | 'chat_error' | 'chat_reset';

// No content, IDs, URLs or arbitrary parameter bags are accepted by the public tracker.
function emit(name: EventName, data?: { action_type: ActionType } | { error_code: ErrorCode }) {
    try {
        if (typeof window === 'undefined' || window.location.pathname.startsWith('/daycare/onboarding/')) return;
        // Use the existing gtag/consent configuration without initializing or overriding it.
        // Also contain nonstandard adapters that return a rejected promise.
        void Promise.resolve(trackEvent(name, data)).catch(() => {});
    } catch { /* Analytics must never affect the chat or display an error. */ }
}

export function createChatAnalytics() {
    let started = false;
    return {
        open() { emit('chat_open'); },
        messageSent() {
            if (!started) {
                started = true;
                emit('chat_conversation_started');
            }
            emit('chat_message_sent');
        },
        reset() { started = false; emit('chat_reset'); },
        noInfo() { emit('chat_no_info'); },
        actionClicked(value: ActionType) {
            const action_type = actionTypes.includes(value) ? value : 'other';
            emit('chat_action_clicked', { action_type });
        },
        error(value: ErrorCode) {
            const error_code = errorCodes.includes(value) ? value : 'request_failed';
            emit('chat_error', { error_code });
        },
    };
}

// Inspect locally only; never pass the action object or URL to the tracker.
export function chatActionType(action: SuggestedAction): ActionType {
    if (action.type === 'whatsapp') return 'whatsapp';
    if (action.type === 'phone') return 'contact';
    const path = action.url.split(/[?#]/, 1)[0].replace(/\/$/, '') || '/';
    switch (path) {
        case '/': return 'home';
        case '/gallery': return 'gallery';
        case '/daycare-registration':
        case '/daycare-parent-info': return 'daycare';
        case '/donate': return 'donation';
        case '/contact': return 'contact';
        default: return 'other';
    }
}

// Current local and grounded responses use this fixed template (including partial replies).
// Keep aligned with those templates if their wording changes. Content stays in memory only.
export function isChatNoInfo(reply: string): boolean {
    return /(^|\n)אין לי כרגע מידע [^\n]*\. אפשר לברר איתנו בוואטסאפ\./u.test(reply);
}
