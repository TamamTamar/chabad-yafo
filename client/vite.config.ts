import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname } from 'node:path';

export default defineConfig(async ({ command, isPreview }) => {
  if (isPreview) throw new Error("Local production-bundle preview is disabled; use the managed development profile");
  if (command === 'build') return { plugins:[react()] };
  const target=process.env.SAFE_API_TARGET;
  const file=process.env.SAFE_MONGO_MANIFEST;
  if (!target || !/^http:\/\/127\.0\.0\.1:\d+$/.test(target) || !file) throw new Error('Use the managed server dev command; a verified local API is required');
  const manifest=JSON.parse(readFileSync(file,'utf8'));
  const response=await fetch(target+'/__safe-runtime');
  const identity = await response.json() as {proof?:string};
  if (!response.ok || identity.proof !== createHash('sha256').update(manifest.nonce).digest('hex')) throw new Error('Development API identity mismatch');
  return { plugins:[react()], envDir:dirname(file), define:{'import.meta.env.VITE_API_URL':JSON.stringify('/api')},
    server:{host:'127.0.0.1',proxy:{'/api':{target,changeOrigin:true}}} };
});
