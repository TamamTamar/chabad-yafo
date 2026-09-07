import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { arbaatHaminimAdminRoutes, arbaatHaminimPublicRoutes } from '../routes/arbaatHaminimRoutes';

// Opt-in local database only: ARBAAT_TEST_MONGO_URI=mongodb://127.0.0.1:27029/arbaat_qa_<unique>
test('admin authorization, draft isolation, publication, version conflict and season history', { skip: !process.env.ARBAAT_TEST_MONGO_URI }, async () => {
    const uri = process.env.ARBAAT_TEST_MONGO_URI!;
    assert.match(uri, /^mongodb:\/\/127\.0\.0\.1:27029\/arbaat_qa_[a-z0-9_]+$/);
    const previousSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'arbaat-local-tests-only';
    await mongoose.connect(uri);
    const app = express(); app.use(express.json());
    app.use('/public', arbaatHaminimPublicRoutes); app.use('/admin', arbaatHaminimAdminRoutes);
    const server = app.listen(0, '127.0.0.1');
    await new Promise<void>(resolve => server.once('listening', resolve));
    const port = (server.address() as { port: number }).port;
    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET);
    const request = async (path: string, method = 'GET', body?: object, authenticated = true, origin = 'http://127.0.0.1:5173') => {
        const response = await fetch(`http://127.0.0.1:${port}${path}`, { method, headers: { 'Content-Type': 'application/json', Origin: origin, ...(authenticated ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
        return { status: response.status, body: await response.json() as any };
    };
    const content = { year: 'test-season', heroSubtitle: 'preview', seoDescription: 'preview', catalogIntro: 'preview', extrasIntro: 'preview', visitIntro: 'preview', heroImage: null, sets: [{ id: 'one', name: 'set', price: null, description: 'preview', included: 'preview' }], extras: [], fulfillmentOptions: [{ id: 'pickup', name: 'pickup', details: 'preview' }], saleDetails: [], faq: [] };
    try {
        assert.equal((await request('/admin', 'GET', undefined, false)).status, 401);
        assert.equal((await request('/admin', 'POST', { content }, false)).status, 401);
        assert.equal((await request('/admin', 'POST', { content }, true, 'https://untrusted.example')).status, 403);
        assert.equal((await request('/admin', 'POST', { content: { ...content, sets: [] } })).status, 400);
        const created = await request('/admin', 'POST', { content }); assert.equal(created.status, 201);
        const id = created.body.data._id;
        assert.equal((await request('/public')).body.data, null);
        assert.equal((await request(`/admin/${id}/publish`, 'POST', { revision: 0 })).status, 200);
        assert.equal((await request('/public')).body.data.year, 'test-season');
        const updated = { ...content, year: 'edited-draft' };
        assert.equal((await request(`/admin/${id}`, 'PUT', { content: updated, revision: 0 })).status, 200);
        assert.equal((await request('/public')).body.data.year, 'test-season');
        assert.equal((await request(`/admin/${id}`, 'PUT', { content, revision: 0 })).status, 409);
        assert.equal((await request(`/admin/${id}/publish`, 'POST', { revision: 0 })).status, 409);
        const next = await request('/admin', 'POST', { content: { ...content, year: 'next-season' } });
        await request(`/admin/${next.body.data._id}/publish`, 'POST', { revision: 0 });
        assert.equal((await request('/public')).body.data.year, 'next-season');
        const list = (await request('/admin')).body.data;
        assert.equal(list.seasons.length, 2);
        assert.equal(list.seasons.find((item: any) => item._id === id).content.year, 'edited-draft');
    } finally {
        await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
        await mongoose.connection.dropDatabase(); await mongoose.disconnect();
        if (previousSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previousSecret;
    }
});
