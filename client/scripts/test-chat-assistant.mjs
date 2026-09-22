import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Execute the real service with build-time env replaced; fetch is always mocked.
const source = readFileSync(new URL('../src/services/chatAssistantService.ts', import.meta.url), 'utf8').replace('import.meta.env.VITE_API_URL', 'undefined');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function('exports', js)(mod.exports);
const { sendChatMessage, chatErrorMessage, ChatRequestError } = mod.exports;

test('chat omits credentials and preserves identical historical messages', async t => {
    let options;
    t.mock.method(globalThis, 'fetch', async (url, init) => {
        assert.equal(url, '/api/assistant/chat'); options = init;
        return { ok: true, json: async () => ({ success: true, reply: 'בדיקה' }) };
    });
    const history = [{ role: 'user', content: 'שלום' }, { role: 'assistant', content: 'שלום' }];
    await sendChatMessage('שלום', history);
    assert.equal(options.credentials, 'omit');
    assert.deepEqual(options.headers, { 'Content-Type': 'application/json' });
    assert.deepEqual(JSON.parse(options.body), { message: 'שלום', history });
});

test('chat forwards abort and renders distinct limit errors', async t => {
    const controller = new AbortController();
    t.mock.method(globalThis, 'fetch', async (_url, init) => {
        assert.equal(init.signal, controller.signal);
        return { ok: false, status: 429, json: async () => ({ code: 'DAILY_QUOTA' }) };
    });
    await assert.rejects(sendChatMessage('שלום', [], controller.signal), error => {
        assert.ok(chatErrorMessage(error).includes('מכסת הפניות היומית'));
        return true;
    });
    assert.ok(chatErrorMessage(new ChatRequestError(429, 'IP_RATE_LIMIT')).includes('בזמן קצר'));
    assert.ok(chatErrorMessage(new ChatRequestError(400, 'INVALID_MESSAGE')).includes('אינה תקינה'));
});

test('frontend diagnostics expose only fixed code and optional status', async t => {
    const events = [];
    t.mock.method(console, 'error', (...args) => events.push(args));
    t.mock.method(globalThis, 'fetch', async () => { throw new Error('PRIVATE_MESSAGE api-key'); });
    await assert.rejects(sendChatMessage('PRIVATE_MESSAGE', []));
    assert.equal(events.length, 1);
    assert.equal(events[0][0], 'Assistant diagnostic');
    assert.deepEqual(events[0][1], { code: 'frontend_fetch_failed' });
});
