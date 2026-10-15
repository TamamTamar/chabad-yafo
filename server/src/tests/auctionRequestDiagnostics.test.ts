import assert from 'node:assert/strict';
import test from 'node:test';
import { createFailureLogGate, requestDiagnostics } from '../utils/auctionRequestDiagnostics';
const details = (error: unknown, status?: number) => requestDiagnostics(error, '/api/maftir-yona', 'GET', status);

test('diagnostics preserve HTTP, Axios, timeout, network and database error categories', () => {
    for (const status of [404, 500]) {
        const value = details({ name: 'AxiosError', code: 'ERR_BAD_RESPONSE', response: { status, data: { message: `Request failed with status code ${status}` } } });
        assert.equal(value.status, status);
        assert.equal(value.type, `http_${status}`);
        assert.equal(value.code, 'ERR_BAD_RESPONSE');
        assert.equal(value.responseMessage, `Request failed with status code ${status}`);
    }
    assert.equal(details({ code: 'ECONNABORTED', message: 'timeout of 5000ms exceeded' }).type, 'timeout');
    assert.equal(details(new TypeError('Failed to fetch')).type, 'network');
    assert.equal(details({ message: 'fetch failed', cause: { code: 'ECONNREFUSED' } }).causeCode, 'ECONNREFUSED');
    assert.equal(details({ name: 'MongoServerError', code: 20, message: 'Transaction numbers are only allowed on a replica set member or mongos' }, 503).type, 'database');
    assert.equal(details(new Error('private message'), 503).name, 'Error');
});

test('private request, response, error text and stack paths never enter diagnostics', () => {
    const value = details({ name: 'Error', message: 'Levy secret-token 0501234567', config: { headers: { Authorization: 'secret-token' } }, response: { status: 500, data: { message: 'Levy secret-token', phone: '0501234567' } }, stack: 'Error: secret-token\n    at foo (/private/Levy/service.ts:12:4)' });
    const serialized = JSON.stringify(value);
    for (const privateValue of ['Levy', 'secret-token', '0501234567', '/private']) assert.equal(serialized.includes(privateValue), false);
    assert.deepEqual(value.source, ['service.ts:12:4']);
});

test('poll logs only first failure, changed cause and recurrence after recovery; endpoints are independent', () => {
    const gate = createFailureLogGate();
    const first = details({ code: 'ERR_NETWORK' });
    assert.equal(gate.failed('public', first), true);
    for (let n = 0; n < 100; n++) assert.equal(gate.failed('public', first), false);
    assert.equal(gate.failed('admin', first), true);
    assert.equal(gate.failed('public', details({ code: 'ETIMEDOUT' })), true);
    gate.succeeded('public');
    assert.equal(gate.failed('public', first), true);
});

test('route preserves 503 failures, suppresses repeated polls, and logs again after recovery', async t => {
    const { maftirYonaPublicRoutes } = await import('../routes/maftirYonaRoutes');
    const service = await import('../services/maftirYonaService');
    const { logger } = await import('../utils/logger');
    const logs: unknown[][] = [];
    let fail = true;
    t.mock.method(service, 'getAuction', async () => {
        if (fail) throw new TypeError('sensitive bidder value');
        return { initialized: false };
    });
    t.mock.method(logger, 'error', (...args: unknown[]) => logs.push(args));
    const layer = maftirYonaPublicRoutes.stack.find((layer: any) => layer.route?.path === '/');
    assert.ok(layer?.route);
    const handler = layer.route.stack[0].handle as (...args: any[]) => Promise<void>;
    const call = async () => {
        let status = 200;
        let body: any;
        const res = { set() { return res; }, status(value: number) { status = value; return res; }, json(value: unknown) { body = value; return res; } };
        await handler({ method: 'GET', baseUrl: '/api/maftir-yona', route: { path: '/' } }, res);
        return { status, body };
    };
    for (let n = 0; n < 3; n++) {
        const result = await call();
        assert.equal(result.status, 503);
        assert.equal(result.body.success, false);
    }
    assert.equal(logs.length, 1);
    assert.equal(JSON.stringify(logs).includes('sensitive bidder'), false);
    fail = false;
    assert.equal((await call()).body.success, true);
    fail = true;
    await call();
    assert.equal(logs.length, 2);
});
