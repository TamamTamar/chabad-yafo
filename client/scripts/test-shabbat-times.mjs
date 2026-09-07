import assert from 'node:assert/strict';
import { build } from 'esbuild';

const { outputFiles } = await build({
  entryPoints: [new URL('../src/services/shabbatTimesService.ts', import.meta.url).pathname],
  bundle: true, platform: 'node', format: 'cjs', write: false,
});
const module = { exports: {} };
const { createRequire } = await import('node:module');
new Function('require', 'module', 'exports', outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const { parseShabbatTimes, getShabbatRange } = module.exports;
const event = (category, date, extra = {}) => ({ category, date, title: category, ...extra });
const candles = (date) => event('candles', date);
const end = (date) => event('havdalah', date);
const holiday = (date) => event('holiday', date, { yomtov: true });
const parse = (items, friday = '2026-09-11') => parseShabbatTimes({ items }, friday);

const roshHashana = [
  candles('2026-09-11T18:32:00+03:00'), holiday('2026-09-12'),
  candles('2026-09-12T19:28:00+03:00'), holiday('2026-09-13'),
  end('2026-09-13T19:26:00+03:00'),
];
const result = parse(roshHashana);
assert.deepEqual(result.events.map(({ label, time }) => ({ label, time })), [
  { label: 'כניסת שבת וחג', time: '18:32' },
  { label: 'הדלקת נרות', time: '19:28' },
  { label: 'צאת החג', time: '19:26' },
]);
assert.equal(result.gregorianDate, '11/09/2026');
assert.equal(result.title, 'זמני שבת וחג ביפו');

const regular = parse([
  // Earlier, separate holiday must not be paired with Friday.
  candles('2026-09-08T18:35:00+03:00'), holiday('2026-09-09'), end('2026-09-09T19:30:00+03:00'),
  candles('2026-09-11T18:32:00+03:00'),
  event('parashat', '2026-09-12', { hebrew: 'פרשת בדיקה' }), end('2026-09-12T19:28:00+03:00'),
]);
assert.equal(regular.events.length, 2);
assert.equal(regular.events[0].label, 'כניסת שבת');
assert.equal(regular.events[1].label, 'צאת שבת');
assert.equal(regular.title, 'שבת פרשת בדיקה ביפו');

const before = parse([
  candles('2026-09-10T18:33:00+03:00'), holiday('2026-09-11'),
  candles('2026-09-11T18:32:00+03:00'), end('2026-09-12T19:28:00+03:00'),
]);
assert.equal(before.events.length, 3);
assert.equal(before.events[0].label, 'כניסת החג');
assert.equal(before.events[2].label, 'צאת שבת');
const after = parse(roshHashana.filter((item) => item.date !== '2026-09-12'));
assert.equal(after.events[0].label, 'כניסת שבת');
assert.equal(after.events[2].label, 'צאת החג');
assert.throws(() => parse(roshHashana.slice(0, -1)), /חסרים זמני/);
assert.deepEqual(getShabbatRange(new Date('2026-09-05T21:01:00Z')), {
  start: '2026-09-06', friday: '2026-09-11', end: '2026-09-15',
});
assert.equal(getShabbatRange(new Date('2026-09-05T20:59:00Z')).friday, '2026-09-04');
assert.deepEqual(getShabbatRange(new Date('2026-12-31T12:00:00Z')), {
  start: '2026-12-27', friday: '2027-01-01', end: '2027-01-05',
});
console.log('Shabbat regression checks passed: ordinary week, adjacent holidays, missing data, Israel timezone, year rollover.');
