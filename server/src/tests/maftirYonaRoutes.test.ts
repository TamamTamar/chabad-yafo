import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { maftirYonaAdminRoutes, maftirYonaPublicRoutes } from '../routes/maftirYonaRoutes';
import { MaftirYonaAuction, AUCTION_ID } from '../models/MaftirYonaAuction';
import { MaftirYonaBid, MaftirYonaRateLimit } from '../models/MaftirYonaBid';

// Only an explicitly named, disposable local replica-set database can be used.
test('auction integration: races, persistence, extensions, invalidation, privacy and admin protection', { skip: !process.env.MAFTIR_TEST_MONGO_URI }, async () => {
    const uri = process.env.MAFTIR_TEST_MONGO_URI!;
    assert.match(uri, /^mongodb:\/\/127\.0\.0\.1:27039\/maftir_qa_[a-z0-9_]+\?replicaSet=maftirqa$/);
    const oldSecret = process.env.JWT_SECRET; process.env.JWT_SECRET = 'maftir-local-tests-only';
    await mongoose.connect(uri);
    await Promise.all([MaftirYonaAuction.init(), MaftirYonaBid.init(), MaftirYonaRateLimit.init()]);
    const app = express(); app.use(express.json()); app.use('/public', maftirYonaPublicRoutes); app.use('/admin', maftirYonaAdminRoutes);
    const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
    const token = jwt.sign({ role: 'admin', sub: 'qa-admin' }, process.env.JWT_SECRET);
    const call = async (path: string, body?: object, auth = true, origin = 'http://127.0.0.1:5173') => {
        const response = await fetch(`http://127.0.0.1:${(server.address() as { port: number }).port}${path}`, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', Origin: origin, ...(auth ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
        return { status: response.status, body: await response.json() as any };
    };
    const state = async () => (await call('/public')).body.data;
    let phoneIndex = 100;
    const input = (amount: number, revision: number) => ({ firstName: 'ישראל', lastName: 'ישראלי', phone: `0501234${phoneIndex++}`, amount, revision, accepted: true, requestId: randomUUID() });
    try {
        for (const path of ['/admin', '/admin/initialize', '/admin/manage']) assert.equal((await call(path, path === '/admin' ? undefined : {}, false)).status, 401);
        assert.equal((await call('/admin/initialize', {}, true, 'https://evil.example')).status, 403);
        assert.equal((await state()).initialized, false);
        assert.equal(await MaftirYonaAuction.countDocuments(), 0);
        assert.equal((await call('/admin/initialize', {})).status, 200);
        let current = await state();
        assert.equal(current.endsAt, '2026-09-20T11:18:00.000Z');
        // Use a future local test deadline so the suite stays valid after 2026.
        await MaftirYonaAuction.updateOne({ _id: AUCTION_ID }, { $set: { endsAt: new Date(Date.now() + 3600000), status: 'scheduled' } });
        current = await state();
        assert.equal((await call('/public/bids', input(1800, current.revision))).status, 409);
        assert.equal((await call('/admin/manage', { action: 'open', revision: current.revision })).status, 200);
        current = await state();
        assert.equal((await call('/admin/manage', { action: 'pause', revision: current.revision })).status, 200);
        current = await state();
        assert.equal((await call('/public/bids', input(1800, current.revision))).status, 409);
        assert.equal((await call('/admin/manage', { action: 'open', revision: current.revision })).status, 200);
        current = await state();
        const futureYear = new Date().getUTCFullYear() + 1;
        assert.equal((await call('/admin/manage', { action: 'settings', revision: current.revision, openingPrice: 1800, minimumIncrement: 180, endsAtIsrael: `${futureYear}-09-20T14:18` })).status, 200);
        assert.equal((await state()).endsAt, `${futureYear}-09-20T11:18:00.000Z`);
        assert.equal((await call('/admin/manage', { action: 'pause', revision: current.revision })).status, 409);
        current = await state();
        assert.equal((await call('/public/bids', input(1799, current.revision))).status, 409);
        const firstInput = input(1800, current.revision);
        const first = await call('/public/bids', firstInput); assert.equal(first.status, 201);
        assert.equal((await call('/public/bids', firstInput)).body.duplicate, true);
        assert.equal(await MaftirYonaBid.countDocuments(), 1);
        current = await state();
        const races = await Promise.all([call('/public/bids', input(1980, current.revision)), call('/public/bids', input(2160, current.revision))]);
        assert.deepEqual(races.map(result => result.status).sort(), [201, 409]);
        current = await state();
        assert.equal(current.leadingBid.amount, races.find(result => result.status === 201)!.body.data.leadingBid.amount);
        assert.deepEqual((await state()).bids, current.bids); // fresh request/reload
        const serialized = JSON.stringify(current);
        for (const privateValue of ['ישראלי', 'phone', 'firstName', 'lastName', 'ipHash', 'requestId', 'invalidatedBy']) assert.equal(serialized.includes(privateValue), false);
        for (let round = 0; round < 2; round++) {
            if (round === 0) await MaftirYonaAuction.updateOne({ _id: AUCTION_ID }, { $set: { endsAt: new Date(Date.now() + 30000) } });
            current = await state();
            const result = await call('/public/bids', input(current.minimumBid, current.revision));
            assert.equal(result.status, 201);
            const received = result.body.data.leadingBid.receivedAt;
            assert.equal(Date.parse(result.body.data.endsAt) - Date.parse(received), 120000);
        }
        for (let n = 0; n < 3; n++) {
            current = await state();
            assert.equal((await call('/public/bids', input(current.minimumBid, current.revision))).status, 201);
        }
        current = await state();
        assert.equal(current.bids.length, 5);
        assert.equal((await call('/admin')).body.data.bids.length, 7);
        const invalidated = current.leadingBid.id;
        assert.equal((await call('/admin/manage', { action: 'invalidate', revision: current.revision, bidId: invalidated })).status, 200);
        current = await state();
        assert.notEqual(current.leadingBid.id, invalidated);
        assert.equal(current.bids.some((bid: { id: string }) => bid.id === invalidated), false);
        assert.equal((await call('/admin')).body.data.bids.find((bid: { id: string }) => bid.id === invalidated).status, 'invalid');
        // Repeated bids with the same phone are limited across requests.
        await MaftirYonaRateLimit.deleteMany({});
        const limitedInput = input(1, current.revision);
        for (let n = 0; n < 6; n++) assert.equal((await call('/public/bids', { ...limitedInput, requestId: randomUUID() })).status, 409);
        assert.equal((await call('/public/bids', { ...limitedInput, requestId: randomUUID() })).status, 429);
        await MaftirYonaRateLimit.deleteMany({});
        for (let n = 0; n < 20; n++) assert.equal((await call('/public/bids', {})).status, 400);
        assert.equal((await call('/public/bids', {})).status, 429);
        await MaftirYonaRateLimit.deleteMany({});
        await MaftirYonaAuction.updateOne({ _id: AUCTION_ID }, { $set: { endsAt: new Date(Date.now() - 1) } });
        assert.equal((await call('/public/bids', input(100000, current.revision))).status, 409);
        current = await state(); assert.equal(current.status, 'ended'); assert.equal(current.winner.id, current.leadingBid.id);
        const stored = await MaftirYonaAuction.findById(AUCTION_ID); assert.equal(String(stored!.winnerBidId), current.leadingBid.id);
        assert.equal((await call('/admin/manage', { action: 'open', revision: current.revision })).status, 409);
        assert.equal((await call('/admin/manage', { action: 'invalidate', revision: current.revision, bidId: current.leadingBid.id })).status, 200);
        current = await state(); assert.equal(current.winner.id, current.leadingBid.id);
        const admin = (await call('/admin')).body.data; assert.equal(admin.winner.lastName, 'ישראלי'); assert.match(admin.winner.phone, /^\+972/);
        assert.equal(JSON.stringify(current).includes('payment'), false);
    } finally {
        await new Promise<void>(resolve => server.close(() => resolve()));
        await mongoose.connection.dropDatabase(); await mongoose.disconnect();
        if (oldSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = oldSecret;
    }
});
