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

function loadTs(path, dependencies = {}) {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8');
    const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    const exports = {};
    new Function('exports', 'require', js)(exports, name => {
        if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
        return dependencies[name];
    });
    return exports;
}
const ga = loadTs('../src/services/googleAnalyticsService.ts');
const analytics = loadTs('../src/services/chatAnalytics.ts', { './googleAnalyticsService': ga });
function captureAnalytics(t, gtag) {
    const calls = [];
    const previous = globalThis.window;
    globalThis.window = { location: { pathname: '/' }, gtag: gtag ?? ((...args) => calls.push(args)) };
    t.after(() => { if (previous === undefined) delete globalThis.window; else globalThis.window = previous; });
    return calls;
}

test('all seven events have exact allowlisted payloads; conversation resets but reopening does not', t => {
    const calls = captureAnalytics(t);
    const tracker = analytics.createChatAnalytics();
    const secret = { user_message: 'PRIVATE_USER', assistant_response: 'PRIVATE_ASSISTANT', history: ['PRIVATE_HISTORY'], api_key: 'sk-PRIVATE', headers: { Authorization: 'PRIVATE_TOKEN' } };
    tracker.open(secret); tracker.messageSent(secret); tracker.open(); tracker.messageSent(secret);
    tracker.noInfo(secret); tracker.actionClicked('whatsapp', secret); tracker.error('daily_limit', secret);
    tracker.reset(secret); tracker.messageSent(secret);
    assert.deepEqual(calls, [
        ['event', 'chat_open', undefined], ['event', 'chat_conversation_started', undefined], ['event', 'chat_message_sent', undefined],
        ['event', 'chat_open', undefined], ['event', 'chat_message_sent', undefined], ['event', 'chat_no_info', undefined],
        ['event', 'chat_action_clicked', { action_type: 'whatsapp' }], ['event', 'chat_error', { error_code: 'daily_limit' }],
        ['event', 'chat_reset', undefined], ['event', 'chat_conversation_started', undefined], ['event', 'chat_message_sent', undefined],
    ]);
    assert.doesNotMatch(JSON.stringify(calls), /PRIVATE|history|api_key|Authorization|user_message|assistant_response/);
});

test('action URLs and arbitrary values cannot become analytics parameters', t => {
    const calls = captureAnalytics(t);
    const tracker = analytics.createChatAnalytics();
    for (const [url, expected] of [['/', 'home'], ['/gallery?phone=PRIVATE', 'gallery'], ['/daycare-registration', 'daycare'], ['/daycare-parent-info', 'daycare'], ['/donate', 'donation'], ['/contact', 'contact'], ['https://example.org/PRIVATE', 'other']]) {
        tracker.actionClicked(analytics.chatActionType({ type: 'link', url, label: 'PRIVATE' }));
        assert.deepEqual(calls.at(-1), ['event', 'chat_action_clicked', { action_type: expected }]);
    }
    assert.equal(analytics.chatActionType({ type: 'phone', url: 'tel:PRIVATE' }), 'contact');
    assert.equal(analytics.chatActionType({ type: 'whatsapp', url: 'https://wa.me/PRIVATE' }), 'whatsapp');
    tracker.actionClicked('PRIVATE'); tracker.error(secretObject());
    assert.deepEqual(calls.slice(-2), [['event', 'chat_action_clicked', { action_type: 'other' }], ['event', 'chat_error', { error_code: 'request_failed' }]]);
    assert.doesNotMatch(JSON.stringify(calls), /PRIVATE/);
});
function secretObject() { return { message: 'PRIVATE', history: ['PRIVATE'], api_key: 'PRIVATE' }; }

test('missing, throwing, rejected and excluded analytics are contained', async t => {
    const calls = captureAnalytics(t);
    const tracker = analytics.createChatAnalytics();
    window.location.pathname = '/daycare/onboarding/PRIVATE'; tracker.open();
    assert.equal(calls.length, 0);
    window.location.pathname = '/'; delete window.gtag; tracker.open();
    window.gtag = () => { throw new Error('PRIVATE'); }; tracker.messageSent(); tracker.reset();
    window.gtag = () => Promise.reject(new Error('PRIVATE')); tracker.messageSent();
    await new Promise(resolve => setImmediate(resolve));
    delete globalThis.window; tracker.open();
});

test('no-info recognizes existing local and partial grounded templates only', () => {
    assert.equal(analytics.isChatNoInfo('אין לי כרגע מידע על המחיר. אפשר לברר איתנו בוואטסאפ.'), true);
    assert.equal(analytics.isChatNoInfo('תשובה חלקית\nאין לי כרגע מידע על כך. אפשר לברר איתנו בוואטסאפ.'), true);
    assert.equal(analytics.isChatNoInfo('שלום, במה אפשר לעזור?'), false);
});

test('network, parse and HTTP failures map to fixed codes without forwarding errors', async t => {
    t.mock.method(console, 'error', () => {});
    for (const [response, expected] of [
        [() => { throw new Error('PRIVATE'); }, 'frontend_fetch_failed'],
        [() => ({ ok: true, json: async () => { throw new Error('PRIVATE'); } }), 'frontend_response_parse_failed'],
        [() => ({ ok: false, status: 429, json: async () => ({ code: 'DAILY_QUOTA' }) }), 'daily_limit'],
        [() => ({ ok: false, status: 429, json: async () => ({ code: 'IP_RATE_LIMIT' }) }), 'rate_limited'],
        [() => ({ ok: false, status: 500, json: async () => { throw new Error('PRIVATE'); } }), 'frontend_response_not_ok'],
    ]) {
        t.mock.method(globalThis, 'fetch', response);
        await assert.rejects(sendChatMessage('PRIVATE', []), error => { assert.equal(mod.exports.chatAnalyticsErrorCode(error), expected); return true; });
    }
    assert.equal(mod.exports.chatAnalyticsErrorCode(secretObject()), 'request_failed');
});

// Invoke the real component handlers with a tiny hook/JSX harness; no browser or network.
function chatHarness() {
    let cursor = 0; const slots = [];
    const react = {
        useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
        useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
        useEffect() {},
    };
    const jsx = (type, props) => ({ type, props });
    const { default: Component } = loadTs('../src/components/ChatAssistant/ChatAssistant.tsx', {
        react, 'react/jsx-runtime': { jsx, jsxs: jsx }, 'react-router-dom': { Link: 'link', useLocation: () => ({ pathname: '/' }) },
        'lucide-react': {}, '../../services/chatAssistantService': mod.exports,
        '../../services/chatAnalytics': analytics, './chatAssistantSuggestions': { DEFAULT_SUGGESTIONS: [] }, './ChatAssistant.module.scss': {},
    });
    const render = () => { cursor = 0; return Component(); };
    function find(node, predicate) {
        if (!node || typeof node !== 'object') return;
        if (predicate(node)) return node;
        for (const child of [node.props?.children].flat(Infinity)) { const found = find(child, predicate); if (found) return found; }
    }
    return { render, find, button(label) { const node = find(render(), n => n.props?.['aria-label'] === label); assert.ok(node, label); node.props.onClick(); },
        async send(text) { find(render(), n => n.type === 'input').props.onChange({ target: { value: text } }); await find(render(), n => n.type === 'input').props.onKeyDown({ key: 'Enter', shiftKey: false, preventDefault() {} }); await new Promise(resolve => setImmediate(resolve)); } };
}

test('real chat continues receiving replies when analytics throws', async t => {
    captureAnalytics(t, () => { throw new Error('ANALYTICS_PRIVATE'); });
    t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ reply: 'ASSISTANT_PRIVATE', suggestedActions: [] }) }));
    const chat = chatHarness();
    chat.button('פתיחת עוזר דיגיטלי בית חב״ד יפו');
    await chat.send('USER_PRIVATE');
    assert.match(JSON.stringify(chat.render()), /ASSISTANT_PRIVATE/);
});

test('real chat sends one start for two messages, no-info and action click without contents', async t => {
    const calls = captureAnalytics(t);
    t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ reply: 'אין לי כרגע מידע על כך. אפשר לברר איתנו בוואטסאפ.', suggestedActions: [{ type: 'whatsapp', url: 'https://wa.me/PRIVATE', label: 'PRIVATE' }] }) }));
    const chat = chatHarness(); chat.button('פתיחת עוזר דיגיטלי בית חב״ד יפו');
    await chat.send('PRIVATE_USER'); await chat.send('PRIVATE_USER');
    chat.find(chat.render(), n => n.type === 'a').props.onClick();
    assert.equal(calls.filter(c => c[1] === 'chat_conversation_started').length, 1);
    assert.equal(calls.filter(c => c[1] === 'chat_message_sent').length, 2);
    assert.equal(calls.filter(c => c[1] === 'chat_no_info').length, 2);
    assert.deepEqual(calls.at(-1), ['event', 'chat_action_clicked', { action_type: 'whatsapp' }]);
    chat.button('סגירה'); chat.button('פתיחת עוזר דיגיטלי בית חב״ד יפו');
    await chat.send('PRIVATE_USER');
    assert.equal(calls.filter(c => c[1] === 'chat_conversation_started').length, 1);
    chat.button('התחלת שיחה חדשה'); await chat.send('PRIVATE_USER');
    assert.equal(calls.filter(c => c[1] === 'chat_conversation_started').length, 2);
    assert.equal(calls.filter(c => c[1] === 'chat_reset').length, 1);
    assert.doesNotMatch(JSON.stringify(calls), /PRIVATE|אין לי|history|api_key/);
});
