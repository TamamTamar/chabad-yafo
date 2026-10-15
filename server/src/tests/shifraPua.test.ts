import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { dateInIsrael, nextWednesday, normalizePhone, parseAdminUpdate, parseDate, parseRegistration } from '../services/shifraPuaValidation';
import { ShifraPuaRegistration as Registration } from '../models/ShifraPuaRegistration';
import { shifraPuaAdminRoutes, shifraPuaPublicRoutes } from '../routes/shifraPuaRoutes';

const payload = { motherName: 'יולדת בדיקה', phone: '050-123-4567', address: 'כתובת בדיקה ביפו 1', birthDate: '2026-01-01', filledBy: 'mother', dietaryNotes: '' };
test('validates registration, consent, phone identity, dates and bounded fields', () => {
    assert.equal(normalizePhone('+972 50-123-4567'), normalizePhone(payload.phone));
    assert.equal(normalizePhone('00972501234567'), normalizePhone(payload.phone));
    assert.equal(normalizePhone('03-1234567'), '031234567');
    for (const phone of ['abc0501234567', '12345', '050<script>1234567']) assert.throws(() => normalizePhone(phone));
    for (const birthDate of ['2026-02-30', '2026-1-1', '9999-01-01', '1899-01-01']) assert.throws(() => parseRegistration({ ...payload, birthDate }));
    assert.throws(() => parseRegistration({ ...payload, motherName: '  ' }));
    assert.throws(() => parseRegistration({ ...payload, dietaryNotes: 'x'.repeat(2001) }));
    assert.throws(() => parseRegistration({ ...payload, filledBy: 'other' }));
    assert.throws(() => parseRegistration({ ...payload, filledBy: 'other', consent: 'true', contactName: 'פונה', contactPhone: payload.phone }));
    const other = parseRegistration({ ...payload, filledBy: 'other', consent: true, contactName: 'פונה', contactPhone: payload.phone, status: 'delivered', adminNotes: 'injected', mealHistory: [{}] });
    assert.equal(other.contactPhone, '0501234567');
    assert.equal('status' in other, false);
    assert.equal('mealHistory' in other, false);
    assert.equal(parseRegistration({ ...payload, contactName: 'discard' }).contactName, '');
    assert.throws(() => parseAdminUpdate({ ...payload, status: 'unknown', revision: 0, deliveryDate: '2026-01-07' }));
    assert.throws(() => parseAdminUpdate({ ...payload, status: 'new', revision: -1, deliveryDate: '2026-01-07' }));
    assert.equal(parseAdminUpdate({ ...payload, status: 'coordinated', revision: 0, deliveryDate: '2026-01-08' }).deliveryDate, '2026-01-08');
    assert.throws(() => parseDate({ $gt: '' }));
    const index = Registration.schema.indexes().find(([fields]) => fields.phone === 1 && fields.birthDate === 1);
    assert.equal(index?.[1].unique, true);
});
test('Wednesday defaults and calendar dates use Israel time at day and DST boundaries', () => {
    assert.equal(dateInIsrael(new Date('2026-10-14T21:30:00Z')), '2026-10-15');
    assert.equal(nextWednesday(new Date('2026-10-14T05:00:00Z')), '2026-10-14');
    assert.equal(nextWednesday(new Date('2026-10-14T21:30:00Z')), '2026-10-21');
    assert.equal(nextWednesday(new Date('2026-10-25T10:00:00Z')), '2026-10-28');
});
test('private API enforces admin role, mutation origin and input validation before DB access', async () => {
    const previous = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'shifra-tests-only';
    const app = express(); app.use(express.json());
    app.use('/api/shifra-pua', shifraPuaPublicRoutes); app.use('/api/admin/shifra-pua', shifraPuaAdminRoutes);
    const server = app.listen(0, '127.0.0.1');
    await new Promise<void>(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    const admin = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET);
    const request = (path: string, method = 'GET', body?: object, token?: string, origin = 'http://127.0.0.1:5173') => fetch(base + path, { method, headers: { 'Content-Type': 'application/json', Origin: origin, ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    try {
        assert.equal((await request('/api/admin/shifra-pua')).status, 401);
        assert.equal((await request('/api/admin/shifra-pua/507f1f77bcf86cd799439011/history')).status, 401);
        assert.equal((await request('/api/admin/shifra-pua/507f1f77bcf86cd799439011', 'PATCH', payload)).status, 401);
        assert.equal((await request('/api/admin/shifra-pua', 'GET', undefined, jwt.sign({ role: 'other' }, process.env.JWT_SECRET))).status, 403);
        assert.equal((await request('/api/admin/shifra-pua/507f1f77bcf86cd799439011', 'PATCH', payload, admin, 'https://other.example')).status, 403);
        assert.equal((await request('/api/admin/shifra-pua?status=bad', 'GET', undefined, admin)).status, 400);
        assert.equal((await request('/api/admin/shifra-pua?from=2026-02-30', 'GET', undefined, admin)).status, 400);
        assert.equal((await request('/api/admin/shifra-pua?view=preparation', 'GET', undefined, admin)).status, 400);
        assert.equal((await request('/api/admin/shifra-pua/not-an-id/history', 'GET', undefined, admin)).status, 400);
        const invalid = await request('/api/shifra-pua', 'POST', { ...payload, phone: 'bad' });
        assert.equal(invalid.status, 400);
        assert.match(invalid.headers.get('Cache-Control')!, /no-store/);
        assert.equal((await request('/api/shifra-pua')).status, 404);
    } finally {
        await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
        if (previous === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previous;
    }
});

// Only an explicitly selected disposable local database is allowed.
test('database: concurrent duplicates, new births, history, admin corrections and preparation totals', { skip: !process.env.SHIFRA_TEST_MONGO_URI }, async () => {
    const uri = process.env.SHIFRA_TEST_MONGO_URI!;
    assert.match(uri, /^mongodb:\/\/127\.0\.0\.1:27029\/shifra_qa_[a-z0-9_]+$/);
    const previous = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'shifra-db-tests-only';
    await mongoose.connect(uri); await Registration.createIndexes();
    const app = express(); app.use(express.json());
    app.use('/public', shifraPuaPublicRoutes); app.use('/admin', shifraPuaAdminRoutes);
    const server = app.listen(0, '127.0.0.1');
    await new Promise<void>(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    const token = jwt.sign({ role: 'admin', sub: 'qa-admin' }, process.env.JWT_SECRET);
    const request = async (path: string, method = 'GET', body?: object) => {
        const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', Origin: 'http://127.0.0.1:5173', Authorization: `Bearer ${token}` }, ...(body ? { body: JSON.stringify(body) } : {}) });
        return { status: response.status, body: await response.json() as any };
    };
    try {
        const results = await Promise.all(Array.from({ length: 4 }, () => request('/public', 'POST', payload)));
        assert.ok(results.every(result => result.status === 200 && JSON.stringify(result.body) === '{"success":true}'));
        assert.equal(await Registration.countDocuments(), 1);
        const retry = await request('/public', 'POST', { ...payload, phone: '+972501234567', dietaryNotes: 'retry must not overwrite' });
        assert.equal(retry.status, 200);
        assert.deepEqual(retry.body, { success: true });
        assert.equal(await Registration.countDocuments(), 1);
        assert.equal((await Registration.findOne().lean())!.dietaryNotes, '');
        let item = (await request('/admin')).body.data.items[0];
        assert.equal((await request(`/admin/${item._id}`, 'PATCH', { ...item, status: 'coordinated', deliveryDate: '2026-10-22' })).status, 200);
        let prep = (await request('/admin?view=preparation&deliveryDate=2026-10-22')).body.data;
        assert.equal(prep.mealCount, 1); assert.equal(prep.items[0].address, payload.address);
        item = prep.items[0];
        assert.equal((await request(`/admin/${item._id}`, 'PATCH', { ...item, status: 'delivered' })).status, 200);
        assert.equal((await request(`/admin/${item._id}`, 'PATCH', { ...item, status: 'cancelled' })).status, 409);
        assert.equal((await request('/public', 'POST', { ...payload, birthDate: '2026-02-01', phone: '+972501234567' })).status, 200);
        let list = (await request('/admin')).body.data;
        assert.equal(list.total, 2); assert.equal(list.pending, 1);
        const other = list.items.find((row: any) => row.birthDate === '2026-02-01');
        assert.equal(other.previousMeals, 1);
        assert.equal((await request(`/admin/${other._id}`, 'PATCH', { ...other, birthDate: payload.birthDate })).status, 409);
        const history = (await request(`/admin/${other._id}/history`)).body.data;
        assert.equal(history.length, 2); assert.equal(history.reduce((sum: number, birth: any) => sum + birth.mealHistory.length, 0), 1);
        item = list.items.find((row: any) => row.birthDate === payload.birthDate);
        assert.equal((await request(`/admin/${item._id}`, 'PATCH', { ...item, status: 'coordinated', deliveryDate: '2026-10-28', adminNotes: 'חריג שאושר' })).status, 200);
        item = (await request('/admin?status=coordinated')).body.data.items[0];
        assert.equal(item.mealHistory.length, 1);
        assert.equal((await request(`/admin/${item._id}`, 'PATCH', { ...item, status: 'delivered' })).status, 200);
        assert.equal((await request(`/admin/${item._id}/history`)).body.data.reduce((sum: number, birth: any) => sum + birth.mealHistory.length, 0), 2);
        assert.equal((await request('/admin?view=preparation&deliveryDate=2026-10-28')).body.data.mealCount, 0);
        assert.equal((await request('/admin?q=%5B')).body.data.total, 0);
        const day = dateInIsrael();
        assert.equal((await request(`/admin?from=${day}&to=${day}`)).body.data.total, 2);
        assert.equal((await request('/admin?from=2020-01-01&to=2020-01-01')).body.data.total, 0);
    } finally {
        await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
        await mongoose.connection.dropDatabase(); await mongoose.disconnect();
        if (previous === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previous;
    }
});
