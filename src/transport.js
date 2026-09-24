import { randomUUID } from 'node:crypto';
import { BridgeError } from './errors.js';
import { OPERATIONS } from './operations.js';
const HEADERS = { Accept: 'application/json', 'Accept-Encoding': 'identity',
  'User-Agent': 'binance-web3/2.0 (Skill)', 'Content-Type': 'application/json' };

export function createTransport({ fetchImpl = fetch, timeoutMs = 10000,
  maxBytes = 8 * 1024 * 1024, now = Date.now, maxRequests = 60 } = {}) {
  const cache = new Map();
  const pending = new Map();
  let active = 0, windowStart = now(), requests = 0, cacheBytes = 0;
  async function execute(name, params) {
    const operation = OPERATIONS[name];
    if (active >= 4) throw new BridgeError('BRIDGE_BUSY', 503);
    if (now() - windowStart >= 60000) { windowStart = now(); requests = 0; }
    if (requests >= maxRequests) throw new BridgeError('RATE_LIMITED', 429);
    requests++; active++;
    const controller = new AbortController();
    let timer, httpStatus = null;
    const task = async () => {
      const url = new URL(operation.url);
      const method = operation.method || 'GET';
      const body = name === 'tokenAudit' ? { ...params, requestId: randomUUID() } : params;
      if (method === 'GET') for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
      const response = await fetchImpl(url, { method, headers: { ...HEADERS, ...operation.headers },
        ...(method === 'POST' ? { body: JSON.stringify(body) } : {}), redirect: 'manual', signal: controller.signal });
      httpStatus = response.status;
      if (!response.ok) {
        void response.body?.cancel().catch(() => {});
        throw new BridgeError(response.status === 401 ? 'UPSTREAM_AUTH_REQUIRED' : 'UPSTREAM_HTTP_ERROR', 502, httpStatus);
      }
      if (Number(response.headers.get('content-length')) > maxBytes) {
        void response.body?.cancel().catch(() => {});
        throw new BridgeError('UPSTREAM_TOO_LARGE', 502, httpStatus);
      }
      if (!response.body) throw new BridgeError('UPSTREAM_INVALID_JSON', 502, httpStatus);
      const reader = response.body.getReader();
      const chunks = [];
      let size = 0;
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > maxBytes) throw new BridgeError('UPSTREAM_TOO_LARGE', 502, httpStatus);
          chunks.push(value);
        }
      } finally { void reader.cancel().catch(() => {}); }
      let payload;
      try { payload = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
      catch { throw new BridgeError('UPSTREAM_INVALID_JSON', 502, httpStatus); }
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new BridgeError('UPSTREAM_INVALID_ENVELOPE', 502, httpStatus);
      if (payload.success === false || (payload.code !== undefined && String(payload.code) !== '000000')) throw new BridgeError('UPSTREAM_BUSINESS_ERROR', 502, httpStatus);
      if (!Object.hasOwn(payload, 'data') || (payload.code !== '000000' && payload.success !== true)) throw new BridgeError('UPSTREAM_INVALID_ENVELOPE', 502, httpStatus);
      return { data: payload.data, httpStatus, fetchedAt: new Date(now()).toISOString(), operation: name };
    };
    try {
      return await Promise.race([task(), new Promise((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new BridgeError('UPSTREAM_TIMEOUT', 504, httpStatus)); }, timeoutMs);
      })]);
    } catch (error) {
      if (error instanceof BridgeError) throw error;
      throw new BridgeError(controller.signal.aborted ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_NETWORK_ERROR', controller.signal.aborted ? 504 : 502, httpStatus);
    } finally { clearTimeout(timer); active--; }
  }
  return async (name, params = {}) => {
    if (!Object.hasOwn(OPERATIONS, name)) throw new BridgeError('OPERATION_NOT_ALLOWED', 400);
    const key = JSON.stringify([name, params]);
    const existing = cache.get(key);
    if (existing && existing.expires > now()) return structuredClone(existing.value);
    if (pending.has(key)) return structuredClone(await pending.get(key));
    const work = execute(name, params);
    pending.set(key, work);
    try {
      const value = await work;
      const size = Buffer.byteLength(JSON.stringify(value));
      if (cache.has(key)) { cacheBytes -= cache.get(key).size; cache.delete(key); }
      while (cache.size && (cache.size >= 32 || cacheBytes + size > 16 * 1024 * 1024)) {
        const oldest = cache.keys().next().value;
        cacheBytes -= cache.get(oldest).size; cache.delete(oldest);
      }
      cache.set(key, { value, size, expires: now() + (OPERATIONS[name].ttl ?? 30000) });
      cacheBytes += size;
      return structuredClone(value);
    } finally { pending.delete(key); }
  };
}
