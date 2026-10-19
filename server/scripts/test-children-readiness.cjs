// Called only after the parent runner verifies owned Mongo PID, empty DB and HTTP nonce.
const assert = require('node:assert/strict');
module.exports = async ({request, api, vite, token, browser, onboarding, mongoose}) => {
 const {DaycareAgreement}=require('../dist/models/DaycareAgreement');
 const {DaycarePayment}=require('../dist/models/DaycarePayment');
 const {DaycareOnboarding}=require('../dist/models/DaycareOnboarding');
 const {buildDefaultAgreementDraft}=require('../dist/services/daycareAgreementService');
 const check=async(path,method,body,status=200)=>{const r=await request(path,method,body);assert.equal(r.status,status,`${method} ${path}: ${r.body.code||'unexpected status'}`);return r.body;};
 const base='admin/daycare/onboarding/'+onboarding.id;
 assert.equal((await fetch(api+'/api/'+base)).status,401);
 const denied=await fetch(api+'/api/'+base,{method:'PATCH',headers:{Authorization:'Bearer '+token,Origin:'https://untrusted.invalid','Content-Type':'application/json'},body:JSON.stringify({overallStatus:'completed'})});assert.equal(denied.status,403);
 await check(base+'/steps/registrationApproved','PATCH',{status:'completed'},409);
 await check(base+'/steps/registrationFeeReceived','PATCH',{status:'completed'},409);
 // Explicit test-only initialization on the already attested disposable database.
 await check('admin/maintenance/parent-documents','POST',{confirmation:'CONFIRM_parent-documents'});
 const draft=buildDefaultAgreementDraft();
 const document={format:draft.format,title:'הסכם בדיקה בלבד',intro:draft.intro,sections:draft.sections};
 const created=await check('admin/daycare/agreements/versions','POST',{version:'isolated.1',schoolYear:onboarding.schoolYear,document},201);
 const version=created.data.id;
 await check('admin/daycare/agreements/versions/'+version+'/publish','POST',{legalReviewConfirmed:false},400);
 await check('admin/daycare/agreements/versions/'+version+'/publish','POST',{legalReviewConfirmed:true});
 await check('admin/daycare/agreements/versions/'+version,'PATCH',{document},409);
 await check(base+'/steps/childAndGuardianDetails','PATCH',{status:'pendingReview'});
 const link=await check(base+'/regenerate-link','POST',{});const parentToken=new URL(link.parentAccessUrl).pathname.split('/').pop();assert.ok(parentToken);
 // Reset the earlier document fixture so the real public parent submission can run next.
 await DaycareOnboarding.updateOne({_id:onboarding._id},{$unset:{parentSubmittedAt:1}});
 const profileUrl=api+'/api/daycare/onboarding/public/'+parentToken;
 const profile={child:{firstName:'ילד',lastName:'בדיקה',birthDate:'2024-02-29'},guardians:[{fullName:'הורה בדיקה',role:'mother',phone:'0500000000',email:'synthetic@example.invalid'}],address:{city:'בדיקה',street:'רחוב בדוי',houseNumber:'1'}};
 const profileResponse=await fetch(profileUrl+'/profile',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(profile)});assert.equal(profileResponse.status,200,'real parent profile submission');
 assert.equal((await fetch(profileUrl+'/submit',{method:'POST'})).status,409,'incomplete bundle must be blocked');
 const publicBase=api+'/api/daycare/agreements/public/'+parentToken;
 let response=await fetch(publicBase);assert.equal(response.status,200);assert.equal((await response.json()).data.available,true);
 const signature=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
 const sign=async(accepted)=>{const form=new FormData();for(const [key,value] of Object.entries({signedBy:'הורה בדיקה',signerRole:'mother',signerIsraeliId:'123456782',acceptedTerms:String(accepted),parentDocumentsAccepted:'true'}))form.set(key,value);form.set('signature',new Blob([signature],{type:'image/png'}),'synthetic.png');return fetch(publicBase+'/sign',{method:'POST',body:form,headers:{Origin:vite}});};
 assert.equal((await sign(false)).status,400);
 response=await sign(true);assert.equal(response.status,200,'synthetic online signature');
 let agreement=await DaycareAgreement.findOne({onboardingId:onboarding._id}).sort({revision:-1});assert.ok(agreement.signedPdfFile);assert.equal(agreement.status,'pendingReview');assert.equal(agreement.revision,1);
 await check('admin/daycare/agreements/'+agreement.id+'/review','PATCH',{status:'requiresCorrection',parentMessage:''},400);
 await check('admin/daycare/agreements/'+agreement.id+'/review','PATCH',{status:'requiresCorrection',parentMessage:'נדרש תיקון בדיקה'});
 assert.equal((await DaycareOnboarding.findById(onboarding._id)).steps.find(s=>s.key==='agreementSigned').status,'requiresCorrection');
 response=await sign(true);assert.equal(response.status,200,'replacement signature');
 agreement=await DaycareAgreement.findOne({onboardingId:onboarding._id}).sort({revision:-1});assert.equal(agreement.revision,2);
 await check('admin/daycare/agreements/'+agreement.id+'/review','PATCH',{status:'completed'});
 const copy=await fetch(publicBase+'/signed-copy');assert.equal(copy.status,200);assert.equal(Buffer.from(await copy.arrayBuffer()).subarray(0,4).toString(),'%PDF');
 const submitDocument=async(kind,payload)=>{const form=new FormData();form.set('payload',JSON.stringify(payload));form.set('signature',new Blob([signature],{type:'image/png'}),'synthetic.png');const r=await fetch(api+'/api/daycare/'+kind+'/public/'+parentToken+'/submit',{method:'POST',body:form});assert.equal(r.status,200,kind+' online submission');};
 await submitDocument('health-declarations',{healthCondition:'נתון בדיקה בלבד',medicationSensitivities:'ללא - בדיקה',healthFund:'בדיקה',hasAllergies:false,informationConfirmed:true,allergyResponsibilityAccepted:true,signedBy:'הורה בדיקה',signerRole:'mother'});
 await submitDocument('pickup-authorizations',{collectors:[],informationConfirmed:true,signedBy:'הורה בדיקה',signerRole:'mother'});
 const bundle=await fetch(profileUrl+'/submit',{method:'POST'});assert.equal(bundle.status,200,'complete parent bundle');assert.ok((await DaycareOnboarding.findById(onboarding._id)).parentSubmittedAt);
 await check(base+'/steps/childAndGuardianDetails','PATCH',{status:'completed'});
 for(const [modelName,route] of [['DaycareHealthDeclaration','health-declarations'],['DaycarePickupAuthorization','pickup-authorizations']]){const Model=require('../dist/models/'+modelName)[modelName];const item=await Model.findOne({onboardingId:onboarding._id}).sort({revision:-1});assert.ok(item.signedPdfFile);await check('admin/daycare/'+route+'/'+item.id+'/review','PATCH',{status:'completed'});}
 assert.equal((await sign(true)).status,409,'submitted bundle locks signature');
 console.log('PASS isolated parent flow: real profile, health/pickup signed submissions, incomplete bundle blocked, complete bundle submitted, admin document approval, post-submission signing blocked.');
 console.log('PASS isolated agreement: draft/publish guard/immutable version, synthetic online signature, correction/re-sign revision 2, approval and signed PDF.');
 // Local data states only: never invoke provider intent/callback or establish a real mandate.
 const pay='admin/daycare/payments/onboarding/'+onboarding.id;
 await check(pay+'/settings','PATCH',{monthlyTuitionAmount:0},400);
 await check(pay+'/settings','PATCH',{monthlyTuitionAmount:2450});
 const fixture={onboardingId:onboarding._id,childName:'ילד בדיקה',schoolYear:onboarding.schoolYear,monthlyTuitionAmount:2450,requestedAmount:2450,expiresAt:new Date(Date.now()+600000)};
 const pending=await DaycarePayment.create({...fixture,publicId:'isolated-pending',status:'created'});
 await check(pay+'/settings','PATCH',{monthlyTuitionAmount:2500},409);
 pending.status='expired';await pending.save();await check(pay+'/settings','PATCH',{monthlyTuitionAmount:2500});
 for(const status of ['failed','confirmed'])await DaycarePayment.create({...fixture,publicId:'isolated-'+status,status,...(status==='confirmed'?{externalTransactionId:'SYNTHETIC-NOT-A-CHARGE',paidAt:new Date(),paidAmount:2450}:{})});
 assert.equal((await check(pay+'/history','GET')).data.length,3);
 for(const width of [1440,390]){
  const ctx=await browser.newContext({viewport:{width,height:900}});await ctx.addInitScript(t=>sessionStorage.setItem('local_admin_token',t),token);
  await ctx.route('**/*',r=>new URL(r.request().url()).origin===vite?r.continue():r.abort());
  const page=await ctx.newPage();await page.goto(vite+'/admin/daycare-onboarding/'+onboarding.id);
  await page.getByRole('heading',{name:'שכר לימוד והוראת קבע',exact:true}).waitFor();
  const amount=page.getByLabel('שכר לימוד חודשי (₪)',{exact:true});assert.equal(await amount.inputValue(),'2500');
  assert.equal(await page.getByRole('button',{name:'שמירת שכר הלימוד',exact:true}).isEnabled(),true);
  if(width===1440){await amount.fill('0');await page.getByRole('button',{name:'שמירת שכר הלימוד',exact:true}).click();await page.getByText('שמירת הגדרות שכר הלימוד נכשלה',{exact:true}).waitFor();assert.equal((await DaycareOnboarding.findById(onboarding._id)).monthlyTuitionAmount,2500);await amount.fill('2500');}

  await page.getByText('היסטוריית עסקאות (3)',{exact:true}).click();await page.getByText('SYNTHETIC-NOT-A-CHARGE',{exact:false}).waitFor();
  await page.screenshot({path:`/tmp/children-readiness-tuition-${width}.png`,fullPage:true});await ctx.close();
 }
 await DaycareOnboarding.updateOne({_id:onboarding._id},{$set:{standingOrderStatus:'active',standingOrderTransactionId:'SYNTHETIC-NOT-A-CHARGE',standingOrderEstablishedAt:new Date()}});
 await check(pay+'/settings','PATCH',{monthlyTuitionAmount:2600},409);
 await check(base+'/steps/registrationFeeReceived','PATCH',{status:'completed'});
 await check(base+'/steps/registrationApproved','PATCH',{status:'completed'});
 const finished=await DaycareOnboarding.findById(onboarding._id);assert.equal(finished.steps.find(s=>s.key==='registrationApproved').status,'completed');assert.equal(finished.overallStatus,'completed','all onboarding steps complete');
 const ctx=await browser.newContext({viewport:{width:390,height:900}});await ctx.addInitScript(t=>sessionStorage.setItem('local_admin_token',t),token);await ctx.route('**/*',r=>new URL(r.request().url()).origin===vite?r.continue():r.abort());
 const page=await ctx.newPage();await page.goto(vite+'/admin/daycare-onboarding/'+onboarding.id);await page.getByRole('heading',{name:'שכר לימוד והוראת קבע',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'שמירת שכר הלימוד',exact:true}).isDisabled(),true);await ctx.close();
 assert.equal(mongoose.connection.name,JSON.parse(require('node:fs').readFileSync(process.env.SAFE_MONGO_MANIFEST)).database);
 console.log('PASS isolated tuition: invalid/pending/expired/failed/confirmed fixtures, active amount lock, desktop/mobile history and disabled controls, payment approval and placement; no provider calls.');
};
