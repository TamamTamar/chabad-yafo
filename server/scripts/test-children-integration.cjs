const assert=require('node:assert/strict');const fs=require('node:fs');
const mongoose=require('mongoose');const {connectDB}=require('../dist/config/connectDB');
const {DaycareRegistration}=require('../dist/models/DaycareRegistration');const {DaycareFamily}=require('../dist/models/DaycareFamily');const {DaycareOnboarding}=require('../dist/models/DaycareOnboarding');const {DaycareHealthDeclaration}=require('../dist/models/DaycareHealthDeclaration');
const {getDaycareStorageProvider}=require('../dist/services/daycareStorageService');
const PDFDocument=require('pdfkit');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const api=process.env.SAFE_API_ORIGIN;const vite=process.env.SAFE_WEB_ORIGIN;
(async()=>{let browser;try{
 const manifest=JSON.parse(fs.readFileSync(process.env.SAFE_MONGO_MANIFEST,'utf8'));assert.equal(manifest.mode,'test');assert.match(api,/^http:\/\/127\.0\.0\.1:\d+$/);
 await connectDB();assert.equal(mongoose.connection.name,manifest.database);
 const marker=await mongoose.connection.db.collection('__runtime_identity').findOne({_id:'managed-runtime'});assert.equal(marker.nonce,manifest.nonce);
 assert.deepEqual((await mongoose.connection.db.listCollections().toArray()).map(x=>x.name),['__runtime_identity'],'startup must not seed/create collections or indexes');
 const attestation=await fetch(api+'/__safe-runtime');assert.equal(attestation.status,200);
 const expected=require('node:crypto').createHash('sha256').update(manifest.nonce).digest('hex');assert.equal((await attestation.json()).proof,expected);
 const login=await fetch(api+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:process.env.ADMIN_PASSWORD})});assert.equal(login.status,200);const {token}=await login.json();assert.ok(token);
 const request=async(path,method='GET',body)=>{const response=await fetch(api+'/api/'+path,{method,headers:{Authorization:'Bearer '+token,Origin:vite,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,body:await response.json()};};
 // Fixture writes ONLY after all ownership, empty database and nonce checks.
 const family=await DaycareFamily.create({guardians:[{fullName:'הורה בדיקה מבודדת',role:'mother',phone:'0500000000'}],address:{city:'בדיקה',street:'רחוב בדוי',houseNumber:'1'}});
 const registration=await DaycareRegistration.create({parentName:'הורה בדיקה מבודדת',phone:'0500000000',childName:'ילד בדיקה מבודדת',childAge:'2',requiredHours:'עד 15:30',status:'מתעניין'});
 const before=(await mongoose.connection.db.listCollections().toArray()).length;
 assert.equal((await request('admin/daycare/overview')).status,200);assert.equal((await mongoose.connection.db.listCollections().toArray()).length,before);
 assert.equal((await request('admin/maintenance/agreement-draft','POST',{})).status,400);
 browser=await chromium.launch({channel:'chrome',headless:true});
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900}});const page=await context.newPage();page.setDefaultTimeout(15000);
  await context.addInitScript(token=>sessionStorage.setItem('local_admin_token',token),token);
  let mutations=0;const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin!==vite)return route.abort();if(url.pathname.startsWith('/api/')&&route.request().method()!=='GET')mutations++;return route.continue();});
  await page.goto(vite+'/admin/daycare');
  try { await page.getByRole('heading',{name:'רישום למעון',exact:true}).waitFor(); } catch(e) { console.log('Synthetic browser diagnostics:', await page.locator('body').innerText(), errors); throw e; }
  const search=page.getByRole('searchbox');await search.fill('ילד בדיקה מבודדת');
  const filter=page.getByRole('combobox',{name:'סינון לפי סטטוס',exact:true});
  await filter.selectOption(width===1440?'מתעניין':'רוצה להירשם');
  if(width===1440){
   const sidebar=page.getByRole('complementary',{name:'תפריט ניהול'});assert.ok(await sidebar.isVisible());
   const shell=await sidebar.evaluate(el=>({right:el.getBoundingClientRect().right,background:getComputedStyle(el).backgroundColor}));
   assert.equal(shell.right,width);assert.equal(shell.background,'rgb(13, 38, 59)');
   await page.getByLabel('סטטוס רישום עבור הורה בדיקה מבודדת',{exact:true}).selectOption('רוצה להירשם');
   await page.getByRole('status').filter({hasText:'סטטוס הפנייה נשמר'}).waitFor();
   assert.equal((await DaycareRegistration.findById(registration._id)).status,'רוצה להירשם');
   await filter.selectOption('רוצה להירשם');
   await page.getByRole('button',{name:'הוספת הערה',exact:true}).filter({visible:true}).click();
   await page.getByRole('textbox',{name:'הערה',exact:true}).filter({visible:true}).fill('הערת אינטגרציה בדויה');
   await page.getByRole('button',{name:'שמירת הערה',exact:true}).filter({visible:true}).click();
   await page.getByRole('status').filter({hasText:'ההערה נשמרה'}).waitFor();assert.match((await DaycareRegistration.findById(registration._id)).callNotes,/הערת אינטגרציה בדויה/);
   await page.getByRole('button',{name:'צפייה ועריכה',exact:true}).filter({visible:true}).click();
   await page.getByRole('textbox',{name:'הערה',exact:true}).filter({visible:true}).fill('');
   await page.getByRole('button',{name:'שמירת הערה',exact:true}).filter({visible:true}).click();
   await page.getByRole('status').filter({hasText:'ההערה נשמרה'}).waitFor();assert.equal((await DaycareRegistration.findById(registration._id)).callNotes,'');
   await page.getByRole('button',{name:'פתיחת תיק',exact:true}).filter({visible:true}).click();
   await page.locator('select[name="existingFamilyId"]').selectOption(family.id);
   await page.getByRole('button',{name:'יצירת תיק וקישור להורה'}).click();await page.waitForURL('**/admin/daycare-onboarding/*');
   const onboarding=await DaycareOnboarding.findOne({'origin.recordId':registration._id});assert.ok(onboarding);assert.equal(String(onboarding.familyId),family.id);
   onboarding.parentSubmittedAt=new Date();await onboarding.save();
   const pdf=await new Promise(resolve=>{const chunks=[];const doc=new PDFDocument();doc.on('data',b=>chunks.push(b));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.text('ISOLATED SYNTHETIC HEALTH FIXTURE');doc.end();});
   const stored=await getDaycareStorageProvider().upload({bytes:pdf,mimeType:'application/pdf',originalName:'synthetic.pdf',category:'health-declarations'});
   await DaycareHealthDeclaration.create({signedPdfFile:stored,onboardingId:onboarding._id,documentId:'isolated-health-fixture',revision:1,formVersion:'test',status:'pendingReview',signingMethod:'online',contentHash:'a'.repeat(64),submittedAt:new Date()});
   const document=await DaycareHealthDeclaration.findOne({onboardingId:onboarding._id});
   const reviewed=await request('admin/daycare/health-declarations/'+document.id+'/review','PATCH',{status:'completed',parentMessage:''});assert.equal(reviewed.status,200);
   assert.equal((await DaycareHealthDeclaration.findById(document._id)).status,'completed');
   const download=await fetch(api+'/api/admin/daycare/health-declarations/'+document.id+'/signed-copy',{headers:{Authorization:'Bearer '+token}});assert.equal(download.status,200);assert.deepEqual(Buffer.from(await download.arrayBuffer()),pdf);
   await page.getByRole('button',{name:/סגירה/}).filter({visible:true}).first().click().catch(()=>{});
   await page.getByRole('link',{name:'מעון / רישום',exact:true}).click();
  }else{
   await page.getByRole('button',{name:'פתיחת תפריט ניהול',exact:true}).click();
   await page.getByRole('dialog',{name:'תפריט ניהול'}).waitFor();
   await page.getByRole('button',{name:'סגירת תפריט ניהול',exact:true}).click();
   await page.getByRole('dialog',{name:'תפריט ניהול'}).waitFor({state:'hidden'});
   await page.getByRole('button',{name:'פתיחת התיק',exact:true}).filter({visible:true}).click();
   await page.getByRole('link',{name:'מעון / רישום',exact:true}).click();
  }
  // Legacy navigation deliberately returns to its original registration screen.
  await search.waitFor();assert.match(page.url(),/\/admin\/daycare(?:\?|$)/);
  assert.equal(await search.inputValue(),'');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:`/tmp/original-admin-${width}.png`,fullPage:true});
  assert.deepEqual(errors,[]);
  console.log(`PASS original admin ${width}: legacy navigation, search/filter, notes, family assignment/documents; isolated writes (${mutations}).`);
  await context.close();
 }
 await require('./test-children-readiness.cjs')({request,api,vite,token,browser,mongoose,onboarding:await DaycareOnboarding.findOne({'origin.recordId':registration._id})});
 assert.equal(await DaycareOnboarding.countDocuments(),1);assert.equal(await DaycareFamily.countDocuments(),1);
 console.log('PASS real API document review persisted; no startup seeds, no external services, no existing database.');
}finally{if(browser)await browser.close();await mongoose.disconnect();}})().catch(error=>{console.error('Isolated children integration failed:',error.code||error.name, error instanceof assert.AssertionError || error.name === 'TimeoutError' ? error.message : '(details suppressed)');process.exitCode=1;});
