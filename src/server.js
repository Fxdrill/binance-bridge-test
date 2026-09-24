import http from 'node:http';
import { createHash, timingSafeEqual } from 'node:crypto';
import { BridgeError, diagnostic } from './errors.js';
import { createTransport } from './transport.js';
import { createProviders } from './providers/index.js';
import { createAudit } from './audit.js';
import { parameters, chain, address, integer, symbol, tokenParams, klinesParams } from './validation.js';

function authorize(req, token) {
  if (!token) throw new BridgeError('BRIDGE_NOT_CONFIGURED', 503);
  const header = req.headers.authorization;
  const digest = text => createHash('sha256').update(text).digest();
  if (typeof header !== 'string' || !header.startsWith('Bearer ') ||
      !timingSafeEqual(digest(header.slice(7)), digest(token))) throw new BridgeError('UNAUTHORIZED', 401);
}

export function createServer({ token = process.env.BRIDGE_API_TOKEN, call = createTransport() } = {}) {
  const providers = createProviders(call);
  const audit = createAudit(providers, call);
  let legacyCache, legacyRunning;
  const routes = new Map([
    ['/v1/binance/alpha/exchange-info', [[], () => providers.alpha.exchangeInfo()]],
    ['/v1/binance/alpha/tokens', [[], () => providers.alpha.tokens()]],
    ['/v1/binance/alpha/ticker', [['symbol'], p => providers.alpha.ticker({ symbol: symbol(p.symbol) })]],
    ['/v1/binance/alpha/klines', [['symbol','interval','limit','startTime','endTime'], p => providers.alpha.klines(klinesParams(p))]],
    ['/v1/binance/smart-money', [['chainId','page','pageSize'], p => providers.smartMoney({ chainId: chain(p.chainId), page: integer(p.page, 1, 1, 1000), pageSize: integer(p.pageSize, 20, 1, 100) })]],
    ['/v1/binance/token-info', [['chainId','contractAddress'], p => providers.tokenInfo(tokenParams(p))]],
    ['/v1/binance/token-audit', [['chainId','contractAddress'], p => providers.tokenAudit(tokenParams(p, true))]],
    ['/v1/binance/address/positions', [['chainId','address','offset'], p => {
      const chainId = chain(p.chainId, true);
      return providers.addressPositions({ chainId, address: address(p.address, chainId, true), offset: integer(p.offset, 0, 0, 100000) });
    }]],
  ]);
  async function legacy() {
    if (legacyCache && Date.now() - legacyCache.time < 300000) return legacyCache.value;
    if (legacyRunning) return legacyRunning;
    legacyRunning = (async () => {
      const results = [];
      for (const [name, operation] of [
        ['Binance Alpha exchange-info', () => providers.alpha.exchangeInfo()],
        ['Binance Smart Money BSC', () => providers.smartMoney({ chainId: '56', page: 1, pageSize: 100 })],
        ['Binance Smart Money Solana', () => providers.smartMoney({ chainId: 'CT_501', page: 1, pageSize: 100 })],
      ]) {
        const start = Date.now();
        try { const value = await operation(); results.push({ name, status: value.httpStatus, ok: true, durationMs: Date.now() - start }); }
        catch (error) { const detail = diagnostic(error); results.push({ name, status: detail.httpStatus, ok: false, durationMs: Date.now() - start, error: detail.error }); }
      }
      return { environment: 'binance-bridge-test', timestamp: new Date().toISOString(), results };
    })();
    try { const value = await legacyRunning; legacyCache = { value, time: Date.now() }; return value; }
    finally { legacyRunning = null; }
  }
  const server = http.createServer({ maxHeaderSize: 8192 }, async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const send = (status, body) => {
      // Defense in depth: never reflect the configured secret, even from upstream.
      let output = JSON.stringify(body);
      if (token) output = output.split(JSON.stringify(token).slice(1, -1)).join('[REDACTED]');
      res.writeHead(status); res.end(output);
    };
    try {
      if (!req.url?.startsWith('/') || req.url.startsWith('//') || req.url.length > 2048) throw new BridgeError('INVALID_REQUEST', 400);
      const url = new URL(req.url, 'http://bridge.local');
      if (url.pathname.startsWith('/v1/') || url.pathname === '/audit/binance') authorize(req, token);
      if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); throw new BridgeError('METHOD_NOT_ALLOWED', 405); }
      if (req.headers['transfer-encoding'] || Number(req.headers['content-length'] || 0) !== 0) throw new BridgeError('REQUEST_BODY_NOT_ALLOWED', 400);
      if (url.pathname === '/health') { parameters(url.searchParams, []); return send(200, { status: 'ok', service: 'alphabee-binance-evidence-bridge', configured: Boolean(token) }); }
      if (url.pathname === '/test/binance') { parameters(url.searchParams, []); return send(200, await legacy()); }
      if (url.pathname === '/audit/binance') { parameters(url.searchParams, []); return send(200, await audit()); }
      const route = routes.get(url.pathname);
      if (!route) throw new BridgeError('NOT_FOUND', 404);
      return send(200, await route[1](parameters(url.searchParams, route[0])));
    } catch (error) {
      if (error instanceof BridgeError && error.status === 401) res.setHeader('WWW-Authenticate', 'Bearer');
      if (error instanceof BridgeError && error.status === 429) res.setHeader('Retry-After', '60');
      send(error instanceof BridgeError ? error.status : 500, diagnostic(error));
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.keepAliveTimeout = 5000;
  server.timeout = 240000; // Sequential capability audit remains bounded.
  return server;
}
