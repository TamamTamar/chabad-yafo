import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { DaycareRegistration } from '../models/DaycareRegistration';
import { DaycareTask } from '../models/DaycareTask';
import { DaycareDocument } from '../models/DaycareDocument';
import { DaycareFinanceSettings } from '../models/DaycareFinanceSettings';
import { daycareOverviewRoutes } from '../routes/admin/daycareOverviewRoutes';
import { daycareTaskRoutes } from '../routes/admin/daycareTaskRoutes';
import { daycareDocumentRoutes } from '../routes/admin/daycareDocumentRoutes';
import { daycareFinanceRoutes } from '../routes/admin/daycareFinanceRoutes';
import { daycareInitializationRoutes } from '../routes/admin/daycareInitializationRoutes';
import { defaultFinanceSettings, defaultDaycareDocuments, defaultDaycareTasks } from '../routes/admin/daycareDefaults';

type Row = Record<string, any>; // Deliberately minimal, in-memory model fixtures.
const secret = 'daycare-read-only-tests-no-database';
const query = (value: unknown): any => ({
    select: () => query(value), sort: () => query(value),
    lean: async () => structuredClone(value),
    then: (yes: any, no: any) => Promise.resolve(value).then(yes, no),
});
const models = [DaycareRegistration, DaycareTask, DaycareDocument, DaycareFinanceSettings];
const writes = ['create', 'insertOne', 'insertMany', 'bulkWrite', 'bulkSave', 'updateOne', 'updateMany', 'replaceOne',
    'findOneAndUpdate', 'findByIdAndUpdate', 'findOneAndReplace', 'deleteOne', 'deleteMany', 'findOneAndDelete', 'findByIdAndDelete'];
const wire = async () => {
    const app = express(); app.use(express.json());
    app.use('/api/admin', daycareOverviewRoutes, daycareTaskRoutes, daycareDocumentRoutes, daycareFinanceRoutes, daycareInitializationRoutes);
    const server = app.listen(0, '127.0.0.1');
    await new Promise<void>(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${(server.address() as {port: number}).port}`;
    return { close: () => new Promise<void>(resolve => server.close(() => resolve())), request: (path: string, method = 'GET', body?: object, role = 'admin', origin = 'http://localhost:5173', contentType = 'application/json') => fetch(base + '/api/admin/daycare/' + path, {
        method, headers: { Origin: origin, 'Content-Type': contentType, ...(role ? {Authorization: `Bearer ${jwt.sign({role},secret)}`} : {}) },
        ...(body ? {body:JSON.stringify(body)} : {}),
    }) };
};

for (const state of ['empty', 'populated', 'partial', 'missing-settings'] as const) {
    test(`GET overview/tasks/documents/finance are read-only with ${state} database, including repeat reads`, async t => {
        t.mock.method(mongoose, 'connect', () => { throw new Error('No database connection allowed'); });
        t.mock.method(mongoose, 'createConnection', () => { throw new Error('No database connection allowed'); });
        const previous = process.env.JWT_SECRET; process.env.JWT_SECRET = secret;
        const attempts: string[] = [];
        const trip = (name: string) => () => { attempts.push(name); throw new Error(`Forbidden write: ${name}`); };
        for (const model of models) {
            for (const method of writes) if (typeof (model as any)[method] === 'function') t.mock.method(model as any, method, trip(`${model.modelName}.${method}`));
            for (const method of ['save','updateOne','deleteOne']) t.mock.method(model.prototype, method, trip(`${model.modelName}#${method}`));
            for (const method of ['insertOne','insertMany','updateOne','updateMany','replaceOne','deleteOne','deleteMany','bulkWrite','findOneAndUpdate','findOneAndDelete']) {
                if (typeof (model.collection as any)[method] === 'function') t.mock.method(model.collection as any, method, trip(`collection.${method}`));
            }
        }
        const populated = state === 'populated' || state === 'missing-settings';
        const registrations: Row[] = populated ? [{status:'נרשם'},{status:'נרשם'},{status:'מתעניין'}] : [];
        const tasks: Row[] = state === 'empty' ? [] : state === 'partial' ? [{title:'משימה מותאמת',category:'תכנון',status:'בטיפול',priority:'רגילה'}] : [
            {title:'רישוי',category:'אישורים',status:'הושלם',priority:'רגילה',subtasks:[{actualCost:75}]},
            {title:'גיוס',category:'כוח אדם',status:'הושלם',priority:'רגילה'},
            {title:'משימה פתוחה',category:'תכנון',status:'בטיפול',priority:'דחופה'},
        ];
        const documents: Row[] = state === 'empty' ? [] : state === 'partial' ? [{name:defaultDaycareDocuments[0].name,status:'חסר',fileUrl:''}] :
            ['רישוי','ביטוח','טופס הרשמה','בטיחות','חוזה הורים','מעקב תשלומים'].map(name=>({name,status:'קיים'}));
        const finance = state === 'empty' || state === 'missing-settings' ? null : {...structuredClone(defaultFinanceSettings),currentChildren:8,pricePerChild:1000,taskDefaultsInitialized:false};
        const snapshot = structuredClone({registrations,tasks,documents,finance});
        t.mock.method(DaycareRegistration, 'countDocuments', (filter: any) => Promise.resolve(filter.status === 'נרשם' ? registrations.filter(x=>x.status==='נרשם').length : registrations.filter(x=>x.status!=='נרשם').length));
        t.mock.method(DaycareTask, 'countDocuments', (filter: any) => Promise.resolve(tasks.filter(x=>(typeof filter.status === 'string' ? x.status===filter.status : x.status!=='הושלם') && (!filter.priority || x.priority===filter.priority)).length));
        t.mock.method(DaycareTask, 'find', () => query(tasks));
        t.mock.method(DaycareDocument, 'find', () => query(documents));
        t.mock.method(DaycareFinanceSettings, 'findOne', () => query(finance && {...finance,toObject:()=>structuredClone(finance)}));
        const http = await wire();
        try {
            assert.equal((await http.request('overview','GET',undefined,'')).status,401);
            assert.equal((await http.request('overview','GET',undefined,'other')).status,403);
            for (let repeat=0;repeat<2;repeat++) {
                for (const path of ['overview','tasks','documents','finance']) {
                    const response = await http.request(path); assert.equal(response.status,200,path);
                    const {data} = await response.json() as any;
                    if (path==='overview') {
                        assert.equal(data.actualRegistrations,populated?2:0);
                        assert.equal(data.openTasks,state==='empty'?0:1);
                        assert.equal(data.completedTasks,populated?2:0);
                        assert.equal(data.expansion.readyItems,populated?6:0);
                        assert.equal(data.generalStatus,'דורש טיפול');
                    }
                    if (path==='tasks') assert.deepEqual(data,tasks);
                    if (path==='documents') assert.deepEqual(data,documents);
                    if (path==='finance') {assert.equal(data.taskActualCosts,populated?75:0);assert.equal(data.pricePerChild,finance?.pricePerChild??defaultFinanceSettings.pricePerChild);}
                }
            }
            t.mock.method(DaycareRegistration,'countDocuments',async()=>{throw new Error('synthetic read failure');});
            assert.equal((await http.request('overview')).status,500);
            assert.deepEqual(attempts,[]);
            assert.deepEqual({registrations,tasks,documents,finance},snapshot);
        } finally { await http.close(); if(previous===undefined)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=previous; }
    });
}

test('explicit bootstrap is authenticated, origin/JSON/confirmation protected, repeatable and never repairs existing records', async t => {
    t.mock.method(mongoose,'connect',()=>{throw new Error('No real DB');});
    const previous=process.env.JWT_SECRET;process.env.JWT_SECRET=secret;
    let settings: any = null; const tasks: any[]=[]; const documents: any[]=[{name:defaultDaycareDocuments[0].name,status:'קיים',fileUrl:''}];
    const originalDocument=structuredClone(documents[0]); let mutationCount=0;
    const attachSave = (value: any) => Object.assign(value,{save:async()=>{mutationCount++;return value;}});
    t.mock.method(DaycareFinanceSettings,'findOne',()=>query(settings));
    t.mock.method(DaycareFinanceSettings,'create',async(value: any)=>{mutationCount++;settings=attachSave({...structuredClone(value),_id:'settings-test'});return settings;});
    t.mock.method(DaycareTask,'exists',async()=>tasks.length?{_id:'task-test'}:null);
    t.mock.method(DaycareTask,'insertMany',async(values: any[])=>{mutationCount++;tasks.push(...structuredClone(values));return values;});
    t.mock.method(DaycareDocument,'find',()=>query(documents));
    t.mock.method(DaycareDocument,'insertMany',async(values: any[])=>{mutationCount++;documents.push(...structuredClone(values));return values;});
    t.mock.method(DaycareDocument,'updateOne',()=>{throw new Error('Existing documents must not be repaired');});
    const http=await wire();const confirmation={confirmation:'INITIALIZE_DAYCARE_DEFAULTS'};
    try {
        assert.equal((await http.request('initialize','POST',confirmation,'')).status,401);
        assert.equal((await http.request('initialize','POST',confirmation,'other')).status,403);
        assert.equal((await http.request('initialize','POST',confirmation,'admin','https://untrusted.example')).status,403);
        assert.equal((await http.request('initialize','POST',confirmation,'admin','http://localhost:5173','text/plain')).status,415);
        assert.equal((await http.request('initialize','POST',{})).status,400);assert.equal(mutationCount,0);
        const initial = await Promise.all([http.request('initialize','POST',confirmation),http.request('initialize','POST',confirmation)]);
        assert.ok(initial.every(response=>response.status===200));
        assert.equal(tasks.length,defaultDaycareTasks.length);assert.equal(documents.length,defaultDaycareDocuments.length);assert.equal(settings.taskDefaultsInitialized,true);
        assert.deepEqual(documents[0],originalDocument);const count=mutationCount;
        const repeat=await http.request('initialize','POST',confirmation);assert.equal(repeat.status,200);
        assert.deepEqual((await repeat.json() as any).data,{tasksCreated:0,documentsCreated:0});assert.equal(mutationCount,count);
        tasks.length=0; // Intentional deletion must not be undone after initialization.
        assert.equal((await http.request('initialize','POST',confirmation)).status,200);assert.equal(tasks.length,0);
        settings.taskDefaultsInitialized=false;tasks.push({title:'משימה קיימת',status:'בטיפול'});settings.pricePerChild=4321;
        assert.equal((await http.request('initialize','POST',confirmation)).status,200);
        assert.equal(tasks.length,1);assert.equal(settings.pricePerChild,4321);assert.deepEqual(documents[0],originalDocument);
    }finally{await http.close();if(previous===undefined)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=previous;}
});

test('first explicit finance save still creates settings; finance GET never needs a persisted ID', async t=>{
    const previous=process.env.JWT_SECRET;process.env.JWT_SECRET=secret;let settings:any=null;let creates=0;
    t.mock.method(DaycareFinanceSettings,'findOne',()=>query(settings && {...settings,toObject:()=>structuredClone(settings)}));
    t.mock.method(DaycareFinanceSettings,'create',async(value:any)=>{creates++;settings={...value,_id:'test-settings'};return settings;});
    t.mock.method(DaycareFinanceSettings,'findByIdAndUpdate',async(id:any,value:any)=>{assert.equal(id,'test-settings');settings={...settings,...value};return {toObject:()=>structuredClone(settings)};});
    t.mock.method(DaycareTask,'find',()=>query([]));const http=await wire();
    try {
        assert.equal((await http.request('finance')).status,200);assert.equal(creates,0);
        const response=await http.request('finance','PATCH',{pricePerChild:1200,currentChildren:2});assert.equal(response.status,200);assert.equal(creates,1);
        assert.equal((await response.json() as any).data.pricePerChild,1200);
        assert.equal((await http.request('finance')).status,200);assert.equal(creates,1);
    }finally{await http.close();if(previous===undefined)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=previous;}
});
