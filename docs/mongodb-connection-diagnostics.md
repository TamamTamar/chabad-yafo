# MongoDB connection diagnostics

## Findings (2026-09-25)

- `server/src/index.ts` calls `connectDB()` once, awaits it and startup maintenance, then starts HTTP. Initial connection failure exits the process; it does not serve requests as if connected.
- `connectDB()` uses `mongoose.connect(MONGO_URI)` on the default Mongoose connection. There is no per-request `connect`, `createConnection`, `MongoClient`, `close` or `disconnect` in application code. Test connections are separate from application startup.
- MaftirYona models use `mongoose.model(...)`, and `mongoose.startSession()` uses the same default connection. A session/transaction is not a new client or pool. The driver reuses connections and maintains a pool per MongoDB server, per application process.
- `useAuction` waits for each request to settle before scheduling the next poll after 4 seconds. Each active page polls separately. `getAuction` performs deadline finalization and a transactional snapshot, so polling generates database work, but does not rebuild the connection pool.
- Installed locally: Mongoose 9.8.1, its resolved MongoDB driver 7.5.0.
- In that driver's `src/sdam/monitor.ts`, a heartbeat failure of type `MongoNetworkTimeoutError` adds `ResetPool` and `InterruptInUseConnections`. `src/sdam/topology.ts` clears the pool, and `src/cmap/connection_pool.ts` interrupts in-use connections with `PoolClearedOnNetworkError`. The direct trigger is a server-monitor timeout, not proof of a faulty application singleton or a full pool.
- The driver handles monitoring, server selection, pool recovery and applicable retries. Application code has no manual reconnect loop. A failed request still fails, and the MaftirYona route still returns 503.

## Local settings inspected without connecting

The local `server/.env` URI parsed as SRV with TLS, credentials, `directConnection=false`, and these options. No URI, host, credentials or database content was printed. The deployed environment and SRV TXT records were not inspected.

| Option | Value |
| --- | --- |
| `connectTimeoutMS` | 30000 |
| `serverSelectionTimeoutMS` | 30000 |
| `socketTimeoutMS` | 0 (no operation-socket inactivity timeout) |
| `heartbeatFrequencyMS` | 10000 |
| `maxPoolSize` / `minPoolSize` | 100 / 0 |
| `maxIdleTimeMS` / `waitQueueTimeoutMS` | 0 / 0 |
| `retryReads` / `retryWrites` | true / true |

`socketTimeoutMS=0` does not disable monitor timeouts. `connectTimeoutMS` also participates in monitoring deadlines. Heartbeat frequency is the monitoring interval, not an operation timeout. No timeouts or pool settings were changed.

## Minimal infrastructure change

`monitorMongoConnection()` attaches once to the existing connection, before connecting. Once connected, it attaches once to that client's heartbeat and pool events. Logs include effective timeout/pool settings, connection errors/disconnections, heartbeat failures/recovery and pool clearing/recovery. Connection, heartbeat and pool diagnostics include an ISO 8601 UTC timestamp. Identical consecutive failures are suppressed per stream/member, with a reminder on the next failure after 60 seconds. suppressedRepeats counts omitted events since the preceding log and is included on reminders, changed failures and recovery. Changed failures, pool interruption escalation and recovery are logged immediately. Recovery resets suppression. No timers, reconnects or database calls are added. Event handlers only observe; they do not connect, retry operations or change HTTP responses.

Error diagnostics contain technical names, codes, immediate cause names/codes and a fixed reason. Raw error messages, events, URIs, hostnames, credentials and operation data are not logged. Member numbers correlate events within each process without logging hostnames. Recovery and settings logs use `console.info` because the existing `logger.log` is disabled in production. Driver monitoring attaches after the initial successful connection; initial connect rejection continues to propagate to the existing startup failure handler.

## What remains to verify in production

The reported error establishes the monitor timeout, but not why it occurred. There is no production Atlas/Railway telemetry available in this inspection, and no production database operation was performed.

1. Correlate the UTC timestamp of `MongoDB heartbeat failed` (including `causeCode`), pool clear and HTTP 503 with Atlas metrics and events: primary election, maintenance, restarts, paused/unavailable cluster, CPU/memory/I/O pressure, latency and connection limits. A high connection count alone does not establish this error's cause.
2. From the actual hosting environment, verify DNS SRV/TXT resolution, outbound TCP access to Atlas, TLS trust and the Atlas Network Access list against the host's current outbound addresses. Do not broadly open the access list as a diagnostic workaround.
3. Verify the deployed `MONGO_URI` points to the intended cluster, credentials are valid and URL-encoded, and URI options do not unexpectedly override timeouts, pool size, TLS or topology. Do not paste the URI into logs. Compare the new effective-settings log with local values.
4. Check hosting process restarts, sleep/suspension, CPU throttling, event-loop stalls, memory pressure and network interruptions at the same timestamp. Count processes/replicas: each legitimately owns its own client and pools.
5. Compare errors on other DB-backed routes. `/api/health` returns a static `{ok:true}` and does not test MongoDB connectivity.
6. Compare active polling clients and database load. Polling exposes the shared connection failure and can contribute load, but there is no evidence that it caused this timeout. Do not change auction behavior or increase timeouts without supporting measurements.

Sources: [Mongoose connections](https://mongoosejs.com/docs/connections.html), [MongoDB pool behavior](https://www.mongodb.com/docs/drivers/node/current/connect/connection-options/connection-pools/), [Atlas connection troubleshooting](https://www.mongodb.com/docs/atlas/troubleshoot-connection/). The precise error path was verified against the locally installed driver source.
