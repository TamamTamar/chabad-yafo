import assert from 'node:assert/strict';
import test from 'node:test';
import net, { type Socket } from 'node:net';
import { randomUUID } from 'node:crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { shifraPuaPublicRoutes, shifraPuaAdminRoutes } from '../routes/shifraPuaRoutes';
import { arbaatHaminimAdminRoutes } from '../routes/arbaatHaminimRoutes';
import { maftirYonaPublicRoutes, maftirYonaAdminRoutes } from '../routes/maftirYonaRoutes';
import { ShifraPuaRegistration as Registration } from '../models/ShifraPuaRegistration';
import { ArbaatHaminimSettings } from '../models/ArbaatHaminimSettings';
import { MaftirYonaAuction, AUCTION_ID } from '../models/MaftirYonaAuction';
import { MaftirYonaBid, MaftirYonaRateLimit } from '../models/MaftirYonaBid';
import { daycareFinanceRoutes } from '../routes/admin/daycareFinanceRoutes';
import { DaycareFinanceSettings } from '../models/DaycareFinanceSettings';

// Opt-in only. Never read .env or MONGO_URI, and reject every non-local target.
test('local database: lost acknowledgements, real network outage and safe recovery', {
    skip: !process.env.RESILIENCE_TEST_MONGO_URI, timeout: 120_000,
}, async t => {
    const uri = process.env.RESILIENCE_TEST_MONGO_URI!;
    assert.match(uri, /^mongodb:\/\/127\.0\.0\.1:27039\/chabad_qa_[a-z0-9_]+\?replicaSet=maftirqa$/);
    const oldSecret = process.env.JWT_SECRET;
    const oldWebhook = process.env.MAFTIR_YONA_OUTBID_WEBHOOK_URL;
    process.env.JWT_SECRET = 'local-resilience-tests-only';
    delete process.env.MAFTIR_YONA_OUTBID_WEBHOOK_URL;
    t.after(() => {
        if (oldSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = oldSecret;
        if (oldWebhook === undefined) delete process.env.MAFTIR_YONA_OUTBID_WEBHOOK_URL; else process.env.MAFTIR_YONA_OUTBID_WEBHOOK_URL = oldWebhook;
    });
    let blocked = false;
    const sockets = new Set<Socket>();
    const proxy = net.createServer(socket => {
        if (blocked) { socket.destroy(); return; }
        const upstream = net.connect(27039, '127.0.0.1');
        for (const peer of [socket, upstream]) {
            sockets.add(peer);
            peer.on('close', () => sockets.delete(peer));
            peer.on('error', () => { socket.destroy(); upstream.destroy(); });
        }
        socket.on('close', () => upstream.destroy());
        upstream.on('close', () => socket.destroy());
        socket.pipe(upstream); upstream.pipe(socket);
    });
    await new Promise<void>(resolve => proxy.listen(0, '127.0.0.1', resolve));
    t.after(async () => {
        blocked = false;
        if (mongoose.connection.readyState !== 0) {
            try { await mongoose.connection.dropDatabase(); } finally { await mongoose.disconnect(); }
        }
        for (const socket of sockets) socket.destroy();
        await new Promise<void>(resolve => proxy.close(() => resolve()));
    });
    const port = (proxy.address() as net.AddressInfo).port;
    // directConnection keeps this disposable single-member test behind the proxy.
    // All timeouts, pool settings and retry settings retain their defaults.
    await mongoose.connect(uri.replace(':27039/', `:${port}/`), { directConnection: true });
    await Promise.all([Registration.init(), ArbaatHaminimSettings.init(), MaftirYonaAuction.init(), MaftirYonaBid.init(), MaftirYonaRateLimit.init()]);
    const app = express(); app.use(express.json());
    let dropNextResponse = false;
    app.use((_req, res, next) => {
        const json = res.json.bind(res);
        res.json = body => {
            if (dropNextResponse && res.statusCode < 300) {
                dropNextResponse = false;
                res.destroy(); // Mutation has completed; the caller receives no acknowledgement.
                return res;
            }
            return json(body);
        };
        next();
    });
    app.use('/registrations', shifraPuaPublicRoutes); app.use('/shifra', shifraPuaAdminRoutes);
    app.use('/arbaat', arbaatHaminimAdminRoutes);
    app.use('/auction', maftirYonaPublicRoutes); app.use('/maftir', maftirYonaAdminRoutes);
    app.use('/admin', daycareFinanceRoutes);
    const server = app.listen(0, '127.0.0.1');
    await new Promise<void>(resolve => server.once('listening', resolve));
    t.after(() => new Promise<void>(resolve => server.close(() => resolve())));
    const token = jwt.sign({ role: 'admin', sub: 'qa-admin' }, process.env.JWT_SECRET);
    const base = `http://127.0.0.1:${(server.address() as net.AddressInfo).port}`;
    const call = async (path: string, method = 'GET', body?: object) => {
        const response = await fetch(base + path, { method, headers: {
            'Content-Type': 'application/json', Origin: 'http://127.0.0.1:5173', Authorization: `Bearer ${token}`,
        }, ...(body ? { body: JSON.stringify(body) } : {}) });
        return { status: response.status, body: await response.json() as any };
    };
    const payload = { motherName: 'בדיקה', phone: '0501234567', address: 'כתובת בדיקה', birthDate: '2026-01-01', filledBy: 'mother' };
    await t.test('registration committed but response lost: parallel retries preserve one original record', async () => {
        dropNextResponse = true;
        await assert.rejects(call('/registrations', 'POST', payload));
        assert.equal(await Registration.countDocuments(), 1);
        const retries = await Promise.all(Array.from({ length: 3 }, () => call('/registrations', 'POST', { ...payload, dietaryNotes: 'must not overwrite' })));
        assert.ok(retries.every(result => result.status === 200 && result.body.success === true));
        assert.equal(await Registration.countDocuments(), 1);
        assert.equal((await Registration.findOne().lean())!.dietaryNotes, '');
    });
    let item = (await Registration.findOne().lean())!;
    await t.test('delivered update with lost response: replay conflicts and meal history remains singular', async () => {
        const update = { ...item, status: 'delivered' };
        dropNextResponse = true;
        await assert.rejects(call(`/shifra/${item._id}`, 'PATCH', update));
        assert.equal((await call(`/shifra/${item._id}`, 'PATCH', update)).status, 409);
        item = (await Registration.findById(item._id).lean())!;
        assert.equal(item.mealHistory.length, 1);
        assert.equal(item.revision, 1);
    });
    const content = { year: 'qa', heroSubtitle: 'test', seoDescription: 'test', catalogIntro: 'test', extrasIntro: 'test', visitIntro: 'test', heroImage: null, sets: [{ id: 'one', name: 'test', price: null, description: 'test', included: 'test' }], extras: [], fulfillmentOptions: [{ id: 'pickup', name: 'test', details: 'test' }], saleDetails: [], faq: [] };
    await t.test('arbaat save with lost response: stale retry cannot overwrite the committed version', async () => {
        dropNextResponse = true;
        await assert.rejects(call('/arbaat', 'PUT', { content, revision: null }));
        assert.equal((await call('/arbaat', 'PUT', { content, revision: null })).status, 409);
        assert.equal(await ArbaatHaminimSettings.countDocuments(), 1);
    });
    assert.equal((await call('/maftir/initialize', 'POST', {})).status, 200);
    await MaftirYonaAuction.updateOne({ _id: AUCTION_ID }, { $set: { status: 'open', opensAt: new Date(Date.now() - 60_000), endsAt: new Date(Date.now() + 3_600_000) } });
    await t.test('bid committed but response lost: original requestId recovers the accepted bid once', async () => {
        const auction = (await MaftirYonaAuction.findById(AUCTION_ID).lean())!;
        const bid = { firstName: 'ישראל', lastName: 'בדיקה', phone: '0501234567', amount: auction.openingPrice, revision: auction.revision, requestId: randomUUID(), accepted: true };
        dropNextResponse = true;
        await assert.rejects(call('/auction/bids', 'POST', bid));
        const retry = await call('/auction/bids', 'POST', bid);
        assert.equal(retry.status, 200); assert.equal(retry.body.duplicate, true);
        assert.equal(await MaftirYonaBid.countDocuments(), 1);
    });
    const financeUpdate = { currentChildren: 11, pricePerChild: 1000, targetChildren: 20,
        monthlyCashflows: [{ month: '2026-10', children: 11, pricePerChild: 1000, income: 11000 }] };
    await t.test('daycare finance persists the displayed income and safely repeats a save with a lost response', async () => {
        assert.equal((await call('/admin/daycare/finance')).status, 200);
        dropNextResponse = true;
        await assert.rejects(call('/admin/daycare/finance', 'PATCH', financeUpdate));
        const retry = await call('/admin/daycare/finance', 'PATCH', financeUpdate);
        assert.equal(retry.status, 200);
        assert.equal(retry.body.data.monthlyCashflows[0].income, 11000);
        assert.equal(await DaycareFinanceSettings.countDocuments(), 1);
        assert.equal((await DaycareFinanceSettings.findOne().lean())!.monthlyCashflows![0].income, 11000);
    });
    await t.test('real local network outage rejects all admin saves; recovery accepts explicit retries once', async () => {
        const auction = (await MaftirYonaAuction.findById(AUCTION_ID).lean())!;
        const shifraUpdate = { ...item, status: 'coordinated' };
        const arbaatUpdate = { content: { ...content, year: 'recovered' }, revision: 0 };
        const auctionUpdate = { action: 'pause', revision: auction.revision };
        const financeRetry = { ...financeUpdate, monthlyCashflows: [{ ...financeUpdate.monthlyCashflows[0], income: 13200 }] };
        blocked = true;
        for (const socket of sockets) socket.destroy();
        try {
            const failures = await Promise.all([
                call(`/shifra/${item._id}`, 'PATCH', shifraUpdate),
                call('/arbaat', 'PUT', arbaatUpdate),
                call('/maftir/manage', 'POST', auctionUpdate),
                call('/registrations', 'POST', { ...payload, birthDate: '2026-02-01' }),
                call('/admin/daycare/finance', 'PATCH', financeRetry),
            ]);
            assert.deepEqual(failures.map(result => result.status), [500, 500, 503, 500, 400]);
            assert.ok(failures.every(result => result.body.success === false));
        } finally { blocked = false; }
        // These queries also wait for normal driver recovery; no manual reconnect.
        assert.equal((await Registration.findById(item._id).lean())!.revision, item.revision);
        assert.equal(await Registration.countDocuments(), 1);
        assert.equal((await ArbaatHaminimSettings.findById('current').lean())!.revision, 0);
        assert.equal((await MaftirYonaAuction.findById(AUCTION_ID).lean())!.revision, auction.revision);
        assert.equal((await DaycareFinanceSettings.findOne().lean())!.monthlyCashflows![0].income, 11000);
        assert.equal((await call(`/shifra/${item._id}`, 'PATCH', shifraUpdate)).status, 200);
        assert.equal((await call('/arbaat', 'PUT', arbaatUpdate)).status, 200);
        assert.equal((await call('/maftir/manage', 'POST', auctionUpdate)).status, 200);
        assert.equal((await call('/registrations', 'POST', { ...payload, birthDate: '2026-02-01' })).status, 200);
        assert.equal((await call('/admin/daycare/finance', 'PATCH', financeRetry)).status, 200);
        assert.equal(await Registration.countDocuments(), 2);
        assert.equal((await Registration.findById(item._id).lean())!.mealHistory.length, 1);
        assert.equal((await ArbaatHaminimSettings.findById('current').lean())!.revision, 1);
        assert.equal((await MaftirYonaAuction.findById(AUCTION_ID).lean())!.revision, auction.revision + 1);
        assert.equal(await DaycareFinanceSettings.countDocuments(), 1);
        assert.equal((await DaycareFinanceSettings.findOne().lean())!.monthlyCashflows![0].income, 13200);
    });
});
