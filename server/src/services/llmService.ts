import { buildSystemPrompt, detectSuggestedActions, SuggestedAction } from '../config/assistantPrompts';
import { getAssistantFacts, renderGroundedReply } from './assistantGrounding';
import { localAssistant } from './localAssistantService';
import { logger } from '../utils/logger';

export interface ChatMessage { role: 'user' | 'assistant'; content: string }
export interface AssistantReplyResult {
    reply: string;
    suggestedActions: SuggestedAction[];
    provider: 'local' | 'openai';
}
export const OPENAI_MODEL = 'gpt-5-mini';
export const OPENAI_ENDPOINT = 'https://api.openai.com/v1/responses';
export const OPENAI_TIMEOUT_MS = 12000;
export const OPENAI_MAX_OUTPUT_TOKENS = 600;

// Numeric aggregates only, per process. Never expose through the public chat route.
const usage = { responses: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 };
export const getAssistantUsage = () => ({ ...usage });
function recordUsage(value: unknown) {
    if (!value || typeof value !== 'object') return;
    const data = value as Record<string, unknown>;
    const numbers = [data.input_tokens, data.output_tokens, data.total_tokens];
    if (!numbers.every(n => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0)) return;
    usage.responses++;
    usage.inputTokens += numbers[0] as number;
    usage.outputTokens += numbers[1] as number;
    usage.totalTokens += numbers[2] as number;
}
export const generateLocalFallbackReply = (message: string): string => localAssistant(message).reply;

async function callOpenAI(message: string, history: ChatMessage[]): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) throw new Error('UNAVAILABLE');
    const facts = getAssistantFacts();
    const response = await fetch(OPENAI_ENDPOINT, {
        method: 'POST', credentials: 'omit', redirect: 'error',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS),
        body: JSON.stringify({
            model: OPENAI_MODEL, store: false,
            instructions: buildSystemPrompt(facts),
            // Contract: history contains only PREVIOUS turns; identical text is legitimate.
            input: [...history.slice(-6).filter(h => h.role === 'user' || h.role === 'assistant')
                .map(h => ({ role: h.role, content: h.content.slice(0, 1000) })),
                { role: 'user', content: message.slice(0, 500) }],
            reasoning: { effort: 'minimal' },
            max_output_tokens: OPENAI_MAX_OUTPUT_TOKENS,
            text: { verbosity: 'low', format: {
                type: 'json_schema', name: 'public_assistant_answer', strict: true,
                schema: {
                    type: 'object', additionalProperties: false,
                    properties: {
                        kind: { type: 'string', enum: ['answer', 'partial', 'unknown', 'halachic', 'blocked', 'greeting'] },
                        intent: { type: 'string', enum: ['location', 'rabbi', 'phone', 'details', 'hours', 'price', 'halacha', 'contact', 'gallery', 'service', 'unknown'] },
                        factIds: { type: 'array', items: { type: 'string', enum: Object.keys(facts) }, maxItems: 3 },
                    }, required: ['kind', 'intent', 'factIds'],
                },
            } },
        }),
    });
    if (!response.ok) throw new Error('UNAVAILABLE'); // Never read or log error bodies.
    const data = await response.json();
    recordUsage(data?.usage);
    if (data?.status !== 'completed' || !Array.isArray(data.output)) throw new Error('INVALID_OUTPUT');
    const messages = data.output.filter((item: { type?: string }) => item?.type === 'message');
    if (messages.length !== 1 || messages[0].role !== 'assistant' || !Array.isArray(messages[0].content)) throw new Error('INVALID_OUTPUT');
    const content = messages[0].content;
    if (content.length !== 1 || content[0]?.type !== 'output_text' || typeof content[0].text !== 'string') throw new Error('INVALID_OUTPUT');
    return renderGroundedReply(JSON.parse(content[0].text), facts);
}

export async function generateAssistantReply({ message, history = [] }: {
    message: string; history?: ChatMessage[];
}): Promise<AssistantReplyResult> {
    if ((process.env.CHAT_PROVIDER || 'local').trim().toLowerCase() === 'openai') {
        const startedAt = Date.now();
        try {
            const reply = await callOpenAI(message, history);
            return { reply, suggestedActions: detectSuggestedActions(message, reply), provider: 'openai' };
        } catch {
            // Fixed message only: no error object, body, conversation, URL or headers.
            logger.error('Assistant diagnostic', { code: 'server_provider_fallback', provider: 'openai', latencyMs: Date.now() - startedAt });
        }
    }
    return { ...localAssistant(message), provider: 'local' };
}
