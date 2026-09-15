import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { arbaatHaminimAdminRoutes, arbaatHaminimPublicRoutes } from '../routes/arbaatHaminimRoutes';

// Opt-in local database only: ARBAAT_TEST_MONGO_URI=mongodb://127.0.0.1:27029/arbaat_qa_<unique>
test('admin authorization, single settings save, year update and version conflict', { skip: !process.env.ARBAAT_TEST_MONGO_URI }, async () => {
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
        return { status: response.status, body: await response.text().then(text => { try { return JSON.parse(text); } catch { return null; } }) };
    };
    const content = { year: 'test-season', heroSubtitle: 'preview', seoDescription: 'preview', catalogIntro: 'preview', extrasIntro: 'preview', visitIntro: 'preview', heroImage: null, sets: [{ id: 'one', name: 'set', price: null, description: 'preview', included: 'preview' }], extras: [], fulfillmentOptions: [{ id: 'pickup', name: 'pickup', details: 'preview' }], saleDetails: [], faq: [] };
    try {
        assert.equal((await request('/admin', 'GET', undefined, false)).status, 401);
        assert.equal((await request('/admin', 'PUT', { content, revision: null }, false)).status, 401);
        assert.equal((await request('/admin', 'PUT', { content, revision: null }, true, 'https://untrusted.example')).status, 403);
        assert.equal((await request('/admin', 'PUT', { content: { ...content, sets: [] }, revision: null })).status, 400);
        assert.equal((await request('/admin')).body.data, null);
        const created = await request('/admin', 'PUT', { content, revision: null });
        assert.equal(created.status, 200);
        assert.equal(created.body.data.revision, 0);
        assert.equal((await request('/public')).body.data.year, 'test-season');
        assert.equal((await request('/admin', 'PUT', { content, revision: null })).status, 409);
        const updated = { ...content, year: 'next-year' };
        const saved = await request('/admin', 'PUT', { content: updated, revision: 0 });
        assert.equal(saved.status, 200);
        assert.equal(saved.body.data.revision, 1);
        assert.equal((await request('/public')).body.data.year, 'next-year');
        assert.equal((await request('/admin', 'PUT', { content, revision: 0 })).status, 409);
        assert.equal((await request('/admin')).body.data.content.year, 'next-year');
        assert.equal((await request('/admin', 'POST', { content })).status, 404);
    } finally {
        await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
        await mongoose.connection.dropDatabase(); await mongoose.disconnect();
        if (previousSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previousSecret;
    }
});
