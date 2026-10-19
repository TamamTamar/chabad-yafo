import { readFileSync, statSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { productionInvocation } from './runtimeEnvironment';
export type ManagedMongo = { mode: 'development' | 'test'; uri: string; database: string; nonce: string; mongoPid: number };
export function validateManagedMongo(value: ManagedMongo) {
    let url: URL;
    try { url = new URL(value.uri); } catch { throw new Error('UNSAFE_MONGO_TARGET'); }
    if (url.protocol !== 'mongodb:' || url.hostname !== '127.0.0.1' || !/^\d+$/.test(url.port) || Number(url.port)<1024 ||
        url.search || url.username || url.password || !/^chabad_(dev|test)_[a-f0-9]{32}$/.test(value.database) ||
        url.pathname !== '/'+value.database || !/^[a-f0-9]{64}$/.test(value.nonce) ||
        !['development','test'].includes(value.mode) || !Number.isInteger(value.mongoPid) || value.mongoPid<=0 ||
        !value.database.startsWith(value.mode==='test'?'chabad_test_':'chabad_dev_')) throw new Error('UNSAFE_MONGO_TARGET');
    return value;
}
export function mongoConnectionPolicy(): { uri: string; managed?: ManagedMongo } {
    if (productionInvocation) {
        if (process.env.NODE_ENV !== 'production' || !process.env.MONGO_URI || process.env.SAFE_MONGO_MANIFEST || process.env.PRODUCTION_DATABASE_APPROVAL !== 'ALLOW_PRODUCTION_CONNECTION') throw new Error('INVALID_PRODUCTION_INVOCATION');
        let url: URL;
        try { url = new URL(process.env.MONGO_URI); } catch { throw new Error('INVALID_PRODUCTION_TARGET'); }
        const database = process.env.PRODUCTION_MONGO_DATABASE;
        if (!database || url.pathname !== '/'+database || ['admin','local','config','test'].includes(database) || /^chabad_(dev|test)_/.test(database)) throw new Error('EXPLICIT_PRODUCTION_DATABASE_REQUIRED');
        return { uri: process.env.MONGO_URI };
    }
    if (process.env.NODE_ENV === 'production' || process.env.MONGO_URI) throw new Error('DEVELOPMENT_MONGO_ENV_REJECTED');
    const path=process.env.SAFE_MONGO_MANIFEST;
    if (!path) throw new Error('MANAGED_MONGO_REQUIRED');
    const root=resolve(dirname(path)); const temp=resolve(tmpdir());
    if (!root.startsWith(temp+'/chabad-safe-') || basename(path)!=='runtime.json' || (statSync(path).mode&0o077)!==0) throw new Error('INVALID_MANAGED_MONGO_MANIFEST');
    const managed=validateManagedMongo(JSON.parse(readFileSync(path,'utf8')));
    try { process.kill(managed.mongoPid,0); } catch { throw new Error('MANAGED_MONGO_NOT_RUNNING'); }
    return {uri:managed.uri,managed};
}
