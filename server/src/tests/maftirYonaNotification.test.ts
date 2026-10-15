import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { MaftirYonaAuction } from '../models/MaftirYonaAuction';
import { MaftirYonaBid, MaftirYonaRateLimit } from '../models/MaftirYonaBid';
import * as notifications from '../services/maftirYonaNotificationService';
import { submitBid } from '../services/maftirYonaService';

function setup(t: TestContext, previousPhone: string | null, failNotification = false, previousConsent = true) {
    const envKeys = ['MAFTIR_YONA_OUTBID_WEBHOOK_URL', 'WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_API_VERSION', 'MAFTIR_YONA_OUTBID_TEMPLATE_NAME', 'MAFTIR_YONA_OUTBID_TEMPLATE_LANGUAGE'];
    const previousEnv = envKeys.map(key => process.env[key]);
    envKeys.forEach(key => { delete process.env[key]; });
    const oldSecret = process.env.JWT_SECRET;
    const oldEnv = process.env.NODE_ENV;
    process.env.JWT_SECRET = 'maftir-notification-test';
    process.env.NODE_ENV = 'development';
    t.after(() => {
        envKeys.forEach((key, index) => {
            if (previousEnv[index] === undefined) delete process.env[key]; else process.env[key] = previousEnv[index];
        });
        if (oldSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = oldSecret;
        if (oldEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = oldEnv;
        t.mock.restoreAll();
    });
    const previous = previousPhone ? new MaftirYonaBid({ firstName: 'ישראל', lastName: 'ישראלי', phone: previousPhone, outbidNotificationsConsent: previousConsent, amount: 1800, receivedAt: new Date() }) : null;
    let latest: InstanceType<typeof MaftirYonaBid> | undefined;
    let saved = false;
    let committed = false;
    const auction = new MaftirYonaAuction({ status: 'open', revision: 1, opensAt: new Date(Date.now() - 60000), endsAt: new Date(Date.now() + 3600000), leadingBidId: previous?._id ?? null });
    t.mock.method(mongoose, 'startSession', async () => ({
        withTransaction: async (callback: () => Promise<unknown>) => {
            const result = await callback();
            assert.equal(saved, true);
            committed = true;
            return result;
        },
        endSession: async () => {},
    }));
    t.mock.method(MaftirYonaRateLimit, 'findOneAndUpdate', async () => ({ count: 1 }));
    t.mock.method(MaftirYonaAuction, 'findOneAndUpdate', async () => auction);
    t.mock.method(auction, 'save', async () => { saved = true; return auction; });
    t.mock.method(MaftirYonaAuction, 'findById', () => ({ session: () => ({ lean: async () => auction.toObject() }) }));
    t.mock.method(MaftirYonaBid, 'findOne', () => ({ session: async () => null }));
    t.mock.method(MaftirYonaBid, 'findById', (id: unknown) => ({ session: () => {
        const bid = String(id) === String(previous?._id) ? previous : latest;
        return Object.assign(Promise.resolve(bid), { lean: async () => bid?.toObject() });
    } }));
    t.mock.method(MaftirYonaBid, 'create', async (bids: object[]) => { latest = new MaftirYonaBid(bids[0]); return [latest]; });
    t.mock.method(MaftirYonaBid, 'find', () => ({ sort: () => ({ limit: () => ({ session: () => ({ lean: async () => [latest!.toObject()] }) }) }) }));
    const log = t.mock.method(console, 'info', () => {});
    const errorLog = t.mock.method(console, 'error', () => {});
    const fetchMock = t.mock.method(globalThis, 'fetch', async () => {
        throw new Error('Unexpected network request');
    });
    const realNotify = notifications.notifyOutbid;
    const notify = t.mock.method(notifications, 'notifyOutbid', async (...args: Parameters<typeof realNotify>) => {
        assert.equal(committed, true, 'notification must run after transaction commit');
        if (failNotification) throw new Error('Notification unavailable');
        return realNotify(...args);
    });
    return {
        notify, log, errorLog, fetchMock,
        savedBid: () => latest,
        previousBid: previous,
        configureProvider: (status = 200) => {
            process.env.MAFTIR_YONA_OUTBID_WEBHOOK_URL = 'https://hook.eu1.make.com/test-outbid';
            fetchMock.mock.mockImplementation(async () => {
                assert.equal(committed, true);
                return new Response('{}', { status });
            });
        },
        submit: (overrides: Record<string, unknown> = {}) => submitBid({ firstName: 'דוד', lastName: 'כהן', phone: '050-123-4567', amount: previous ? 1980 : 1800, revision: 0, accepted: true, requestId: randomUUID(), ...overrides }, 'test-ip-hash'),
        assertAccepted: (result: Awaited<ReturnType<typeof submitBid>>) => {
            assert.equal(committed, true);
            assert.equal(result.duplicate, false);
            assert.equal(result.acceptedBidId, String(latest!._id));
            assert.equal(String(auction.leadingBidId), String(latest!._id));
            assert.equal(result.data.leadingBid?.id, String(latest!._id));
        },
    };
}

test('first bid does not POST to the webhook', async t => {
    const fixture = setup(t, null);
    fixture.configureProvider();
    fixture.assertAccepted(await fixture.submit());
    assert.equal(fixture.notify.mock.callCount(), 0);
    assert.equal(fixture.fetchMock.mock.callCount(), 0);
});

test('outbid sends exactly one POST after commit with only the required payload', async t => {
    const fixture = setup(t, '+447700900123');
    fixture.configureProvider();
    fixture.assertAccepted(await fixture.submit());
    assert.equal(fixture.notify.mock.callCount(), 1);
    assert.equal(fixture.fetchMock.mock.callCount(), 1);
    const [url, options] = fixture.fetchMock.mock.calls[0].arguments;
    assert.equal(url, 'https://hook.eu1.make.com/test-outbid');
    assert.equal(options?.method, 'POST');
    assert.deepEqual(options?.headers, { 'Content-Type': 'application/json' });
    assert.deepEqual(JSON.parse(String(options?.body)), {
        event: 'maftir_yona_outbid', firstName: 'ישראל', phone: '+447700900123',
        newLeadingAmount: 1980, auctionUrl: 'https://chabadyafo.org/maftir-yona',
    });
    assert.ok(options?.signal instanceof AbortSignal);
});

test('same normalized phone raising its bid does not POST to itself', async t => {
    const fixture = setup(t, '+972501234567');
    fixture.configureProvider();
    fixture.assertAccepted(await fixture.submit());
    assert.equal(fixture.notify.mock.callCount(), 0);
    assert.equal(fixture.fetchMock.mock.callCount(), 0);
});

test('notification failure still accepts and saves the bid', async t => {
    const fixture = setup(t, '+972509876543', true);
    fixture.assertAccepted(await fixture.submit());
    assert.equal(fixture.notify.mock.callCount(), 1);
});

test('missing or blank webhook skips sending even with Meta configured', async t => {
    for (const value of [undefined, '   ']) {
        await t.test(String(value), async t => {
            const fixture = setup(t, '+447700900123');
            if (value !== undefined) process.env.MAFTIR_YONA_OUTBID_WEBHOOK_URL = value;
            process.env.WHATSAPP_ACCESS_TOKEN = 'test-token';
            process.env.WHATSAPP_PHONE_NUMBER_ID = '123456';
            process.env.WHATSAPP_API_VERSION = 'v23.0';
            process.env.MAFTIR_YONA_OUTBID_TEMPLATE_NAME = 'test_outbid';
            process.env.MAFTIR_YONA_OUTBID_TEMPLATE_LANGUAGE = 'he';
            fixture.assertAccepted(await fixture.submit());
            assert.equal(fixture.fetchMock.mock.callCount(), 0);
        });
    }
});

test('webhook HTTP error logs status and still saves the bid', async t => {
    const fixture = setup(t, '+447700900123');
    fixture.configureProvider(503);
    fixture.assertAccepted(await fixture.submit());
    assert.equal(fixture.fetchMock.mock.callCount(), 1);
    assert.deepEqual(fixture.errorLog.mock.calls[0].arguments, [
        'Maftir Yona outbid webhook failed; accepted bid is unaffected.', { status: 503 },
    ]);
});

test('webhook network failure logs an error and still saves the bid', async t => {
    const fixture = setup(t, '+447700900123');
    fixture.configureProvider();
    fixture.fetchMock.mock.mockImplementation(async () => { throw new Error('network unavailable'); });
    fixture.assertAccepted(await fixture.submit());
    assert.equal(fixture.fetchMock.mock.callCount(), 1);
    assert.deepEqual(fixture.errorLog.mock.calls[0].arguments[1], { reason: 'network_error' });
});

test('webhook times out after 3 seconds and still saves the bid', async t => {
    const fixture = setup(t, '+447700900123');
    fixture.configureProvider();
    t.mock.timers.enable({ apis: ['setTimeout'] });
    fixture.fetchMock.mock.mockImplementation(async (_url, options) => new Promise<Response>((_resolve, reject) => {
        options!.signal!.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
        t.mock.timers.tick(2999);
        assert.equal(options!.signal!.aborted, false);
        t.mock.timers.tick(1);
        assert.equal(options!.signal!.aborted, true);
    }));
    fixture.assertAccepted(await fixture.submit());
    assert.equal(fixture.fetchMock.mock.callCount(), 1);
    assert.deepEqual(fixture.errorLog.mock.calls[0].arguments[1], { reason: 'timeout' });
});


test('missing commitment rejects the bid before saving or notifying', async t => {
    const fixture = setup(t, null);
    await assert.rejects(fixture.submit({ accepted: false }), /יש לאשר את ההתחייבות/);
    assert.equal(fixture.savedBid(), undefined);
    assert.equal(fixture.notify.mock.callCount(), 0);
});

test('commitment alone accepts the bid and defaults notification consent to false', async t => {
    const fixture = setup(t, null);
    fixture.configureProvider();
    fixture.assertAccepted(await fixture.submit());
    assert.equal(fixture.savedBid()!.outbidNotificationsConsent, false);
    assert.equal(fixture.notify.mock.callCount(), 0);
    assert.equal(fixture.fetchMock.mock.callCount(), 0);
});

test('both consents are accepted and stored; opted-in previous leader is notified', async t => {
    const fixture = setup(t, '+447700900123');
    fixture.configureProvider();
    fixture.assertAccepted(await fixture.submit({ outbidNotificationsConsent: true }));
    assert.equal(fixture.savedBid()!.outbidNotificationsConsent, true);
    assert.equal(fixture.notify.mock.callCount(), 1);
    assert.equal(fixture.fetchMock.mock.callCount(), 1);
});

test('previous leader without consent is not notified even if the new bidder consents', async t => {
    const fixture = setup(t, '+447700900123', false, false);
    fixture.configureProvider();
    fixture.assertAccepted(await fixture.submit({ outbidNotificationsConsent: true }));
    assert.equal(fixture.notify.mock.callCount(), 0);
    assert.equal(fixture.fetchMock.mock.callCount(), 0);
});

test('both bidders declining notifications still accepts and stores the bid', async t => {
    const fixture = setup(t, '+447700900123', false, false);
    fixture.configureProvider();
    fixture.assertAccepted(await fixture.submit({ outbidNotificationsConsent: false }));
    assert.equal(fixture.savedBid()!.outbidNotificationsConsent, false);
    assert.equal(fixture.notify.mock.callCount(), 0);
});


test('legacy previous bid without a consent field is never notified', async t => {
    const fixture = setup(t, '+447700900123');
    fixture.previousBid!.set('outbidNotificationsConsent', undefined);
    fixture.configureProvider();
    fixture.assertAccepted(await fixture.submit({ outbidNotificationsConsent: true }));
    assert.equal(fixture.notify.mock.callCount(), 0);
    assert.equal(fixture.fetchMock.mock.callCount(), 0);
});
