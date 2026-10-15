import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import mongoose, { type Connection } from 'mongoose';
import { monitorMongoConnection, reportStartupFailure } from '../config/mongoConnectionDiagnostics';
import { connectDB } from '../config/connectDB';
import { logger } from '../utils/logger';
import { MaftirYonaAuction } from '../models/MaftirYonaAuction';
import { MaftirYonaBid } from '../models/MaftirYonaBid';

test('connection diagnostics attach once, report transitions, redact events and never reconnect', t => {
    const logs: unknown[][] = [];
    t.mock.method(logger, 'error', (...args: unknown[]) => logs.push(args));
    t.mock.method(console, 'info', (...args: unknown[]) => logs.push(args));
    const client = Object.assign(new EventEmitter(), { options: { connectTimeoutMS: 30000, socketTimeoutMS: 0, credentials: 'secret-value' } });
    const connection = Object.assign(new EventEmitter(), { readyState: 0, getClient: () => client });
    const observe = () => monitorMongoConnection(connection as unknown as Connection);
    observe(); observe();
    assert.equal(connection.listenerCount('error'), 1);
    connection.emit('connected');
    connection.emit('connected');
    assert.equal(client.listenerCount('serverHeartbeatFailed'), 1);
    assert.equal(logs.filter(([message]) => message === 'MongoDB connection settings').length, 1);
    const failure = { name: 'MongoNetworkTimeoutError', message: 'secret-value host timed out', cause: { code: 'ETIMEDOUT', message: 'secret-value' } };
    const heartbeat = { connectionId: 'private-host:27017', failure };
    client.emit('serverHeartbeatFailed', heartbeat);
    client.emit('serverHeartbeatFailed', heartbeat);
    assert.equal(logs.filter(([message]) => message === 'MongoDB heartbeat failed').length, 1);
    assert.equal((logs.find(([message]) => message === 'MongoDB heartbeat failed')![1] as any).reason, 'timeout');
    client.emit('serverHeartbeatFailed', { ...heartbeat, failure: { name: 'MongoNetworkError', cause: { code: 'ECONNRESET' } } });
    assert.equal(logs.filter(([message]) => message === 'MongoDB heartbeat failed').length, 2);
    client.emit('serverHeartbeatSucceeded', heartbeat);
    client.emit('serverHeartbeatSucceeded', heartbeat);
    assert.equal(logs.filter(([message]) => message === 'MongoDB heartbeat recovered').length, 1);
    client.emit('serverHeartbeatFailed', heartbeat);
    assert.equal(logs.filter(([message]) => message === 'MongoDB heartbeat failed').length, 3);
    const pool = { address: heartbeat.connectionId, interruptInUseConnections: true };
    client.emit('connectionPoolCleared', pool); client.emit('connectionPoolCleared', pool);
    assert.equal(logs.filter(([message]) => message === 'MongoDB connection pool cleared').length, 1);
    client.emit('connectionPoolReady', pool);
    client.emit('connectionPoolCleared', pool);
    assert.equal(logs.filter(([message]) => message === 'MongoDB connection pool cleared').length, 2);
    connection.emit('error', failure); connection.emit('error', failure);
    connection.emit('disconnected'); connection.emit('disconnected');
    connection.emit('connected'); connection.emit('connected');
    assert.equal(logs.filter(([message]) => message === 'MongoDB connection error').length, 1);
    assert.equal(logs.filter(([message]) => message === 'MongoDB disconnected').length, 1);
    assert.equal(logs.filter(([message]) => message === 'MongoDB connection recovered').length, 1);
    for (const value of ['secret-value', 'private-host', 'credentials']) assert.equal(JSON.stringify(logs).includes(value), false);
});

test('timestamps, periodic summaries, independent members and pool escalation remain visible', t => {
    const logs: any[][] = [];
    t.mock.method(logger, 'error', (...args: unknown[]) => logs.push(args));
    t.mock.method(console, 'info', (...args: unknown[]) => logs.push(args));
    let now = 100_000;
    t.mock.method(Date, 'now', () => now);
    const client = Object.assign(new EventEmitter(), { options: {} });
    const connection = Object.assign(new EventEmitter(), { readyState: 0, getClient: () => client });
    monitorMongoConnection(connection as unknown as Connection);
    connection.emit('connected');
    const event = { connectionId: 'private-host', failure: { name: 'MongoNetworkError', cause: { code: 'ENOTFOUND' } } };
    client.emit('serverHeartbeatFailed', event);
    for (let i = 0; i < 100; i++) client.emit('serverHeartbeatFailed', event);
    assert.equal(logs.length, 2);
    now += 60_000;
    client.emit('serverHeartbeatFailed', event);
    assert.equal(logs[2][1].suppressedRepeats, 100);
    client.emit('serverHeartbeatFailed', event);
    client.emit('serverHeartbeatSucceeded', event);
    assert.equal(logs[3][1].suppressedRepeats, 1);
    client.emit('serverHeartbeatFailed', event);
    assert.equal(logs[4][0], 'MongoDB heartbeat failed');
    client.emit('serverHeartbeatFailed', { ...event, connectionId: 'other-private-host' });
    assert.equal(logs[5][1].member, 2);
    client.emit('connectionPoolCleared', { address: 'private-host', interruptInUseConnections: false });
    client.emit('connectionPoolCleared', { address: 'private-host', interruptInUseConnections: true });
    assert.equal(logs.filter(([message]) => message === 'MongoDB connection pool cleared').length, 2);
    for (const [, payload] of logs) {
        assert.match(payload.timestamp, /^\d{4}-\d{2}-\d{2}T.*Z$/);
        assert.ok(Number.isFinite(Date.parse(payload.timestamp)));
    }
    assert.doesNotMatch(JSON.stringify(logs), /private-host/);
});

test('startup preserves connection rejection and auction models reuse the default connection', async t => {
    const oldUri = process.env.MONGO_URI;
    process.env.MONGO_URI = 'mongodb://local-test.invalid/db';
    t.after(() => { if (oldUri === undefined) delete process.env.MONGO_URI; else process.env.MONGO_URI = oldUri; });
    const error = new Error('initial connection failed');
    const connect = t.mock.method(mongoose, 'connect', async () => { throw error; });
    await assert.rejects(connectDB(), value => value === error);
    assert.equal(connect.mock.callCount(), 1);
    assert.equal(connect.mock.calls[0].arguments.length, 1); // No timeout/retry overrides.
    assert.equal(MaftirYonaAuction.db, mongoose.connection);
    assert.equal(MaftirYonaBid.db, mongoose.connection);
});


test('startup logs never include duplicate phone values, credentials, stack or arbitrary error fields', t => {
    const logs: unknown[][] = [];
    t.mock.method(console, 'error', (...args: unknown[]) => logs.push(args));
    reportStartupFailure(Object.assign(new Error('E11000 phone 0501234567 private mother'), {
        code: 11000, keyValue: { phone: '0501234567' }, uri: 'mongodb://private:secret@host',
    }));
    reportStartupFailure({ name: 'MongoServerSelectionError', message: 'private secret' });
    reportStartupFailure({ name: 'PrivateMother', code: 501234567, message: 'secret' });
    assert.deepEqual(logs, [
        ['Server failed to start', { reason: 'index_conflict' }],
        ['Server failed to start', { reason: 'database_unavailable' }],
        ['Server failed to start', { reason: 'startup_failed' }],
    ]);
    assert.doesNotMatch(JSON.stringify(logs), /0501234567|private|secret|mongodb|keyValue|stack/i);
});
