// Owns a NEW disposable MongoDB process/dbpath. Never reads .env or MONGO_URI.
const {spawn}=require('node:child_process');
const {once}=require('node:events');
const fs=require('node:fs/promises');const path=require('node:path');const os=require('node:os');const net=require('node:net');const crypto=require('node:crypto');
const {MongoClient}=require('mongodb');
const mode=process.argv.includes('--test')?'test':'development';
const serverRoot=path.resolve(__dirname,'..');const children=[];let root;let stopping;
const discoveryFile=path.join(serverRoot,'tmp','dev-runtime.json');
let discoveryPublished=false;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function freePort(){const s=net.createServer();s.listen(0,'127.0.0.1');await once(s,'listening');const port=s.address().port;await new Promise(r=>s.close(r));return port;}
async function stop(){if(stopping)return stopping;stopping=(async()=>{for(const child of children.reverse()){if(child.exitCode===null&&child.pid){const done=once(child,'exit');child.kill('SIGTERM');await done;}}if(discoveryPublished){try{const current=JSON.parse(await fs.readFile(discoveryFile,'utf8'));if(current.manifest===path.join(root,'runtime.json'))await fs.rm(discoveryFile,{force:true});}catch{}}if(root)await fs.rm(root,{recursive:true,force:true});})();return stopping;}
process.once('SIGINT',()=>stop().then(()=>process.exit(130)));process.once('SIGTERM',()=>stop().then(()=>process.exit(143)));
(async()=>{
 try {
  root=await fs.mkdtemp(path.join(os.tmpdir(),'chabad-safe-'));await fs.chmod(root,0o700);
  const mongoPort=await freePort(),apiPort=await freePort(),webPort=mode==='test'?await freePort():5173;const dbpath=path.join(root,'db');await fs.mkdir(dbpath);
  const binary=process.env.MONGOD_BINARY||'mongod';
  const mongo=spawn(binary,['--bind_ip','127.0.0.1','--port',String(mongoPort),'--dbpath',dbpath,'--replSet','isolatedqa','--logpath',path.join(root,'mongo.log')],{stdio:'ignore'});children.push(mongo);
  let spawnError;mongo.on('error',e=>{spawnError=e;});
  const client=new MongoClient(`mongodb://127.0.0.1:${mongoPort}/`,{directConnection:true,serverSelectionTimeoutMS:400});
  let ready=false;
  for(let i=0;i<60;i++){if(spawnError||mongo.exitCode!==null)throw Error('OWNED_MONGO_START_FAILED');try{await client.connect();ready=true;break;}catch{await sleep(100);}}
  if(!ready)throw Error('OWNED_MONGO_UNAVAILABLE');
  // PID and an entirely new dbpath prove this is OUR process, not a local tunnel or pre-existing database.
  const status=await client.db('admin').command({serverStatus:1});
  if(status.pid!==mongo.pid||mongo.exitCode!==null)throw Error('MONGO_PROCESS_IDENTITY_MISMATCH');
  await client.db('admin').command({replSetInitiate:{_id:'isolatedqa',members:[{_id:0,host:`127.0.0.1:${mongoPort}`}]}});
  ready=false;for(let i=0;i<100;i++){if((await client.db('admin').command({hello:1})).isWritablePrimary){ready=true;break;}await sleep(100);}if(!ready)throw Error('NO_ISOLATED_PRIMARY');
  const database=`chabad_${mode==='test'?'test':'dev'}_${crypto.randomBytes(16).toString('hex')}`;
  const nonce=crypto.randomBytes(32).toString('hex');
  if((await client.db(database).listCollections().toArray()).length)throw Error('ISOLATED_DATABASE_NOT_EMPTY');
  await client.db(database).collection('__runtime_identity').insertOne({_id:'managed-runtime',mode,nonce});
  await client.close();
  const manifest=path.join(root,'runtime.json');await fs.writeFile(manifest,JSON.stringify({mode,uri:`mongodb://127.0.0.1:${mongoPort}/${database}`,database,nonce,mongoPid:mongo.pid}),{mode:0o600});
  const env={PATH:process.env.PATH,TMPDIR:os.tmpdir(),NODE_ENV:mode,SAFE_MONGO_MANIFEST:manifest,SAFE_UPLOAD_ROOT:path.join(root,'uploads'),PORT:String(apiPort),CLIENT_ORIGIN:mode==='test'?`http://127.0.0.1:${webPort}`:`http://localhost:${webPort}`,
   JWT_SECRET:crypto.randomBytes(32).toString('hex'),ADMIN_PASSWORD:crypto.randomBytes(24).toString('hex'),
   TWILIO_ACCOUNT_SID:'AC'+'0'.repeat(32),TWILIO_AUTH_TOKEN:'isolated-only',TWILIO_WHATSAPP_FROM:'whatsapp:+10000000000',ADMIN_WHATSAPP_TO:'whatsapp:+10000000001',
   DAYCARE_PII_ENCRYPTION_KEY:crypto.randomBytes(32).toString('base64'),PLAYWRIGHT_MODULE:process.env.PLAYWRIGHT_MODULE};
  const log=await fs.open(path.join(root,'server.log'),'w');
  const backend=spawn(process.execPath,['--require',path.join(__dirname,'safe-network-preload.cjs'),path.join(serverRoot,'dist/index.js')],{cwd:root,env,stdio:['ignore',log.fd,log.fd]});children.push(backend);
  let health=false;for(let i=0;i<100;i++){if(backend.exitCode!==null)throw Error('SAFE_BACKEND_START_FAILED');try{const r=await fetch(`http://127.0.0.1:${apiPort}/`);if(r.ok){health=true;break;}}catch{}await sleep(100);}if(!health)throw Error('SAFE_BACKEND_UNAVAILABLE');
  if(mode==='test'){
  const web=spawn(process.execPath,[path.join(serverRoot,'../client/node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port',String(webPort),'--strictPort'],{cwd:path.join(serverRoot,'../client'),env:{...env,SAFE_API_TARGET:`http://127.0.0.1:${apiPort}`,VITE_API_URL:'/api'},stdio:['ignore',log.fd,log.fd]});children.push(web);
  let webReady=false;for(let i=0;i<100;i++){if(web.exitCode!==null)throw Error('SAFE_FRONTEND_START_FAILED');try{if((await fetch(`http://127.0.0.1:${webPort}/`)).ok){webReady=true;break;}}catch{}await sleep(100);}if(!webReady)throw Error('SAFE_FRONTEND_UNAVAILABLE');
  }else{
   await fs.mkdir(path.dirname(discoveryFile),{recursive:true});
   const pending=path.join(root,'dev-runtime.json');
   await fs.writeFile(pending,JSON.stringify({target:`http://127.0.0.1:${apiPort}`,manifest,webPort}),{mode:0o600});
   // Copy atomically on the same filesystem as the discovery file.
   const staging=discoveryFile+'.'+process.pid;
   await fs.copyFile(pending,staging);await fs.chmod(staging,0o600);await fs.rename(staging,discoveryFile);discoveryPublished=true;
  }
  await fs.writeFile(path.join(root,'login.txt'),env.ADMIN_PASSWORD,{mode:0o600});
  console.log('Verified isolated MongoDB: owned PID, fresh dbpath, fresh database, nonce, loopback only; no inherited credentials.');
  if(mode==='test'){
   const test=spawn(process.execPath,[path.join(__dirname,'test-children-integration.cjs')],{cwd:serverRoot,env:{...env,SAFE_API_ORIGIN:`http://127.0.0.1:${apiPort}`,SAFE_WEB_ORIGIN:`http://127.0.0.1:${webPort}`},stdio:'inherit'});children.push(test);const [code]=await once(test,'exit');process.exitCode=code??1;
   if (code===0) {
    const mocks=spawn(process.execPath,[path.join(serverRoot,'../client/scripts/test-registration-original.cjs')],{cwd:serverRoot,env:{...env,ADMIN_TEST_ORIGIN:`http://127.0.0.1:${webPort}`},stdio:'inherit'});children.push(mocks);const [mockCode]=await once(mocks,'exit');process.exitCode=mockCode??1;
   }
  }else{
   if(process.argv.includes('--pilot')){
    const seed=spawn(process.execPath,['--require',path.join(__dirname,'safe-network-preload.cjs'),path.join(__dirname,'seed-usability-pilot.cjs')],{cwd:serverRoot,env:{...env,SAFE_API_ORIGIN:`http://127.0.0.1:${apiPort}`},stdio:'inherit'});children.push(seed);const [seedCode]=await once(seed,'exit');if(seedCode!==0)throw Error('PILOT_PREPARATION_FAILED');
   }
   console.log('API ready. In a second terminal: cd client && npm run dev');
   console.log(`Safe development admin: http://localhost:${webPort}/admin/daycare (disposable; stop with Ctrl-C). Login password file: ${path.join(root,'login.txt')}`);await once(backend,'exit');}
 }catch(error){if(error?.code==='ENOENT'||error?.message==='OWNED_MONGO_START_FAILED')console.error('MongoDB could not start. Install mongod or set MONGOD_BINARY to its executable path.');console.error('Safe environment refused to start or integration failed. No existing database was used.');process.exitCode=1;}
 finally{await stop();}
})();
