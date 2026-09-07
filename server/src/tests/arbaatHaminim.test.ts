import assert from 'node:assert/strict';
import test from 'node:test';
import { parseSaleContent, parseRevision } from '../services/arbaatHaminimValidation';
const fixture = () => ({
    year: 'תשפ״ז', heroSubtitle: 'הזמנה או בחירה במקום', seoDescription: 'תיאור', catalogIntro: 'סטים', extrasIntro: 'תוספות', visitIntro: 'בחירה במקום',
    heroImage: { src: '/arbaat-haminim/hero.jpg', alt: 'המחשה' },
    sets: [{ id: 'regular', name: 'סט', price: null, description: 'תיאור', included: 'יעודכן' }],
    extras: [], fulfillmentOptions: [{ id: 'pickup', name: 'איסוף', details: 'יעודכן' }], saleDetails: [], faq: [],
});
test('placeholder prices remain unknown and payload cannot enable payments', () => {
    const result = parseSaleContent({ ...fixture(), paymentsEnabled: true });
    assert.equal(result.sets[0].price, null);
    assert.equal('paymentsEnabled' in result, false);
});
test('reject invalid prices, duplicate IDs, empty required collections and invalid versions', () => {
    for (const price of [-1, NaN, Infinity, 1.123, '20']) assert.throws(() => parseSaleContent({ ...fixture(), sets: [{ ...fixture().sets[0], price }] }));
    assert.throws(() => parseSaleContent({ ...fixture(), sets: [...fixture().sets, ...fixture().sets] }));
    assert.throws(() => parseSaleContent({ ...fixture(), sets: [] }));
    assert.throws(() => parseSaleContent({ ...fixture(), fulfillmentOptions: [] }));
    for (const value of [-1, '0', 1.2, null]) assert.throws(() => parseRevision(value));
});
test('image paths allow site assets and HTTPS but reject executable and protocol-relative URLs', () => {
    for (const src of ['javascript:alert(1)', 'data:image/svg+xml,test', '//example.com/photo.jpg', 'http://example.com/photo.jpg']) assert.throws(() => parseSaleContent({ ...fixture(), heroImage: { src, alt: 'image' } }));
    assert.equal(parseSaleContent({ ...fixture(), heroImage: { src: 'https://example.com/photo.jpg', alt: 'image' } }).heroImage?.src, 'https://example.com/photo.jpg');
});
