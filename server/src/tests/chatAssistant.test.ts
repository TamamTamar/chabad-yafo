import assert from 'node:assert/strict';
import test from 'node:test';
import axios from 'axios';
import { generateAssistantReply } from '../services/llmService';
import { createChatHandler, readDailyLimit, DEFAULT_DAILY_LIMIT } from '../routes/chatAssistantRoutes';
import type { Request, Response } from 'express';

process.env.CHAT_PROVIDER = 'local';

test('local FAQ answers approved subjects without any external network', async t => {
    const post = t.mock.method(axios, 'post', () => { throw new Error('NETWORK_FORBIDDEN'); });
    const fetchMock = t.mock.method(globalThis, 'fetch', () => { throw new Error('NETWORK_FORBIDDEN'); });
    const cases = [
        ['כמה עולה המעון?', 'אין לי כרגע מידע על המחיר'],
        ['יש לכם חנות יודאיקה?', 'יודאיקה'],
        ['יש תמיכה ביולדות?', 'תמיכה ביולדות'],
        ['מה מספר העמותה?', '580798684'],
        ['מה הטלפון של הרב שמוליק קפלן?', '053-302-4315'],
        ['איפה אפשר לראות תמונות מהפעילות?', 'תמונות'],
        ['אפשר להדליק אש בשבת?', 'אני לא יכול לפסוק הלכה'],
        ['שלום, איך מכשירים מטבח?', 'הכשרת מטבח'],
        ['יש חנות הבית?', 'חנות הבית'],
        ['איפה הסניף המרכזי?', 'עולי ציון 30'],
        ['מה הכתובת בצהלון?', 'מיכאלאנגלו 31'],
        ['איפה הקמפוס?', 'המכללה האקדמית יפו'],
        ['בדיקת מזוזות', 'תפילין ומזוזות'],
        ['הכנה לבר מצווה', 'הכנה לבר מצווה'],
        ['איך נרשמים למעון?', 'טופס רישום'],
        ['רוצה לתרום', 'תרומה'],
        ['מתי נכנסת שבת?', 'עמוד הבית'],
        ['רוצה לכתוב לרבי', 'מכתב'],
        ['מה הטלפון שלכם?', '053-770-0339'],
        ['מה האתר שלכם?', 'https://chabadyafo.org'],
        ['מידע להורים', 'נהלים'],
        ['משפחות צעירות', 'קהילתית'],
        ['מי אתם?', 'פעילות'],
        ['איפה אפשר לקנות נעליים?', 'אין לי כרגע מידע'],
    ];
    for (const [message, expected] of cases) {
        const result = await generateAssistantReply({ message });
        assert.equal(result.provider, 'local');
        assert.ok(result.reply.includes(expected), `${message}: ${result.reply}`);
    }
    const gallery = await generateAssistantReply({ message: 'איפה אפשר לראות תמונות מהפעילות?' });
    assert.ok(gallery.suggestedActions.some(a => a.url === '/gallery'));
    assert.equal(post.mock.callCount(), 0);
    assert.equal(fetchMock.mock.callCount(), 0);
});

async function call(handler: ReturnType<typeof createChatHandler>, ip: string, body: unknown = { message: 'שלום' }) {
    const result = { status: 200, code: '' };
    const res = {
        status(status: number) { result.status = status; return this; },
        setHeader() {},
        json(data: { code?: string }) { result.code = data.code ?? ''; return this; },
    };
    await handler({ ip, body, socket: {} } as Request, res as unknown as Response, () => {});
    return result;
}

test('validation and blocked IP requests do not consume daily quota', async t => {
    const original = process.env.ASSISTANT_DAILY_LIMIT;
    t.after(() => { if (original === undefined) delete process.env.ASSISTANT_DAILY_LIMIT; else process.env.ASSISTANT_DAILY_LIMIT = original; });
    process.env.ASSISTANT_DAILY_LIMIT = '16';
    const handler = createChatHandler();
    for (let i = 0; i < 30; i++) assert.equal((await call(handler, 'a', { message: '' })).status, 400);
    assert.equal((await call(handler, 'a', { message: 'שלום', history: [{ role: 'system', content: 'x' }] })).code, 'INVALID_HISTORY');
    for (let i = 0; i < 15; i++) assert.equal((await call(handler, 'a')).status, 200);
    for (let i = 0; i < 30; i++) assert.equal((await call(handler, 'a')).code, 'IP_RATE_LIMIT');
    assert.equal((await call(handler, 'b')).status, 200);
    assert.equal((await call(handler, 'c')).code, 'DAILY_QUOTA');
});

test('daily configuration is lazy and invalid values use safe default', t => {
    const original = process.env.ASSISTANT_DAILY_LIMIT;
    t.after(() => { if (original === undefined) delete process.env.ASSISTANT_DAILY_LIMIT; else process.env.ASSISTANT_DAILY_LIMIT = original; });
    for (const value of ['', '0', '-1', 'NaN', 'Infinity', '1.5', '10001']) {
        process.env.ASSISTANT_DAILY_LIMIT = value;
        assert.equal(readDailyLimit(), DEFAULT_DAILY_LIMIT);
    }
    process.env.ASSISTANT_DAILY_LIMIT = '17';
    assert.equal(readDailyLimit(), 17);
});

test('daily quota resets at UTC midnight and new instance starts fresh', async t => {
    const original = process.env.ASSISTANT_DAILY_LIMIT;
    t.after(() => { if (original === undefined) delete process.env.ASSISTANT_DAILY_LIMIT; else process.env.ASSISTANT_DAILY_LIMIT = original; });
    process.env.ASSISTANT_DAILY_LIMIT = '1';
    let now = Date.parse('2026-09-22T23:59:59Z');
    const handler = createChatHandler(() => now);
    assert.equal((await call(handler, 'a')).status, 200);
    assert.equal((await call(handler, 'b')).code, 'DAILY_QUOTA');
    now += 1000;
    assert.equal((await call(handler, 'b')).status, 200);
    assert.equal((await call(createChatHandler(() => now), 'c')).status, 200);
});
