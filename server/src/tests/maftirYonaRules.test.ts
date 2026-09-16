import assert from 'node:assert/strict';
import test from 'node:test';
import { INITIAL_END } from '../models/MaftirYonaAuction';
import { integer, israelDate, normalizePhone, parseBid, publicBid, validateOffer } from '../services/maftirYonaRules';
const now = new Date('2026-09-20T11:00:00Z');
const auction = { status: 'open', opensAt: new Date('2026-09-01'), endsAt: INITIAL_END, openingPrice: 1800, minimumIncrement: 180, extensionMs: 120000, extensionWindowMs: 120000 };
test('first offer, minimum, integer amounts and phone normalization', () => {
    assert.equal(validateOffer(auction, 1800, undefined, now), INITIAL_END);
    assert.throws(() => validateOffer(auction, 1799, undefined, now));
    assert.throws(() => validateOffer(auction, 1979, 1800, now));
    assert.doesNotThrow(() => validateOffer(auction, 1980, 1800, now));
    for (const value of [1.5, NaN, Infinity, '1800', -1, 0, 1000000001]) assert.throws(() => integer(value, 'amount'));
    assert.equal(normalizePhone('050-123 4567'), '+972501234567');
    assert.equal(normalizePhone('+972501234567'), '+972501234567');
    assert.equal(normalizePhone('03-1234567'), '+97231234567');
    assert.throws(() => normalizePhone('1234567890'));
    assert.throws(() => normalizePhone('letters0501234567'));
});
test('international contact numbers accept a country prefix and reject malformed input', () => {
    assert.equal(normalizePhone('+1 (212) 555-0123'), '+12125550123');
    assert.equal(normalizePhone('+44 20 7946 0958'), '+442079460958');
    assert.equal(normalizePhone('00972 50 1234567'), '+972501234567');
    for (const phone of ['++12125550123', '+0123456789', '+1234567', '+1234567890123456', '12125550123', '+1call5550123']) {
        assert.throws(() => normalizePhone(phone));
    }
});
test('two minute boundary, repeated extension and exact deadline rejection', () => {
    const near = new Date('2026-09-20T11:17:30Z');
    const extended = validateOffer(auction, 1800, undefined, near);
    assert.equal(extended.toISOString(), '2026-09-20T11:19:30.000Z');
    assert.equal(validateOffer({ ...auction, endsAt: extended }, 1980, 1800, new Date('2026-09-20T11:19:00Z')).toISOString(), '2026-09-20T11:21:00.000Z');
    assert.equal(validateOffer(auction, 1800, undefined, new Date('2026-09-20T11:16:00Z')).toISOString(), INITIAL_END.toISOString());
    for (const time of [INITIAL_END, new Date(INITIAL_END.getTime() + 1)]) assert.throws(() => validateOffer(auction, 1800, undefined, time));
    for (const status of ['paused', 'scheduled', 'ended']) assert.throws(() => validateOffer({ ...auction, status }, 1800, undefined, now));
    assert.throws(() => validateOffer({ ...auction, opensAt: INITIAL_END }, 1800, undefined, now));
});
test('Israel time is independent of host timezone and rejects ambiguous/invalid times', () => {
    assert.equal(israelDate('2026-09-20T14:18').toISOString(), '2026-09-20T11:18:00.000Z');
    assert.equal(israelDate('2026-12-20T14:18').toISOString(), '2026-12-20T12:18:00.000Z');
    assert.throws(() => israelDate('2026-02-30T14:18'));
    assert.throws(() => israelDate('2026-03-27T02:30'));
    assert.throws(() => israelDate('2026-10-25T01:30'));
});
test('public DTO is an allowlist; consent and request validation', () => {
    const bid = { _id: 'bid', firstName: 'ישראל', lastName: 'ישראלי', phone: '+972501234567', ipHash: 'secret', requestId: 'secret', amount: 1800, receivedAt: now };
    assert.deepEqual(publicBid(bid), { id: 'bid', name: 'ישראל י׳', amount: 1800, receivedAt: now });
    assert.equal(publicBid(null), null);
    const input = { ...bid, accepted: true, revision: 0, requestId: '12345678-1234-1234-1234-123456789abc' };
    assert.equal(parseBid(input).phone, bid.phone);
    assert.throws(() => parseBid({ ...input, accepted: false }));
    assert.throws(() => parseBid({ ...input, firstName: '<script>' }));
});
