import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export default defineConfig(async ({ command, isPreview }) => {
  if (isPreview) throw new Error("Local production-bundle preview is disabled; use the managed development profile");
  if (command === 'build') return { plugins:[react()] };
  let target=process.env.SAFE_API_TARGET;
  let file=process.env.SAFE_MONGO_MANIFEST;
  let webPort: number | undefined;
  if (!target && !file) {
    const discoveryFile=resolve(dirname(fileURLToPath(import.meta.url)), '../server/tmp/dev-runtime.json');
    // Allow either terminal to start first while the isolated API boots.
    for (let attempt=0; attempt<60; attempt++) {
      try {
        const runtime=JSON.parse(readFileSync(discoveryFile, 'utf8'));
        if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(runtime.target) || !Number.isInteger(runtime.webPort) || runtime.webPort<1 || runtime.webPort>65535) throw new Error('Invalid local runtime');
        const response=await fetch(runtime.target+'/__safe-runtime', {signal:AbortSignal.timeout(1000)});
        if (response.ok) {
          target=runtime.target;
          file=runtime.manifest;
          webPort=runtime.webPort;
          break;
        }
      } catch { /* Server may still be starting, or discovery may be stale. */ }
      if (attempt===0) console.log('Waiting for the local API. Run npm run dev in server in a second terminal.');
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  if (!target || !/^http:\/\/127\.0\.0\.1:\d+$/.test(target) || !file) throw new Error('Start npm run dev in server, then run npm run dev in client; a verified local API is required');
  const manifest=JSON.parse(readFileSync(file,'utf8'));
  const response=await fetch(target+'/__safe-runtime');
  const identity = await response.json() as {proof?:string};
  if (!response.ok || identity.proof !== createHash('sha256').update(manifest.nonce).digest('hex')) throw new Error('Development API identity mismatch');
  return { plugins:[react()], envDir:dirname(file), define:{'import.meta.env.VITE_API_URL':JSON.stringify('/api')},
    server:{host:webPort ? 'localhost' : '127.0.0.1',port:webPort,strictPort:true,proxy:{'/api':{target,changeOrigin:true}}} };
});
