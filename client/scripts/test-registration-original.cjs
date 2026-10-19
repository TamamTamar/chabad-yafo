// Browser tests: every API and external request is intercepted. No real server/data.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.ADMIN_TEST_ORIGIN;
assert.match(origin || '', /^http:\/\/127\.0\.0\.1:\d+$/);
(async () => {
 const browser = await chromium.launch({ channel: 'chrome', headless: true });
 try {
  for (const width of [1440, 390]) {
   const context = await browser.newContext({ viewport: { width, height: 900 } });
   const page = await context.newPage(); page.setDefaultTimeout(10000);
   let fullCase = false, failApproval = false, failLoad = false, failFamilies = false, unauthStatus = 401;
   let holdList = true, releaseList;
   let authenticated = true, failNote = false, failedCreate = false, holdMutation = false, releaseMutation, writes = [], reads = [], errors = [];
   const rows = Array.from({length: 60}, (_, i) => ({ _id: String(i), parentName: `הורה בדיקה ${i}`, childName: `ילד בדיקה ${i}`, phone: `05000000${String(i).padStart(2,'0')}`, status: i === 0 ? 'רוצה להירשם' : 'מתעניין', childAge: i === 0 ? '1.4' : '2', callNotes: '', createdAt: '2026-10-18' }));
   const caseData = { id:'fixture-case',schoolYear:'2026-2027',profileStatus:'complete', child:{firstName:'ילד בדיקה'}, guardians:[], overallStatus:'inProgress',calculatedOverallStatus:'inProgress',parentSubmissionComplete:true,progress:{percentage:40,totalSteps:4,completedSteps:0},access:{enabled:true,createdAt:'2026-10-18'},tuitionPayment:{monthlyTuitionAmount:1000,status:'pending'},steps:[{key:'childAndGuardianDetails',title:'פרטי הילד והמשפחה',status:'pendingReview',responsibleParty:'both',source:'parentForm',isVisibleToParent:true,order:1,updatedAt:'2026-10-18'}] };
   const agreement = {publishedVersion:{version:1},agreement:{id:'agreement-fixture',status:'pendingReview',revision:1,signingMethod:'online'}};
   const health = {id:'health-fixture',status:'pendingReview',revision:1,submittedAt:'2026-10-18',signingMethod:'online'};
   const pickup = {id:'pickup-fixture',status:'pendingReview',revision:1,submittedAt:'2026-10-18',signingMethod:'online'};
   page.on('pageerror', error => errors.push(error.message));
   await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    if (!url.pathname.startsWith('/api/')) return route.continue();
    const method = route.request().method();
    if (url.pathname === '/api/auth/me') return route.fulfill({status: authenticated ? 200 : unauthStatus, json: { user: {label:'בדיקה'} }});
    reads.push(url.pathname);
    if (!authenticated) return route.fulfill({status:401,json:{}});
    if (failLoad && url.pathname.endsWith('/registrations')) return route.fulfill({status:500,json:{}});
    if (failFamilies && url.pathname.endsWith('/families')) return route.fulfill({status:500,json:{}});
    if (url.pathname.endsWith('/overview')) return route.fulfill({status:200,json:{success:true,data:{openingTargetChildren:6,actualRegistrations:2,interestedCount:58,openTasks:3,completedTasks:4,generalStatus:'דורש טיפול',targetOpeningDate:'ספטמבר 2027'}}});
    if (url.pathname.endsWith('/registrations')) {
     if (holdList) await new Promise(resolve => { releaseList = resolve; });
     return route.fulfill({json:{success:true,data:{registrations:rows}}});
    }
    if (url.pathname.endsWith('/families')) return route.fulfill({json:{success:true,data:[{id:'other-family',childNames:['אח אחר בדוי'],guardians:[{fullName:'משפחה אחרת',phone:'0509999999'}]},{id:'matching-family',childNames:['אח בדוי'],guardians:[{fullName:'הורה בדיקה',phone:rows[0].phone}]}]}});
    if (fullCase && method === 'GET') {
     const data = url.pathname.endsWith('/onboarding/fixture-case') ? caseData : url.pathname.includes('/agreements/by-onboarding/') ? agreement : url.pathname.includes('/health-declarations/by-onboarding/') ? health : url.pathname.includes('/pickup-authorizations/by-onboarding/') ? pickup : [];
     return route.fulfill({json:{success:true,data}});
    }
    if (method !== 'GET') {
     const body = route.request().postDataJSON(); writes.push({path:url.pathname,body});
     if (url.pathname.includes('public-registrations')) {
      if (holdMutation) await new Promise(resolve => { releaseMutation = resolve; });
      if (failNote) return route.fulfill({status:500,json:{message:'synthetic error'}});
      Object.assign(rows[0], body); return route.fulfill({json:{success:true,data:rows[0]}});
     }
     if (url.pathname.includes('from-registration')) { if (!failedCreate) fullCase = true; return route.fulfill({status: failedCreate ? 409 : 200, json: failedCreate ? {message:'כשל בדיקה ביצירה'} : {success:true,data:{id:'fixture-case'},parentAccessUrl:'/fixture-parent'}}); }
     if (fullCase) {
      if (failApproval) return route.fulfill({status:500,json:{message:'synthetic approval failure'}});
      const record = url.pathname.includes('/steps/') ? caseData.steps[0] : url.pathname.includes('/agreements/') ? agreement.agreement : url.pathname.includes('/health-declarations/') ? health : pickup;
      record.status = body.status;
      return route.fulfill({json:{success:true,data:caseData}});
     }
     throw Error('Unexpected mutation '+url.pathname);
    }
    return route.fulfill({status:404,json:{message:'fixture'}});
   });
   await page.goto(origin + '/admin/daycare');
   await page.getByRole('heading',{name:'רישום למעון',exact:true}).waitFor();
   await page.getByText('טוען פניות...', {exact:true}).waitFor();
   holdList=false;releaseList();
   const search=page.getByRole('searchbox');
   const filter=page.getByRole('combobox',{name:'סינון לפי סטטוס',exact:true});
   await page.getByRole('status').filter({hasText:'60 תוצאות'}).waitFor();
   if(width===1440){
    const sidebar=page.getByRole('complementary',{name:'תפריט ניהול'});
    const box=await sidebar.boundingBox();assert.equal(box.x+box.width,width);
    assert.equal(await sidebar.evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(13, 38, 59)');
   }else{
    await page.getByRole('button',{name:'פתיחת תפריט ניהול'}).click();
    await page.getByRole('dialog',{name:'תפריט ניהול'}).waitFor();
    await page.getByRole('button',{name:'סגירת תפריט ניהול'}).press('Escape');
    await page.getByRole('dialog',{name:'תפריט ניהול'}).waitFor({state:'hidden'});
   }
   for(const term of ['הורה בדיקה 0','0500000000','1.4']){
    await search.fill(term);await page.getByRole('status').filter({hasText:'1 תוצאות'}).waitFor();
   }
   await search.fill('ילד בדיקה 0');await filter.selectOption('רוצה להירשם');
   const visibleButton=name=>page.getByRole('button',{name,exact:true}).filter({visible:true});
   const note=()=>page.getByRole('textbox',{name:'הערה',exact:true}).filter({visible:true});
   await visibleButton('הוספת הערה').click();await note().fill('טיוטה לבדיקה');
   failNote=true;await visibleButton('שמירת הערה').click();
   await page.getByRole('alert').filter({hasText:'לא הצלחנו לשמור'}).waitFor();assert.equal(await note().inputValue(),'טיוטה לבדיקה');
   failNote=false;holdMutation=true;const before=writes.length;
   await visibleButton('שמירת הערה').click();await visibleButton('שומר...').waitFor();
   assert.equal(await visibleButton('שומר...').isDisabled(),true);assert.equal(writes.length,before+1);
   holdMutation=false;releaseMutation();await page.getByRole('status').filter({hasText:'ההערה נשמרה'}).waitFor();
   assert.match(writes.at(-1).body.callNotes,/טיוטה לבדיקה/);
   await visibleButton(width===1440?'צפייה ועריכה':'עריכת הערה').click();await note().fill('');
   await visibleButton('שמירת הערה').click();await note().waitFor({state:'hidden'});assert.equal(writes.at(-1).body.callNotes,'');
   await visibleButton('הוספת הערה').click();await note().fill('להשלכה');await visibleButton('ביטול').click();
   await visibleButton('הוספת הערה').click();assert.equal(await note().inputValue(),'');await visibleButton('ביטול').click();
   if(width===390)await visibleButton('הצגת פרטים').click();
   const status=width===1440?page.getByLabel('סטטוס רישום עבור הורה בדיקה 0',{exact:true}):page.getByRole('combobox',{name:'סטטוס רישום',exact:true}).filter({visible:true});
   failNote=true;await status.selectOption('מתעניין');await page.getByRole('alert').filter({hasText:'לא הצלחנו לעדכן'}).waitFor();assert.equal(await status.inputValue(),'רוצה להירשם');
   failNote=false;await status.selectOption('מתעניין');await page.getByRole('status').filter({hasText:'סטטוס הפנייה נשמר'}).waitFor();
   await filter.selectOption('מתעניין');await visibleButton('הבא: שיחה בוצעה').click();
   await filter.selectOption('שיחה בוצעה');await status.selectOption('רוצה להירשם');await filter.selectOption('רוצה להירשם');
   await visibleButton('פתיחת תיק').click();
   const familySelect=page.locator('select[name="existingFamilyId"]');
   assert.match(await familySelect.locator('option').nth(1).textContent(),/התאמה לפי טלפון/);
   await familySelect.selectOption('matching-family');await page.locator('textarea[name="internalNote"]').fill('  בדיקה פנימית  ');
   await page.locator('input[name="schoolYear"]').fill('wrong');
   await visibleButton('יצירת תיק וקישור להורה').click();await page.getByText('יש להזין שנה בפורמט 2026-2027').waitFor();
   await page.locator('input[name="schoolYear"]').fill('2026-2027');
   failedCreate=true;await visibleButton('יצירת תיק וקישור להורה').click();await page.getByText('כשל בדיקה ביצירה').waitFor();assert.equal(await familySelect.inputValue(),'matching-family');
   failedCreate=false;await visibleButton('יצירת תיק וקישור להורה').click();await page.waitForURL('**/admin/daycare-onboarding/fixture-case');
   assert.equal(writes.at(-1).body.existingFamilyId,'matching-family');assert.equal(writes.at(-1).body.internalNote,'בדיקה פנימית');
   await visibleButton('שמרתי, סגירה').click();
   const approve=visibleButton('אישור כל הפרטים והמסמכים');await approve.waitFor();
   failApproval=true;await approve.click();await page.getByRole('alert').filter({hasText:'לא הצלחנו לאשר'}).waitFor();
   failApproval=false;await approve.click();await page.getByText('כל הפרטים והמסמכים אושרו. התיק ממתין כעת להסדרת תשלום.').waitFor();
   assert.equal(agreement.agreement.status,'completed');assert.equal(health.status,'completed');assert.equal(pickup.status,'completed');
   await page.getByRole('link',{name:'מעון / רישום',exact:true}).click();await search.waitFor();assert.equal(await search.inputValue(),'');
   rows[0].onboardingSummary={id:'fixture-case',schoolYear:'2026-2027',overallStatus:'inProgress',progress:caseData.progress};
   await page.reload();await search.fill('ילד בדיקה 0');await visibleButton('פתיחת התיק').click();await page.waitForURL('**/admin/daycare-onboarding/fixture-case');
   await page.getByRole('link',{name:'מעון / רישום',exact:true}).click();await search.fill('אין רשומה כזאת');await page.getByText('לא נמצאו פניות שמתאימות לחיפוש.').waitFor();
   failLoad=true;await page.reload();await page.getByRole('alert').filter({hasText:'לא הצלחנו לטעון'}).waitFor();
   failLoad=false;failFamilies=true;fullCase=false;delete rows[0].onboardingSummary;
   await page.reload();await search.fill('ילד בדיקה 0');await visibleButton('פתיחת תיק').click();
   await page.getByText('לא ניתן לטעון משפחות קיימות. יש לטעון מחדש לפני פתיחת תיק.').waitFor();
   assert.equal(await visibleButton('יצירת תיק וקישור להורה').isDisabled(),true);
   failFamilies=false;await visibleButton('טעינה מחדש של המשפחות').click();await familySelect.waitFor();
   await page.waitForFunction(()=>!document.querySelector('select[name="existingFamilyId"]').disabled);
   assert.equal(await visibleButton('יצירת תיק וקישור להורה').isEnabled(),true);
   await page.getByRole('button',{name:'סגירת חלון פתיחת תיק'}).click();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   assert.ok(reads.includes('/api/admin/daycare/overview'));
   for(const code of [401,403]){authenticated=false;unauthStatus=code;reads=[];await page.goto(origin+'/admin/daycare');await page.waitForURL('**/admin/login');assert.equal(reads.length,0);}
   assert.deepEqual(errors,[]);
   console.log(`PASS original admin mock ${width}: auth, search/filter, mutation failure/retry, cleared notes, creation validation/failure, family load guard/retry, original case approval and return.`);
   await context.close();
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
