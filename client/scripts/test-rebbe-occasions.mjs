import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { HDate } from '@hebcal/hdate';

const { outputFiles } = await build({
  entryPoints: [new URL('../src/pages/WriteToRebbe/writeToRebbeConfig.ts', import.meta.url).pathname],
  bundle: true, platform: 'node', format: 'cjs', write: false,
});
const module = { exports: {} };
new Function('require', 'module', 'exports', outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const { getWriteToRebbeConfig } = module.exports;
const atNoon = (hdate) => {
  const date = hdate.greg();
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 10));
};

for (const year of [5786, 5787, 5788]) {
  for (const [day, month, occasion] of [[3, 'Tamuz', 'gimmel-tammuz'], [11, 'Nisan', 'yud-aleph-nissan']]) {
    const date = new HDate(day, month, year);
    for (const daysBefore of [7, 3, 0]) {
      assert.equal(getWriteToRebbeConfig(atNoon(date.subtract(daysBefore, 'day'))).occasion, occasion);
    }
    for (const offset of [-8, 1]) {
      assert.equal(getWriteToRebbeConfig(atNoon(date.add(offset, 'day'))).occasion, 'general');
    }
    // Both occasions fall during Israeli daylight saving time in these years.
    const midnight = new Date(atNoon(date).getTime() - 13 * 3600000);
    assert.equal(getWriteToRebbeConfig(midnight).occasion, occasion);
    assert.equal(getWriteToRebbeConfig(new Date(midnight.getTime() + 86400000)).occasion, 'general');
  }
}
for (const year of [5786, 5787, 5788]) {
  const start = new HDate(20, 'Cheshvan', year);
  for (let offset = -1; offset <= 14; offset++) {
    assert.equal(
      getWriteToRebbeConfig(atNoon(start.add(offset, 'day'))).occasion,
      offset >= 0 && offset < 14 ? 'kinus-hashluchim' : 'general',
    );
  }
}
assert.equal(getWriteToRebbeConfig(new Date('2026-11-03T12:00:00Z')).occasion, 'kinus-hashluchim');
console.log('Rebbe occasion checks passed.');
