import {spawnSync} from 'node:child_process';
import {ensureDefaultDaycareDonationCampaign} from '../services/daycareDonationService';
import {DaycareDonationCampaign} from '../models/DaycareDonationCampaign';
import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import {join} from 'node:path';
import mongoose from 'mongoose';
import { validateManagedMongo, mongoConnectionPolicy, ManagedMongo } from '../config/mongoSafety';
import { connectDB } from '../config/connectDB';
import { requireMaintenanceAuthorization, withMaintenanceAuthorization } from '../config/maintenanceAuthorization';
import { ensureDefaultAgreementDraft, reconcileAgreementOnboardingSteps } from '../services/daycareAgreementService';
import { ensureDefaultParentDocumentYear, backfillParentDocumentSnapshots } from '../services/daycareParentDocumentService';
import { ensureDefaultDaycareAnnualPlan } from '../services/daycareAnnualPlanService';
import { ensureDaycareAgreementIndexes } from '../services/daycareAgreementIndexService';
import { ensureDaycareOnboardingIndexes } from '../services/daycareOnboardingIndexService';
import { ensureDaycarePaymentStorage } from '../services/daycarePaymentIndexService';
import { syncDaycareOnboardingStepTitles } from '../services/daycareOnboardingTitleSyncService';
const database='chabad_test_'+'a'.repeat(32);
const good:ManagedMongo={mode:'test',uri:'mongodb://127.0.0.1:27499/'+database,database,nonce:'b'.repeat(64),mongoPid:process.pid};
test('managed policy rejects remote, ambiguous, existing/default names, credentials, overrides and mode mismatch',()=>{
 assert.equal(validateManagedMongo(good),good);
 for(const uri of ['mongodb+srv://remote.invalid/'+database,'mongodb://remote.invalid/'+database,'mongodb://localhost:27499/'+database,'mongodb://127.0.0.1:27499/test','mongodb://127.0.0.1:27499/'+database+'?dbName=production','mongodb://user:password@127.0.0.1:27499/'+database,'mongodb://127.0.0.1:27499,remote.invalid/'+database])assert.throws(()=>validateManagedMongo({...good,uri}));
 assert.throws(()=>validateManagedMongo({...good,mode:'development'}));
});
test('misconfigured development is blocked before mongoose.connect, independent of NODE_ENV',async t=>{
 const old={...process.env};t.after(()=>{process.env=old;});
 const connect=t.mock.method(mongoose,'connect',async()=>{throw Error('must never connect');});
 for(const config of [{NODE_ENV:'development',MONGO_URI:'mongodb://remote.invalid/production'},{NODE_ENV:'production',MONGO_URI:'mongodb://remote.invalid/production'},{NODE_ENV:'test',MONGO_URI:''}]){
  delete process.env.SAFE_MONGO_MANIFEST;Object.assign(process.env,config);await assert.rejects(connectDB());
 }
 assert.equal(connect.mock.callCount(),0);
});
test('wrong runtime nonce disconnects before any application write; auto indexes/collections are disabled',async t=>{
 const old={...process.env};const root=mkdtempSync(join(tmpdir(),'chabad-safe-'));const file=join(root,'runtime.json');writeFileSync(file,JSON.stringify(good),{mode:0o600});
 delete process.env.MONGO_URI;process.env.NODE_ENV='test';process.env.SAFE_MONGO_MANIFEST=file;
 const oldDb=mongoose.connection.db;const oldName=mongoose.connection.name;
 t.after(()=>{process.env=old;(mongoose.connection as any).db=oldDb;(mongoose.connection as any).name=oldName;rmSync(root,{recursive:true,force:true});});
 assert.equal(mongoConnectionPolicy().managed?.database,database);
 (mongoose.connection as any).db={collection:()=>({findOne:async()=>({nonce:'wrong',mode:'test'})})} as any;(mongoose.connection as any).name=database;
 const connect=t.mock.method(mongoose,'connect',async()=>mongoose);const disconnect=t.mock.method(mongoose,'disconnect',async()=>{});
 await assert.rejects(connectDB(),/IDENTITY_MISMATCH/);assert.equal(disconnect.mock.callCount(),1);
 assert.deepEqual(connect.mock.calls[0].arguments[1],{autoIndex:false,autoCreate:false});
});
test('all startup maintenance functions reject without explicit scoped approval before querying models',async()=>{
 const functions=[ensureDefaultAgreementDraft,ensureDefaultParentDocumentYear,ensureDefaultDaycareAnnualPlan,ensureDaycareAgreementIndexes,ensureDaycareOnboardingIndexes,ensureDaycarePaymentStorage,syncDaycareOnboardingStepTitles,reconcileAgreementOnboardingSteps,backfillParentDocumentSnapshots];
 for(const action of functions)await assert.rejects(action(),/EXPLICIT_MAINTENANCE_REQUIRED/);
 assert.throws(requireMaintenanceAuthorization);await withMaintenanceAuthorization(async()=>requireMaintenanceAuthorization());assert.throws(requireMaintenanceAuthorization);
});

test('production needs a separate explicit invocation, approval and named database; NODE_ENV never enables dotenv in development',()=>{
 const code="const m=require('./dist/config/mongoSafety');try{m.mongoConnectionPolicy();console.log('ALLOWED')}catch{console.log('BLOCKED')}";
 const env={PATH:process.env.PATH,NODE_ENV:'production',MONGO_URI:'mongodb+srv://example.invalid/explicit_db'};
 assert.equal(spawnSync(process.execPath,['-e',code,'--','--production'],{env,encoding:'utf8'}).stdout.trim(),'BLOCKED');
 assert.equal(spawnSync(process.execPath,['-e',code,'--','--production'],{env:{...env,PRODUCTION_DATABASE_APPROVAL:'ALLOW_PRODUCTION_CONNECTION',PRODUCTION_MONGO_DATABASE:'different'},encoding:'utf8'}).stdout.trim(),'BLOCKED');
 assert.equal(spawnSync(process.execPath,['-e',code,'--','--production'],{env:{...env,PRODUCTION_DATABASE_APPROVAL:'ALLOW_PRODUCTION_CONNECTION',PRODUCTION_MONGO_DATABASE:'explicit_db'},encoding:'utf8'}).stdout.trim(),'ALLOWED');
 // Existing production deployments may use the driver's default database.
 const legacyEnv={...env,MONGO_URI:'mongodb+srv://example.invalid/',PRODUCTION_DATABASE_APPROVAL:'ALLOW_PRODUCTION_CONNECTION',PRODUCTION_MONGO_DATABASE:'test'};
 const policyCode="const p=require('./dist/config/mongoSafety').mongoConnectionPolicy();console.log(p.database)";
 assert.equal(spawnSync(process.execPath,['-e',policyCode,'--','--production'],{env:legacyEnv,encoding:'utf8'}).stdout.trim(),'test');
 for(const database of ['admin','local','config','chabad_test_existing']) {
  assert.equal(spawnSync(process.execPath,['-e',code,'--','--production'],{env:{...legacyEnv,PRODUCTION_MONGO_DATABASE:database},encoding:'utf8'}).stdout.trim(),'BLOCKED');
 }
 const loader="require('./dist/config/runtimeEnvironment').loadRuntimeEnvironment();console.log(process.env.MONGO_URI?'LOADED':'EMPTY')";
 assert.equal(spawnSync(process.execPath,['-e',loader],{env:{PATH:process.env.PATH,NODE_ENV:'production'},encoding:'utf8'}).stdout.trim(),'EMPTY');
});
test('campaign lazy read cannot create or repair records without explicit maintenance',async t=>{
 t.mock.method(DaycareDonationCampaign,'findOne',async()=>null);
 const writes=t.mock.method(DaycareDonationCampaign,'updateOne',async()=>{throw Error('must not write');});
 await assert.rejects(ensureDefaultDaycareDonationCampaign(),/EXPLICIT_MAINTENANCE_REQUIRED/);assert.equal(writes.mock.callCount(),0);
});
