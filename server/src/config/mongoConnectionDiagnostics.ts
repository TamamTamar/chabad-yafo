import type { Connection } from 'mongoose';
import { logger } from '../utils/logger';

const monitoredConnections = new WeakSet<Connection>();
const monitoredClients = new WeakSet<ReturnType<Connection['getClient']>>();
const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' ? value as Record<string, unknown> : {};
const token = (value: unknown) => typeof value === 'number' ? value : typeof value === 'string' && /^[A-Za-z][A-Za-z0-9_]{0,79}$/.test(value) ? value : undefined;

// Driver messages may contain hosts, URIs and credentials. Keep only technical
// identifiers and a fixed reason; never serialize the error or the driver event.
function failureDetails(error: unknown) {
    const err = object(error);
    const cause = object(err.cause);
    const name = token(err.name) ?? 'Error';
    const code = token(err.code);
    const causeName = token(cause.name);
    const causeCode = token(cause.code);
    const timeout = /timeout|timed out/i.test(String(err.message ?? '')) || /Timeout|PoolClearedOnNetworkError/.test(String(name)) || [code, causeCode].includes('ETIMEDOUT');
    const network = /Network/.test(String(name)) || ['ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN'].includes(String(causeCode ?? code));
    return { name, ...(code !== undefined ? { code } : {}), ...(causeName ? { causeName } : {}), ...(causeCode !== undefined ? { causeCode } : {}), reason: timeout ? 'timeout' : network ? 'network' : 'database_error' };
}

// No timers or database calls: repeated failures produce at most one reminder
// per minute. Changed failures and recovery always remain visible.
function diagnosticLog(message: string, details: Record<string, unknown> = {}, info = false) {
    const payload = { timestamp: new Date().toISOString(), ...details };
    if (info) console.info(message, payload);
    else logger.error(message, payload);
}
function failureGate() {
    let signature: string | undefined;
    let lastLoggedAt = 0;
    let suppressed = 0;
    return {
        failed(message: string, details: Record<string, unknown>) {
            const next = JSON.stringify(details);
            const now = Date.now();
            if (next === signature && now - lastLoggedAt < 60_000) { suppressed++; return; }
            diagnosticLog(message, { ...details, suppressedRepeats: suppressed });
            signature = next;
            lastLoggedAt = now;
            suppressed = 0;
        },
        recovered(message: string, details: Record<string, unknown> = {}) {
            if (signature !== undefined) diagnosticLog(message, { ...details, suppressedRepeats: suppressed }, true);
            signature = undefined;
            suppressed = 0;
        },
    };
}

/** Observe the existing connection only. The MongoDB driver owns reconnection. */
export function monitorMongoConnection(connection: Connection) {
    if (monitoredConnections.has(connection)) return;
    monitoredConnections.add(connection);
    let disconnected = false;
    const errors = failureGate();
    const disconnections = failureGate();
    connection.on('error', (error: unknown) => {
        const details = failureDetails(error);
        errors.failed('MongoDB connection error', details);
    });
    connection.on('disconnected', () => {
        disconnections.failed('MongoDB disconnected', { readyState: connection.readyState });
        disconnected = true;
    });
    const connected = () => {
        const client = connection.getClient();
        monitorClient(client);
        if (disconnected) disconnections.recovered('MongoDB connection recovered');
        errors.recovered('MongoDB connection error recovered');
        disconnected = false;
    };
    connection.on('connected', connected);
    if (connection.readyState === 1) connected();
}

function monitorClient(client: ReturnType<Connection['getClient']>) {
    if (monitoredClients.has(client)) return;
    monitoredClients.add(client);
    // Addresses are used only as internal keys. Logs identify members by a local
    // ordinal so events can be correlated without exposing deployment addresses.
    const members = new Map<string, { id: number; heartbeat: ReturnType<typeof failureGate>; pool: ReturnType<typeof failureGate> }>();
    const member = (address: string) => {
        let state = members.get(address);
        if (!state) { state = { id: members.size + 1, heartbeat: failureGate(), pool: failureGate() }; members.set(address, state); }
        return state;
    };
    const options = client.options;
    diagnosticLog('MongoDB connection settings', {
        serverSelectionTimeoutMS: options.serverSelectionTimeoutMS,
        connectTimeoutMS: options.connectTimeoutMS,
        socketTimeoutMS: options.socketTimeoutMS,
        heartbeatFrequencyMS: options.heartbeatFrequencyMS,
        maxPoolSize: options.maxPoolSize,
        minPoolSize: options.minPoolSize,
        maxIdleTimeMS: options.maxIdleTimeMS,
        waitQueueTimeoutMS: options.waitQueueTimeoutMS,
        retryReads: options.retryReads,
        retryWrites: options.retryWrites,
    }, true);
    client.on('serverHeartbeatFailed', event => {
        const state = member(event.connectionId);
        const details = failureDetails(event.failure);
        state.heartbeat.failed('MongoDB heartbeat failed', { member: state.id, ...details });
    });
    client.on('serverHeartbeatSucceeded', event => {
        const state = member(event.connectionId);
        state.heartbeat.recovered('MongoDB heartbeat recovered', { member: state.id });
    });
    client.on('connectionPoolCleared', event => {
        const state = member(event.address);
        state.pool.failed('MongoDB connection pool cleared', { member: state.id, interruptInUseConnections: event.interruptInUseConnections === true });
    });
    client.on('connectionPoolReady', event => {
        const state = member(event.address);
        state.pool.recovered('MongoDB connection pool ready', { member: state.id });
    });
}

/** Startup errors may contain duplicate index values, credentials and model data. */
export function reportStartupFailure(error: unknown) {
    const err = object(error);
    const configurationReasons: Record<string, string> = {
        INVALID_PRODUCTION_INVOCATION: 'invalid_production_invocation',
        INVALID_PRODUCTION_TARGET: 'invalid_production_target',
        EXPLICIT_PRODUCTION_DATABASE_REQUIRED: 'explicit_production_database_required',
        DEVELOPMENT_MONGO_ENV_REJECTED: 'development_mongo_env_rejected',
        MANAGED_MONGO_REQUIRED: 'managed_mongo_required',
    };
    const configurationReason = typeof err.message === 'string' && Object.prototype.hasOwnProperty.call(configurationReasons, err.message)
        ? configurationReasons[err.message] : undefined;
    const reason = configurationReason ?? (err.code === 11000 ? 'index_conflict'
        : err.name === 'MongoServerSelectionError' ? 'database_unavailable'
        : 'startup_failed');
    console.error('Server failed to start', { reason });
}
