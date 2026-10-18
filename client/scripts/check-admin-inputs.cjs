// Optional browser QA. All API requests are mocked; no real data is read or written.
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const out = path.resolve(__dirname, '../../output/admin-inputs');
fs.mkdirSync(out, {recursive:true});
const phase = process.argv[2] || 'after';
const base = process.env.ADMIN_QA_URL || 'http://127.0.0.1:5192';
(async()=>{
 const browser = await chromium.launch({headless:true,channel:'chrome'});
 try {
  const page = await browser.newPage();
  await page.route('**/*', async route=>{
   const url = new URL(route.request().url());
   if(url.origin!==new URL(base).origin) return route.abort();
   if(!url.pathname.startsWith('/api/')) return route.continue();
   if(route.request().method()!=='GET') return route.abort();
   if(url.pathname==='/api/auth/me') return route.fulfill({json:{success:true,admin:true,user:{label:'חשבון בדיקה'}}});
   let data=[];
   if(url.pathname.endsWith('/registrations')) data={registrations:[{_id:'demo',parentName:'משפחת בדיקה בלבד',phone:'0500000000',childName:'ילד לדוגמה',childAge:'שנתיים',status:'רוצה להירשם'}]};
   if(url.pathname.endsWith('/overview')) data={openingTargetChildren:20,actualRegistrations:0,interestedCount:1,openTasks:0,completedTasks:0,targetOpeningDate:'ספטמבר 2027',generalStatus:'בהכנה'};
   await route.fulfill({json:{success:true,data}});
  });
  // Include breathing room so focus halos are visible outside the field border.
  async function capture(locator, name, margin=6) {
   await locator.scrollIntoViewIfNeeded();
   const box=await locator.boundingBox();assert.ok(box);
   const viewport=page.viewportSize();
   const x=Math.max(0,box.x-margin), y=Math.max(0,box.y-margin);
   await page.screenshot({path:path.join(out,name),animations:'disabled',clip:{x,y,width:Math.min(viewport.width-x,box.width+2*margin),height:Math.min(viewport.height-y,box.height+2*margin)}});
  }
  for(const width of [1440,768,390,320]) {
   await page.setViewportSize({width,height:1000});await page.goto(`${base}/admin/daycare`);
   const search=page.getByPlaceholder('שם הורה, ילד או טלפון');await search.waitFor();await page.evaluate(()=>document.fonts.ready);
   const filter=page.getByLabel('סינון לפי סטטוס');
   const toolbar=page.locator('[class*="registrationToolbar"]');
   await page.mouse.move(0,0);await capture(toolbar,`${phase}-toolbar-${width}.png`);
   if(phase==='after'){await search.hover();await capture(toolbar,`after-hover-${width}.png`);}
   await search.focus();await capture(toolbar,`${phase}-search-focus-${width}.png`);
   await filter.focus();await capture(toolbar,`${phase}-select-focus-${width}.png`);
   if(phase==='after') {
    await search.focus();
    const style=await search.evaluate(el=>{const s=getComputedStyle(el);return {height:el.getBoundingClientRect().height,radius:s.borderRadius,shadow:s.boxShadow,direction:s.direction,size:s.fontSize,padding:s.paddingInlineStart};});
    assert.equal(style.height,46);assert.equal(style.radius,'11px');assert.equal(style.direction,'rtl');assert.equal(style.size,'16px');assert.equal(style.padding,'46px');assert.notEqual(style.shadow,'none');
    assert.equal(await filter.evaluate(el=>getComputedStyle(el).appearance),'none');
    assert.notEqual(await filter.evaluate(el=>getComputedStyle(el).backgroundImage),'none');
    assert.equal(await filter.evaluate(el=>el.getBoundingClientRect().height),46);
    const icon=toolbar.locator('[data-input-icon]');assert.equal(await icon.count(),1);
    assert.ok(await icon.evaluate(el=>{const box=el.getBoundingClientRect(),input=el.parentElement.querySelector('input').getBoundingClientRect();return box.x>input.x+input.width/2;}));
    await search.fill('לא קיים');await page.getByText('לא נמצאו פניות שמתאימות לחיפוש.').waitFor();await search.fill('');
    await filter.selectOption('מתעניין');await page.getByText('לא נמצאו פניות שמתאימות לחיפוש.').waitFor();await filter.selectOption('all');
    // Exercise styling-only states temporarily on the rendered field. No requests occur.
    const original=await search.evaluate(el=>{el.disabled=true;return el.disabled;});assert.equal(original,true);
    await capture(toolbar,`after-disabled-${width}.png`);assert.equal(await search.evaluate(el=>getComputedStyle(el).cursor),'not-allowed');await search.evaluate(el=>{el.disabled=false;});
   }
   const create=page.getByRole('button',{name:'פתיחת תיק',exact:true}).filter({visible:true}).first();await create.click();
   const dialog=page.getByRole('dialog',{name:'פתיחת תיק הצטרפות'});await dialog.waitFor();
   const year=dialog.getByLabel('שנת לימודים');await year.focus();
   await capture(year.locator('..'),`${phase}-modal-field-${width}.png`);
   await page.screenshot({path:path.join(out,`${phase}-modal-${width}.png`)});
   if(phase==='after') {
    assert.equal(await year.evaluate(el=>el.getBoundingClientRect().height),46);
    assert.equal(await year.evaluate(el=>getComputedStyle(el).borderRadius),'11px');
    await year.fill('לא תקין');await year.press('Tab');await dialog.getByText('יש להזין שנה בפורמט 2026-2027').waitFor();
    assert.equal(await year.getAttribute('aria-invalid'),'true');await year.focus();await capture(year.locator('..'),`after-error-${width}.png`);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.equal(await dialog.evaluate(el=>el.scrollWidth>el.clientWidth),false);
   }
   await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   console.log(`PASS ${phase} ${width}: toolbar/modal screenshots, RTL, focus, dimensions, select, states, overflow`);
  }
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
