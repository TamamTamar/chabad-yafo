import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

// Keep the two runtime-local copies in sync (each app has its own TS root).
assert.equal(readFileSync(new URL('../src/utils/auctionRequestDiagnostics.ts', import.meta.url), 'utf8'), readFileSync(new URL('../../server/src/utils/auctionRequestDiagnostics.ts', import.meta.url), 'utf8'));
const { outputFiles } = await build({
    entryPoints: [new URL('../src/services/maftirYonaService.ts', import.meta.url).pathname],
    bundle: true, platform: 'node', format: 'cjs', write: false,
    plugins: [{ name: 'mock-http', setup(build) {
        build.onLoad({ filter: /\/services\/http\.ts$/ }, () => ({ contents: 'export default globalThis.__auctionTestHttp;', loader: 'ts' }));
    } }],
});
let failure = { name: 'AxiosError', code: 'ERR_NETWORK', message: 'Network Error' };
const state = { revision: 7 };
globalThis.__auctionTestHttp = {
    async get() { if (failure) throw failure; return { data: { data: state } }; },
    async post() { if (failure) throw failure; return { data: { data: state } }; },
};
const module = { exports: {} };
const logs = [];
const original = console.error;
console.error = (...args) => logs.push(args);
try {
    new Function('require', 'module', 'exports', outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
    const { fetchAuction, sendAuctionBid } = module.exports;
    for (let i = 0; i < 5; i++) await assert.rejects(fetchAuction(), error => error === failure);
    assert.equal(logs.length, 1);
    failure = { name: 'AxiosError', code: 'ERR_BAD_RESPONSE', response: { status: 500, data: { phone: '0501234567', message: 'private bidder name' } } };
    await assert.rejects(fetchAuction(), error => error === failure);
    assert.equal(logs.length, 2);
    failure = null;
    assert.equal(await fetchAuction(), state);
    failure = { code: 'ERR_NETWORK' };
    await assert.rejects(fetchAuction());
    assert.equal(logs.length, 3);
    for (let i = 0; i < 2; i++) await assert.rejects(sendAuctionBid({ phone: '0501234567' }), error => error === failure);
    assert.equal(logs.length, 5); // Mutations are never deduplicated.
    assert.equal(JSON.stringify(logs).includes('0501234567'), false);
    assert.equal(JSON.stringify(logs).includes('private bidder'), false);
} finally {
    console.error = original;
    delete globalThis.__auctionTestHttp;
}
console.log('Auction diagnostics passed: deduplication, recovery, original rejection, mutations and privacy.');
