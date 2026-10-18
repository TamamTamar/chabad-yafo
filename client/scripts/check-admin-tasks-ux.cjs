// Real Chrome, synthetic in-memory API only. No real writes or external requests.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const out=path.resolve(__dirname,'../../output/admin-tasks-ux');fs.mkdirSync(out,{recursive:true});
const base=process.env.ADMIN_QA_URL||'http://127.0.0.1:5194',phase=process.argv[2]||'after';
const fixtures=()=>Array.from({length:28},(_,i)=>({_id:`task${i}`,title:i===0?'תיאום פתיחה עם שם משימה ארוך במיוחד לבדיקת גלישה ושבירת שורות '.repeat(3):i===1?'רשימת ציוד לקנייה לפתיחת המעון':`משימת בדיקה ${i+1}`,category:i===1?'ציוד':'תכנון',priority:i===0?'דחופה':'רגילה',status:i===3?'הושלם':i===2?'בטיפול':'לא התחיל',subtasks:i===4?[]:[{title:'פריט בדיקה עם תיאור ארוך לבדיקת תצוגה נגישה '.repeat(i===0?4:1),completed:i===3,ordered:i===2,installed:false,actualCost:0}]}));
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});try{
const page=await browser.newPage();let rows=fixtures(),fail=false,loadFail=false,writes=0,loadGate=null;
await page.route('**/*',async route=>{const req=route.request(),url=new URL(req.url());if(url.origin!==new URL(base).origin)return route.abort();if(!url.pathname.startsWith('/api/'))return route.continue();
if(url.pathname==='/api/auth/me')return route.fulfill({json:{success:true,admin:true,user:{id:'demo',label:'מנהל לדוגמה'}}});
let data=[];if(url.pathname.includes('/tasks')){if(fail||loadFail){fail=false;return route.fulfill({status:500,json:{message:'Synthetic failure'}});}if(req.method()==='GET'){if(loadGate)await loadGate;data=rows;}else{writes++;await new Promise(r=>setTimeout(r,200));const parts=url.pathname.split('/'),id=parts[5],payload=req.method()==='DELETE'?null:req.postDataJSON();if(req.method()==='POST'){data={...payload,_id:'created'};rows.push(data);}else if(req.method()==='DELETE'){rows=rows.filter(t=>t._id!==id);}else{rows=rows.map(t=>{if(t._id!==id)return t;if(parts[6]==='subtasks'){const subtasks=t.subtasks.map((s,i)=>i===Number(parts[7])?{...s,...payload}:s);return {...t,subtasks,status:subtasks.every(s=>s.completed)?'הושלם':subtasks.some(s=>s.completed||s.ordered||s.installed||s.actualCost>0)?'בטיפול':'לא התחיל'};}return {...t,...payload};});data=rows.find(t=>t._id===id);}}}
if(url.pathname.endsWith('/overview'))data={expansion:{alertActive:true,status:'נדרשת היערכות',thresholdChildren:6,trackedChildren:7,readyItems:1,totalItems:2,items:[{key:'insurance',label:'ביטוח ומסמכים',ready:true},{key:'staff',label:'כוח אדם',ready:false}]}};
if(url.pathname.endsWith('/registrations'))data={registrations:[]};return route.fulfill({json:{success:true,data}});});
for(const width of [1440,768,390,320]) {
    await page.setViewportSize({width,height:1000}); rows=[];
    let releaseLoad;loadGate=new Promise(resolve=>{releaseLoad=resolve;});
    await page.goto(`${base}/admin/daycare?tab=tasks`,{waitUntil:'domcontentloaded'});
    const loading=page.getByRole('status');await loading.waitFor();
    assert.ok((await loading.boundingBox()).height<80);releaseLoad();loadGate=null;
    const empty=page.getByText(/עדיין אין משימות/);await empty.waitFor();
    assert.ok((await empty.boundingBox()).height<(width>600?64:90));
    const expansion=page.locator('[aria-labelledby="daycare-expansion"]');
    const expansionHeight=(await expansion.boundingBox()).height;
    rows=fixtures();await page.reload();await page.locator('article[data-task-id]').first().waitFor();
    assert.equal(await page.locator('article[data-task-id]').count(),27);
    const search=page.getByRole('searchbox',{name:'חיפוש משימה'});
    const activeFilter=page.locator('button[aria-pressed="true"]');
    await activeFilter.hover();
    assert.equal(await activeFilter.evaluate(el=>getComputedStyle(el).backgroundColor),
        await page.evaluate(()=>{const el=document.createElement('span');el.style.color='var(--admin-info-bg)';document.querySelector('main').append(el);const color=getComputedStyle(el).color;el.remove();return color;}));
    await search.fill('לאקיים');await page.getByText(/לא נמצאו משימות/).waitFor();
    assert.equal(await empty.count(),0);assert.equal((await expansion.boundingBox()).height,expansionHeight);
    await search.fill('');await page.getByRole('button',{name:/^הושלמו/}).click();assert.equal(await page.locator('article[data-task-id]').count(),1);await page.getByRole('button',{name:/^הכל/}).click();
    const target=page.locator('article[data-task-id="task4"]');
    const more=target.getByRole('button',{name:/פעולות עבור/});
    async function requestDeletion(){
        if(width<=600){await more.click();const panel=page.getByRole('group',{name:'פעולות עבור משימת בדיקה 5',exact:true});await panel.waitFor();const box=await panel.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width&&box.y>=0&&box.y+box.height<=1000);await panel.getByRole('button',{name:'מחיקת משימה',exact:true}).click();}
        else await target.getByRole('button',{name:'מחיקת משימת בדיקה 5',exact:true}).click();
        await page.getByRole('dialog',{name:'מחיקת משימה',exact:true}).waitFor();
        const confirm=page.getByRole('dialog',{name:'מחיקת משימה',exact:true}).getByRole('button',{name:'אישור מחיקה',exact:true});
        const dangerColor=await confirm.evaluate(el=>getComputedStyle(el).color);
        await confirm.hover();
        assert.equal(await confirm.evaluate(el=>getComputedStyle(el).color),dangerColor,'Danger action retains its semantic colour on hover');

    }
    if(width<=600){
        assert.equal(await target.getByRole('button',{name:'מחיקת משימת בדיקה 5',exact:true}).isVisible(),false);
        await more.focus();await page.keyboard.press('Enter');
        const panel=page.getByRole('group',{name:'פעולות עבור משימת בדיקה 5',exact:true});await panel.waitFor();await page.keyboard.press('Escape');await panel.waitFor({state:'hidden'});assert.equal(await more.evaluate(el=>el===document.activeElement),true);
        await more.click();await search.click();await panel.waitFor({state:'hidden'});
        if(width===390){await more.click();await panel.waitFor();await page.screenshot({path:`${out}/mobile-actions.png`});await page.keyboard.press('Escape');}
        // Last row near viewport bottom must also open inside the viewport.
        const lastMore=page.locator('article[data-task-id]').last().getByRole('button',{name:/פעולות עבור/});await lastMore.scrollIntoViewIfNeeded();await lastMore.click();const lastPanel=page.getByRole('group',{name:/פעולות עבור/}).filter({visible:true});await lastPanel.waitFor();const box=await lastPanel.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width&&box.y>=0&&box.y+box.height<=1000);await page.keyboard.press('Escape');
    }
    const writesBefore=writes;await requestDeletion();const dialog=page.getByRole('dialog',{name:'מחיקת משימה',exact:true});assert.equal(await dialog.getByRole('button',{name:'ביטול',exact:true}).evaluate(el=>el===document.activeElement),true);await dialog.getByRole('button',{name:'ביטול',exact:true}).click();assert.equal(writes,writesBefore);assert.equal(await target.count(),1);
    await requestDeletion();await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert.equal(writes,writesBefore);
    await requestDeletion();await dialog.getByRole('button',{name:'אישור מחיקה',exact:true}).click();await dialog.waitFor({state:'hidden'});await target.waitFor({state:'detached'});assert.equal(writes,writesBefore+1);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.equal((await expansion.boundingBox()).height,expansionHeight);
    console.log('PASS',width,'compact empty/loading; filtered empty; long list; delete cancel/Escape/confirm; keyboard; menu bounds; expansion unchanged; overflow');
}
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
