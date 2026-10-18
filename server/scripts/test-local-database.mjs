import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import net from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { MongoClient } from 'mongodb';

// Fixed loopback ports match the strict URI guards in the test suites.
// Refuse occupied ports; never attach to an existing database or read .env.
const root = await mkdtemp(join(tmpdir(), 'chabad-db-qa-'));
const children = [];
const binary = process.env.MONGOD_BINARY || 'mongod';
async function assertFree(port) {
    const server = net.createServer();
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, '127.0.0.1', resolve);
    });
    await new Promise(resolve => server.close(resolve));
}
async function start(port, replica = false) {
    await assertFree(port);
    const dbpath = join(root, String(port));
    await mkdir(dbpath);
    const child = spawn(binary, ['--bind_ip', '127.0.0.1', '--port', String(port), '--dbpath', dbpath,
        '--logpath', join(root, `${port}.log`), ...(replica ? ['--replSet', 'maftirqa'] : [])], { stdio: 'ignore' });
    children.push(child);
    let spawnError;
    child.once('error', error => { spawnError = error; });
    // This short bootstrap deadline applies only to the disposable test server.
    const client = new MongoClient(`mongodb://127.0.0.1:${port}/?directConnection=true`, { serverSelectionTimeoutMS: 500 });
    try {
        let ready = false;
        for (let attempt = 0; attempt < 40; attempt++) {
            if (spawnError) throw spawnError;
            if (child.exitCode !== null) throw new Error('Disposable mongod exited during startup');
            try { await client.connect(); ready = true; break; } catch { await delay(100); }
        }
        assert.ok(ready, 'Disposable mongod startup timed out');
        if (replica) {
            await client.db('admin').command({ replSetInitiate: { _id: 'maftirqa', members: [{ _id: 0, host: '127.0.0.1:27039' }] } });
            let primary = false;
            for (let attempt = 0; attempt < 100; attempt++) {
                if ((await client.db('admin').command({ hello: 1 })).isWritablePrimary) { primary = true; break; }
                await delay(100);
            }
            assert.ok(primary, 'Disposable replica set did not elect its primary');
        }
    } finally { await client.close(); }
}
try {
    await start(27029);
    await start(27039, true);
    const suffix = `run_${Date.now()}`;
    const env = { ...process.env,
        SHIFRA_TEST_MONGO_URI: `mongodb://127.0.0.1:27029/shifra_qa_${suffix}`,
        ARBAAT_TEST_MONGO_URI: `mongodb://127.0.0.1:27029/arbaat_qa_${suffix}`,
        MAFTIR_TEST_MONGO_URI: `mongodb://127.0.0.1:27039/maftir_qa_${suffix}?replicaSet=maftirqa`,
        RESILIENCE_TEST_MONGO_URI: `mongodb://127.0.0.1:27039/chabad_qa_${suffix}?replicaSet=maftirqa`,
    };
    delete env.MONGO_URI;
    delete env.MAFTIR_YONA_OUTBID_WEBHOOK_URL;
    const files = process.argv.includes('--all')
        ? (await readdir('dist/tests')).filter(name => name.endsWith('.test.js')).map(name => `dist/tests/${name}`)
        : ['shifraPua', 'shifraPlanning', 'arbaatHaminimRoutes', 'maftirYonaRoutes', 'databaseResilience'].map(name => `dist/tests/${name}.test.js`);
    const tests = spawn(process.execPath, ['--test', ...files], { env, stdio: 'inherit' });
    const [code] = await once(tests, 'exit');
    process.exitCode = code ?? 1;
} catch (error) {
    // Avoid serializing arbitrary errors or environment values.
    console.error('Local database tests could not finish.', { code: error?.code ?? 'test_setup_failed' });
    process.exitCode = 1;
} finally {
    for (const child of children.reverse()) {
        if (child.exitCode === null && child.pid) {
            const stopped = once(child, 'exit');
            child.kill('SIGTERM');
            await stopped;
        }
    }
    await rm(root, { recursive: true, force: true });
}
