const {spawnSync}=require('node:child_process');const fs=require('node:fs');
// No .env, provider credentials or database opt-in variables reach unit tests.
const env={PATH:process.env.PATH,NODE_ENV:'test',JWT_SECRET:'unit-tests-only-not-production',TWILIO_ACCOUNT_SID:'AC'+'0'.repeat(32),TWILIO_AUTH_TOKEN:'unit-only',TWILIO_WHATSAPP_FROM:'whatsapp:+10000000000',ADMIN_WHATSAPP_TO:'whatsapp:+10000000001'};
const files=fs.readdirSync('dist/tests').filter(x=>x.endsWith('.test.js')).map(x=>'dist/tests/'+x);
process.exitCode=spawnSync(process.execPath,['--test',...files],{env,stdio:'inherit'}).status??1;
