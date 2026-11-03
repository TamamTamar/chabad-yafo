// Run against local Vite with VITE_API_URL=/api. All API traffic stays in memory.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const out = path.resolve(__dirname, '../../output/admin-density');
fs.mkdirSync(out, { recursive: true });
const phase = process.argv[2] || 'after';
const base = process.env.ADMIN_QA_URL || 'http://127.0.0.1:5188';
const longNote = 'הערת בדיקה ארוכה בלבד - שיחה עם ההורים על שעות הפעילות והמשך ההרשמה. '.repeat(10);
const fixtures = () => Array.from({ length: 20 }, (_, i) => ({
  _id: `demo${i}`, parentName: i === 0 ? 'משפחת דוגמה עם שם ארוך במיוחד לבדיקה בלבד' : `משפחת בדיקה ${i + 1}`,
  phone: `05000000${String(i).padStart(2, '0')}`, childName: i === 0 ? 'ילד עם שם ארוך במיוחד לבדיקת שבירת שורות' : 'ילד לדוגמה',
  childAge: 'שנה וחצי', requiredHours: 'עד 16:00', status: i === 1 ? 'רוצה להירשם' : i === 2 ? 'הגיע לראות' : 'מתעניין',
  callNotes: i === 0 ? longNote : '', createdAt: '2026-10-01',
  onboardingSummary: i === 3 ? { id: 'demo-case', overallStatus: 'waitingForAdmin', schoolYear: '2026-2027', progress: { percentage: 35 }, missingStepTitle: 'בדיקת מסמכים' } : null,
}));
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    const page = await browser.newPage();
    let rows = fixtures(), missing = false, saveCount = 0, failNextSave = false;
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== new URL(base).origin) return route.abort();
      if (!url.pathname.startsWith('/api/')) return route.continue();
      if (url.pathname === '/api/auth/me') return route.fulfill({ json: { success: true, admin: true, user: { id: 'demo-admin', label: 'מנהל לדוגמה' } } });
      if (url.pathname.includes('donation')) return route.fulfill({ status: 500, json: { message: 'Synthetic unavailable campaign' } });
      let data = [];
      if (route.request().method() === 'PATCH' && url.pathname.startsWith('/api/admin/daycare/public-registrations/')) {
        if (failNextSave) { failNextSave = false; return route.fulfill({ status: 500, json: { message: 'Synthetic failure' } }); }
        const id = url.pathname.split('/').pop();
        const changes = route.request().postDataJSON();
        rows = rows.map(row => row._id === id ? { ...row, ...changes } : row);
        saveCount++;
        await new Promise(resolve => setTimeout(resolve, 200));
        return route.fulfill({ json: { success: true, data: rows.find(row => row._id === id) } });
      }
      if (route.request().method() !== 'GET') return route.abort();
      if (url.pathname.endsWith('/registrations')) data = { registrations: rows };
      if (url.pathname.endsWith('/overview')) data = missing ? null : { openingTargetChildren: 20, actualRegistrations: 0, interestedCount: 20, openTasks: 0, completedTasks: 12, targetOpeningDate: 'ספטמבר 2027', generalStatus: 'בהכנה' };
      return route.fulfill({ json: { success: true, data } });
    });
    for (const width of (process.env.ADMIN_QA_WIDTHS ? process.env.ADMIN_QA_WIDTHS.split(',').map(Number) : [1440, 768, 390, 320])) {
      rows = fixtures(); missing = false;
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`${base}/admin/daycare`);
      const search = page.getByPlaceholder('שם הורה, ילד או טלפון');
      await search.waitFor(); await page.evaluate(() => document.fonts.ready);
      if (phase === 'after') {
        assert.equal(await page.locator('[data-admin-theme="modern-dark"]').count(), 1);
        await page.getByRole('heading', { name: 'רישום למעון', exact: true }).waitFor();
        assert.equal(await page.getByRole('group', { name: 'חשבון ניהול: מנהל לדוגמה' }).count(), 1);
        assert.equal(await page.getByRole('navigation', { name: 'מיקום במערכת' }).getByRole('link').count(), 2);
      }
      const area = page.locator('section[aria-labelledby="admin-page-title"]');
      const record = () => area.locator('tbody:visible, article:visible');
      if (phase === 'after') {
        const metricBox = await page.locator('[aria-labelledby="daycare-dashboard"]').boundingBox();
        const searchBox = await search.boundingBox(); assert.ok(metricBox.y + metricBox.height < searchBox.y);
        assert.equal(await search.evaluate(el => el.getBoundingClientRect().height), 46);
        assert.equal(await search.evaluate(el => getComputedStyle(el).borderRadius), '11px');
        const metricTiles = await page.locator('[aria-labelledby="daycare-dashboard"] dl > div').evaluateAll(els => els.map(el => ({ x: el.offsetLeft, y: el.offsetTop })));
        assert.equal(new Set(metricTiles.map(box => box.y)).size, width > 900 ? 1 : 2);
      }
      const note = () => area.getByRole('button', { name: width > 900 ? /^(הערה|צפייה ועריכה|הוספת הערה)$/ : /^(הוספת הערה|עריכת הערה)$/ }).filter({ visible: true }).first();
      await page.screenshot({ path: `${out}/${phase}-${width}.png`, fullPage: true });
      await page.screenshot({ path: `${out}/${phase}-viewport-${width}.png` });
      if (phase === 'after' && width > 900) {
        const region = page.getByRole('region', { name: 'רשימת פניות לרישום למעון' });
        await region.focus(); await page.keyboard.press('End'); await page.waitForTimeout(200);
        assert.ok(await region.evaluate(el => el.scrollTop) > 0); await region.evaluate(el => { el.scrollTop = 0; });
        const preview = area.locator('[class*="callSummaryPreview"]').first();
        assert.ok(await preview.evaluate(el => el.getBoundingClientRect().height) <= 42);
        const heights = await area.locator('tbody > tr:first-child').evaluateAll(els => els.map(el => el.getBoundingClientRect().height));
        assert.ok(Math.max(...heights) <= 64, `Table rows too tall: ${heights}`);
        assert.ok(Math.min(...heights) >= 56, `Table rows too short: ${heights}`);
        const secondary = area.locator('table button[class*="secondaryButton"]').first();
        const secondaryHeight = await secondary.evaluate(el => el.getBoundingClientRect().height); assert.ok(secondaryHeight >= 32 && secondaryHeight <= 36);
        console.log('Desktop row heights', heights.slice(0, 3));
      }
      if (phase === 'after') assert.equal(await page.locator('dl').last().locator('div').filter({ has: page.getByText('משימות פתוחות', { exact: true }) }).locator('dd').innerText(), '0');
      await note().click();
      const editor = page.getByPlaceholder('כתיבת הערה...').filter({ visible: true });
      await editor.waitFor();
      if (phase === "after") assert.equal(await editor.evaluate(el => el === document.activeElement), true);
      await page.screenshot({ path: `${out}/${phase}-edit-${width}.png`, fullPage: true });
      await page.screenshot({ path: `${out}/${phase}-edit-viewport-${width}.png` });
      if (phase === 'before') { await page.getByRole('button', { name: 'ביטול', exact: true }).filter({ visible: true }).click(); continue; }
      assert.equal((await editor.inputValue()).trim(), longNote.trim());
      await editor.fill('טיוטה לביטול');
      await page.getByRole('button', { name: 'ביטול', exact: true }).filter({ visible: true }).click();
      await note().click(); assert.equal((await editor.inputValue()).trim(), longNote.trim());
      await editor.fill('הערה שנשמרה בסביבת הדמה');
      if (width === 390) {
        failNextSave = true;
        await page.getByRole('button', { name: 'שמירת הערה', exact: true }).filter({ visible: true }).click();
        await page.getByText('לא הצלחנו לשמור את ההערה').waitFor();
        assert.equal(await editor.inputValue(), 'הערה שנשמרה בסביבת הדמה');
      }
      const savesBefore = saveCount;
      await page.getByRole('button', { name: 'שמירת הערה', exact: true }).filter({ visible: true }).click();
      await page.getByRole('button', { name: 'שומר...', exact: true }).filter({ visible: true }).waitFor();
      await editor.waitFor({ state: 'hidden' }); assert.equal(await note().evaluate(el => document.activeElement === el), true); assert.equal(saveCount, savesBefore + 1);
      await note().click(); assert.equal(await editor.inputValue(), 'הערה שנשמרה בסביבת הדמה');
      await page.getByRole('button', { name: 'ביטול', exact: true }).filter({ visible: true }).click();
      // No-note record remains editable.
      await area.getByRole('button', { name: 'הוספת הערה', exact: true }).filter({ visible: true }).first().focus(); await page.keyboard.press('Enter');
      assert.equal(await editor.inputValue(), ''); await page.getByRole('button', { name: 'ביטול', exact: true }).filter({ visible: true }).click();
      await search.fill('לאקיים'); await page.getByText('לא נמצאו פניות שמתאימות לחיפוש.').waitFor();
      await search.fill('משפחת בדיקה 2'); await page.waitForTimeout(100); assert.equal(await record().count(), 2); // 2 and 20
      await search.fill(''); const filter = page.getByLabel('סינון לפי סטטוס');
      await filter.selectOption('רוצה להירשם'); await page.waitForTimeout(100); assert.equal(await record().count(), 1);
      await filter.selectOption('all'); await search.focus(); await page.keyboard.press('Tab'); assert.equal(await filter.evaluate(el => el === document.activeElement), true);
      assert.notEqual(await filter.evaluate(el => getComputedStyle(el).outlineStyle), 'none');
      if (width <= 900) {
        const details = area.getByRole('button', { name: 'הצגת פרטים', exact: true }).first(); await details.click();
        const status = area.getByRole('combobox', { name: /^סטטוס רישום/ }).filter({ visible: true });
        await status.selectOption('שיחה בוצעה'); await page.waitForFunction(el => !el.disabled, await status.elementHandle()); assert.equal(await status.inputValue(), 'שיחה בוצעה');
        await area.getByRole('button', { name: 'הסתרת פרטים', exact: true }).first().click();
        const heights = await record().evaluateAll(els => els.slice(1).map(el => el.getBoundingClientRect().height));
        console.log('Mobile card heights', width, heights.slice(0, 3));
        assert.ok(Math.max(...heights) < 220, `Cards too tall: ${heights}`);
      } else {
        const status = area.getByRole('combobox', { name: 'סטטוס רישום עבור משפחת דוגמה עם שם ארוך במיוחד לבדיקה בלבד' });
        await status.selectOption('שיחה בוצעה'); await page.waitForFunction(el => !el.disabled, await status.elementHandle()); assert.equal(await status.inputValue(), 'שיחה בוצעה');
        const preview = area.locator('[class*="callSummaryPreview"]').first();
        assert.ok(await preview.evaluate(el => el.getBoundingClientRect().height) <= 42);
      }
      const create = area.getByRole('button', { name: /^פתיחת תיק( הצטרפות)?$/ }).filter({ visible: true }).first(); await create.click(); await page.getByRole('dialog').waitFor(); await page.screenshot({ path: `${out}/after-create-${width}.png` }); for (let i = 0; i < 12; i++) await page.keyboard.press('Tab'); assert.equal(await page.getByRole('dialog').evaluate(el => el.contains(document.activeElement)), true); await page.keyboard.press('Escape'); await page.getByRole('dialog').waitFor({ state: 'hidden' }); assert.equal(await create.evaluate(el => el === document.activeElement), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      if (width < 1100) {
        const menu = page.getByRole('button', { name: 'פתיחת תפריט ניהול' }); await menu.click();
        const drawer = page.getByRole('dialog', { name: 'תפריט ניהול' }); await drawer.waitFor();
        assert.equal(await drawer.getByRole('link').count(), 11);
        await page.screenshot({ path: `${out}/after-navigation-${width}.png` });
        await page.keyboard.press('Escape'); await drawer.waitFor({ state: 'hidden' }); assert.equal(await menu.evaluate(el => document.activeElement === el), true);
      }
      rows = []; missing = true; await page.reload(); await page.getByText('עדיין אין פניות ברישום.').waitFor(); await page.getByText('המידע אינו זמין').first().waitFor();
      await page.screenshot({ path: `${out}/after-empty-${width}.png`, fullPage: true });
      console.log(`PASS ${width}: editing/save/cancel, search/filter, empty/missing, keyboard, density, overflow`);
    }
    if (phase === 'after') {
      await page.goto(`${base}/admin/daycare?tab=donations`);
      await page.locator('#admin-workspace').waitFor();
      assert.equal(await page.locator('[data-admin-theme="modern-dark"]').count(), 1);
      assert.equal(await page.locator('#admin-workspace').evaluate(el => getComputedStyle(el).getPropertyValue('--admin-primary').trim()), '#173d60');
      console.log('PASS scope: donations screen uses the approved Modern Dark theme');
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
