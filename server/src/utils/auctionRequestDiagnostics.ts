// Never serialize errors, Axios config/request, or arbitrary response bodies: they
// can contain bidder details, authorization headers, database URIs and tokens.
const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' ? value as Record<string, unknown> : {};
const safeToken = (value: unknown) => typeof value === 'number' ? value : typeof value === 'string' && /^[A-Za-z][A-Za-z_]{0,79}$/.test(value) ? value : undefined;
function safeMessage(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    // Only known, data-free messages are emitted verbatim. Everything else is
    // explicitly marked as withheld, rather than risking names/secrets in prose.
    if (/^(Network Error|Failed to fetch|fetch failed|Load failed|Request aborted|Request failed with status code \d{3}|timeout of \d+ms exceeded|Transaction numbers are only allowed on a replica set member or mongos|Cannot pass an array to query updates unless the `updatePipeline` option is set\.)$/.test(value)) return value;
    if (/buffering timed out after \d+ms/.test(value)) return 'MongoDB operation buffering timed out';
    if (/Server selection timed out/i.test(value)) return 'MongoDB server selection timed out';
    return '[message withheld: may contain private data]';
}
export function requestDiagnostics(error: unknown, endpoint: string, method: string, responseStatus?: number) {
    const err = record(error), response = record(err.response), cause = record(err.cause);
    const status = typeof response.status === 'number' ? response.status : responseStatus;
    const code = safeToken(err.code), causeCode = safeToken(cause.code);
    const name = safeToken(err.name) ?? (error instanceof Error ? 'Error' : 'NonErrorThrown');
    const message = safeMessage(err.message ?? (typeof error === 'string' ? error : undefined));
    const timeout = /timeout|timed out/i.test(String(err.message ?? '')) || ['ECONNABORTED', 'ETIMEDOUT', 'TimeoutError'].includes(String(code ?? name));
    const network = ['ERR_NETWORK', 'ECONNREFUSED', 'ENOTFOUND', 'ECONNRESET', 'EAI_AGAIN'].includes(String(causeCode ?? code)) || /^(Network Error|Failed to fetch|fetch failed|Load failed)$/.test(String(err.message));
    const type = timeout ? 'timeout' : network ? 'network' : response.status ? `http_${status}` : String(name).startsWith('Mongo') || name === 'MongooseError' ? 'database' : responseStatus ? 'server_error' : 'client_error';
    const data = record(response.data);
    // File names and line numbers identify the throw site without exposing local
    // paths, request URLs or error text from the first stack line.
    const source = typeof err.stack === 'string' ? err.stack.split('\n').slice(1).map(line => line.match(/(?:\/|\\)([A-Za-z0-9_.-]+\.[cm]?[jt]s):([0-9]+):([0-9]+)\)?$/)?.slice(1).join(':')).filter(Boolean).slice(0, 4) : [];
    return {
        endpoint, method, ...(source.length ? { source } : {}), ...(status !== undefined ? { status } : {}), type, name,
        ...(code !== undefined ? { code } : {}), ...(causeCode !== undefined ? { causeCode } : {}),
        ...(message ? { message } : {}),
        ...(response.data !== undefined ? { responseMessage: safeMessage(data.message ?? data.error ?? response.data) ?? '[response data withheld: may contain private data]' } : {}),
    };
}
export function createFailureLogGate() {
    const previous = new Map<string, string>();
    return {
        failed(key: string, details: ReturnType<typeof requestDiagnostics>) {
            const signature = JSON.stringify(details);
            if (previous.get(key) === signature) return false;
            previous.set(key, signature);
            return true;
        },
        succeeded(key: string) { previous.delete(key); },
    };
}
