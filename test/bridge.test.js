import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from '../src/server.js';
import { createTransport } from '../src/transport.js';
import { createProviders } from '../src/providers/index.js';
import { createAudit, AUDIT_TOKEN } from '../src/audit.js';
import { BridgeError } from '../src/errors.js';
import { address } from '../src/validation.js';

const SECRET = 'test-only-secret-never-a-production-token';
const record = { chainId: '56', contractAddress: AUDIT_TOKEN.contractAddress, ticker: 'TEST', alertPrice: '0.000001',
  maxGain: '0.25', exitRate: 0, signalTriggerTime: 1700000000000, status: 'timeout' };
const fixtures = {
  alphaExchangeInfo: { symbols: [{ symbol: 'ALPHA_1USDT', status: 'TRADING', baseAsset: 'ALPHA_1', quoteAsset: 'USDT' }] },
  alphaTokens: [{ alphaId: 'ALPHA_1', symbol: 'TEST', chainId: '56', contractAddress: AUDIT_TOKEN.contractAddress }],
  alphaTicker: { symbol: 'ALPHA_1USDT', lastPrice: '0.0001' },
  alphaKlines: [[1700000000000,'1','2','0.5','1.5','40',1700003599999,'50',9,'20','25','0']],
  smartMoney: [record], tokenMeta: { name: 'Test', symbol: 'TEST' },
  tokenDynamic: { price: '0.00001', holders: '42', liquidity: '0', volume24h: '100', volume5mBuy: '10' },
  tokenAudit: { isSupported: true, hasResult: true, riskLevel: 1, extraInfo: { buyTax: '0', sellTax: null }, riskItems: [] },
  addressPositions: { list: [{ name: 'Test', remainQty: '0.005', price: '2', percentChange24h: '-4' }], offset: 0 },
  addressPnlRank: { data: [] }, smartMoneyInflow: [],
};
function fakeCall(overrides = {}, calls = []) {
  return async (name, params) => {
    calls.push({ name, params });
    if (overrides[name] instanceof Error) throw overrides[name];
    return { operation: name, httpStatus: 200, fetchedAt: '2026-09-24T00:00:00.000Z',
      data: structuredClone(Object.hasOwn(overrides, name) ? overrides[name] : fixtures[name]) };
  };
}
async function serve(t, options = {}) {
  const server = createServer({ token: SECRET, call: fakeCall(), ...options });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  return async (path, { auth = SECRET, ...init } = {}) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
      ...init, headers: { ...(auth === null ? {} : { Authorization: `Bearer ${auth}` }), ...init.headers },
    });
    return { status: response.status, body: await response.json(), headers: response.headers };
  };
}
const jsonResponse = (data, extra = {}) => new Response(JSON.stringify({ code: '000000', success: true, data, ...extra }), { status: 200 });

test('health is public and missing configuration fails closed', async t => {
  const get = await serve(t, { token: '' });
  assert.equal((await get('/health', { auth: null })).status, 200);
  assert.equal((await get('/v1/binance/alpha/tokens')).status, 503);
  assert.equal((await get('/audit/binance')).status, 503);
});
test('missing and invalid bearer tokens never call upstream', async t => {
  const calls = []; const get = await serve(t, { call: fakeCall({}, calls) });
  for (const auth of [null, '', 'wrong', `${SECRET}extra`]) {
    assert.equal((await get('/v1/binance/alpha/tokens', { auth })).status, 401);
    assert.equal((await get('/audit/binance', { auth })).status, 401);
  }
  assert.equal(calls.length, 0);
});
test('all production routes accept valid parameters and require bearer auth', async t => {
  const get = await serve(t);
  const paths = ['/alpha/exchange-info','/alpha/tokens','/alpha/ticker?symbol=ALPHA_1USDT',
    '/alpha/klines?symbol=ALPHA_1USDT&interval=1h&limit=2','/smart-money?chainId=56',
    `/token-info?chainId=56&contractAddress=${AUDIT_TOKEN.contractAddress}`,
    `/token-audit?chainId=56&contractAddress=${AUDIT_TOKEN.contractAddress}`,
    '/address/positions?chainId=56&address=0x000000000000000000000000000000000000dEaD&offset=0'];
  for (const path of paths) {
    assert.equal((await get(`/v1/binance${path}`)).status, 200, path);
    assert.equal((await get(`/v1/binance${path}`, { auth: null })).status, 401, path);
  }
});
test('reject arbitrary URLs, unknown parameters, duplicates, unknown routes and mutations', async t => {
  const calls = []; const get = await serve(t, { call: fakeCall({}, calls) });
  for (const path of ['/v1/binance/alpha/tokens?url=https://evil.test', '/v1/binance/alpha/tokens?upstream=http://127.0.0.1',
    '/v1/binance/smart-money?chainId=56&chainId=1', '/v1/binance/alpha/tokens?token=abc']) assert.equal((await get(path)).status, 400);
  assert.equal((await get('/v1/proxy?url=https://evil.test')).status, 404);
  assert.equal((await get('/v1/binance/alpha/tokens', { method: 'POST' })).status, 405);
  assert.equal(calls.length, 0);
});
test('valid backend-authoritative smart-money chains are forwarded', async t => {
  const calls = []; const get = await serve(t, { call: fakeCall({}, calls) });
  for (const chainId of ['56','CT_501','1','8453','4663','42161','CT_999']) assert.equal((await get(`/v1/binance/smart-money?chainId=${chainId}`)).status, 200);
  assert.deepEqual(calls.map(c => c.params.chainId), ['56','CT_501','1','8453','4663','42161','CT_999']);
});
test('invalid chains, addresses and unbounded parameters are rejected before fetch', async t => {
  const calls = []; const get = await serve(t, { call: fakeCall({}, calls) });
  for (const path of ['/smart-money?chainId=abc', '/smart-money?chainId=-1', '/smart-money?chainId=56&pageSize=101',
    '/smart-money?chainId=56&page=1e9','/smart-money?chainId=56&page=0',
    '/token-info?chainId=56&contractAddress=bad', '/token-info?chainId=CT_501&contractAddress=0x123',
    `/token-audit?chainId=4663&contractAddress=${AUDIT_TOKEN.contractAddress}`,
    '/address/positions?chainId=56&address=0x0000000000000000000000000000000000000000',
    '/address/positions?chainId=CT_501&address=00000000000000000000000000000000',
    '/address/positions?chainId=137&address=bad', '/alpha/ticker?symbol=https://evil.test',
    '/alpha/klines?symbol=ALPHA_1USDT&interval=bogus', '/alpha/klines?symbol=ALPHA_1USDT&interval=1h&startTime=2&endTime=1']) {
    assert.equal((await get(`/v1/binance${path}`)).status, 400, path);
  }
  assert.equal(calls.length, 0);
  assert.equal(address('So11111111111111111111111111111111111111112','CT_501'), 'So11111111111111111111111111111111111111112');
  assert.throws(() => address('z'.repeat(44),'CT_501'));
});
test('smart-money normalization preserves missing fields, zeros, stale status and units', async () => {
  const result = await createProviders(fakeCall()).smartMoney({ chainId: '56' });
  assert.deepEqual(result.data, [record]);
  assert.equal(result.evidenceType, 'directional');
  assert.equal(Object.hasOwn(result.data[0], 'direction'), false);
  assert.equal(Object.hasOwn(result.data[0], 'profitable'), false);
});
test('market snapshots remain separate and never infer accumulation', async () => {
  const result = await createProviders(fakeCall()).tokenInfo(AUDIT_TOKEN);
  assert.equal(result.data.market.data.liquidity, '0');
  assert.equal(result.data.metadata.data.name, 'Test');
  assert.equal(JSON.stringify(result).includes('accumulation'), false);
});
test('audit availability gates every risk field, including taxes', async () => {
  for (const [isSupported, hasResult] of [[false,true],[true,false],[false,false]]) {
    const result = await createProviders(fakeCall({ tokenAudit: { ...fixtures.tokenAudit, isSupported, hasResult } })).tokenAudit(AUDIT_TOKEN);
    assert.equal(result.available, false);
    assert.deepEqual(result.data, { isSupported, hasResult });
  }
  const result = await createProviders(fakeCall()).tokenAudit(AUDIT_TOKEN);
  assert.equal(result.evidenceType, 'security');
  assert.equal(result.data.extraInfo.buyTax, '0');
  assert.equal(result.data.extraInfo.sellTax, null);
});
test('Alpha identity and candles normalize without numeric precision loss', async () => {
  const alpha = createProviders(fakeCall()).alpha;
  assert.deepEqual((await alpha.tokens()).data, fixtures.alphaTokens);
  assert.equal((await alpha.exchangeInfo()).data.symbols[0].baseAsset, 'ALPHA_1');
  const result = await alpha.klines({ symbol: 'ALPHA_1USDT', interval: '1h' });
  assert.equal(result.data[0].open, '1');
  assert.equal(result.data[0].tradeCount, 9);
  assert.equal(result.data[0].openTime, 1700000000000);
});
test('empty holdings remain null and malformed successful payloads fail', async () => {
  assert.equal((await createProviders(fakeCall({ addressPositions: { list: null, offset: 0 } })).addressPositions({})).data.list, null);
  await assert.rejects(createProviders(fakeCall({ smartMoney: {} })).smartMoney({}), { code: 'UPSTREAM_SCHEMA_ERROR' });
  await assert.rejects(createProviders(fakeCall({ tokenAudit: {} })).tokenAudit(AUDIT_TOKEN), { code: 'UPSTREAM_SCHEMA_ERROR' });
});
test('transport uses fixed current endpoints, exact headers and UUID audit body', async () => {
  const requests = [];
  const call = createTransport({ fetchImpl: async (url, options) => { requests.push({ url: String(url), ...options }); return jsonResponse([]); } });
  await call('smartMoney', { chainId: '8453', page: 1, pageSize: 5 });
  await call('addressPositions', { chainId: '1', address: AUDIT_TOKEN.contractAddress, offset: 0 });
  await call('tokenAudit', { binanceChainId: '56', contractAddress: AUDIT_TOKEN.contractAddress });
  assert.equal(requests[0].url, 'https://web3.binance.com/bapi/defi/v1/public/wallet-direct/buw/wallet/web/signal/smart-money/ai');
  assert.equal(requests[0].method, 'POST');
  assert.equal(requests[0].headers['Accept-Encoding'], 'identity');
  assert.equal(requests[0].headers['User-Agent'], 'binance-web3/2.0 (Skill)');
  assert.equal(requests[0].redirect, 'manual');
  assert.equal(requests[1].headers.clientversion, '1.2.0');
  assert.equal(requests[2].headers.source, 'agent');
  assert.match(JSON.parse(requests[2].body).requestId, /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/);
  assert.equal(Object.hasOwn(requests[0].headers, 'Authorization'), false);
  await assert.rejects(call('https://evil.test'), { code: 'OPERATION_NOT_ALLOWED' });
});
test('non-2xx, redirect, business errors, invalid JSON and HTML 200 are sanitized', async () => {
  for (const status of [301,401,403,429,500]) {
    const call = createTransport({ fetchImpl: async () => new Response(SECRET, { status, headers: { Location: 'https://evil.test' } }) });
    await assert.rejects(call('alphaTokens'), error => error.httpStatus === status && !error.message.includes(SECRET));
  }
  for (const payload of [{ code: '100004', data: [], message: SECRET }, { success: false, data: [] }, { data: [] }, { code: '000000' }]) {
    const call = createTransport({ fetchImpl: async () => new Response(JSON.stringify(payload)) });
    await assert.rejects(call('alphaTokens'), error => error instanceof BridgeError && !error.message.includes(SECRET));
  }
  await assert.rejects(createTransport({ fetchImpl: async () => new Response('<html>denied</html>') })('alphaTokens'), { code: 'UPSTREAM_INVALID_JSON' });
});
test('timeout covers initial fetch and streaming response body', async () => {
  const call = createTransport({ timeoutMs: 15, fetchImpl: async () => new Promise(() => {}) });
  await assert.rejects(call('alphaTokens'), { code: 'UPSTREAM_TIMEOUT', status: 504 });
  const bodyCall = createTransport({ timeoutMs: 15, fetchImpl: async (_url, { signal }) => new Response(new ReadableStream({
    start(controller) { signal.addEventListener('abort', () => controller.error(new Error('aborted'))); },
  })) });
  await assert.rejects(bodyCall('alphaTokens'), { code: 'UPSTREAM_TIMEOUT', status: 504 });
});
test('both declared and streamed response sizes are bounded', async () => {
  for (const headers of [{}, { 'content-length': '1000' }]) {
    const call = createTransport({ maxBytes: 20, fetchImpl: async () => new Response('x'.repeat(100), { headers }) });
    await assert.rejects(call('alphaTokens'), { code: 'UPSTREAM_TOO_LARGE' });
  }
});
test('cache deduplicates requests, expires, and global budget limits distinct fetches', async () => {
  let count = 0, now = 0;
  const call = createTransport({ now: () => now, maxRequests: 2, fetchImpl: async () => { count++; return jsonResponse([]); } });
  await Promise.all([call('smartMoney', { chainId: '56' }), call('smartMoney', { chainId: '56' })]);
  assert.equal(count, 1);
  now = 31000;
  await call('smartMoney', { chainId: '56' });
  assert.equal(count, 2);
  await assert.rejects(call('smartMoney', { chainId: '1' }), { code: 'RATE_LIMITED' });
  now = 61000;
  await call('smartMoney', { chainId: '1' });
  assert.equal(count, 3);
});
test('audit classifies actual outcomes, skips missing pairs and caches summaries', async () => {
  const calls = [];
  const call = fakeCall({ alphaExchangeInfo: new BridgeError('UPSTREAM_HTTP_ERROR', 502, 451),
    tokenAudit: { isSupported: false, hasResult: false }, addressPnlRank: new BridgeError('UPSTREAM_AUTH_REQUIRED', 502, 401) }, calls);
  const audit = createAudit(createProviders(call), call);
  const report = await audit();
  assert.equal(report.results.alphaExchangeInfo.status, 'NOT_WORKING');
  assert.equal(report.results.alphaTicker.status, 'NOT_APPLICABLE');
  assert.equal(report.results.smartMoneyBase.status, 'WORKING');
  assert.equal(report.results.tokenAudit.resultAvailable, false);
  assert.equal(report.results.addressPnlRankHttp.status, 'AUTH_REQUIRED');
  assert.equal(report.results.leaderboard.status, 'CLI_REQUIRED');
  assert.equal(report.results.gemHunter.status, 'AUTH_REQUIRED');
  assert.equal(JSON.stringify(report).includes(AUDIT_TOKEN.contractAddress), false);
  const count = calls.length; await audit(); assert.equal(calls.length, count);
});
test('errors and unexpected upstream credential fields cannot leak secrets', async t => {
  const get = await serve(t, { call: fakeCall({ alphaTokens: [{ symbol: 'TEST', apiKey: SECRET, nested: { agentSessionId: SECRET }, note: SECRET }] }) });
  assert.equal(JSON.stringify(await get('/v1/binance/alpha/tokens')).includes(SECRET), false);
  const failing = await serve(t, { call: async () => { throw new Error(`network ${SECRET}`); } });
  const result = await failing('/v1/binance/alpha/tokens');
  assert.equal(result.status, 500);
  assert.deepEqual(result.body, { error: 'INTERNAL_ERROR', httpStatus: null });
});
test('legacy diagnostic remains public and summary-only; timeout maps to 504', async t => {
  const get = await serve(t);
  const result = await get('/test/binance', { auth: null });
  assert.equal(result.status, 200);
  assert.equal(result.body.results.length, 3);
  assert.equal(Object.hasOwn(result.body.results[0], 'data'), false);
  const timeout = await serve(t, { call: async () => { throw new BridgeError('UPSTREAM_TIMEOUT', 504); } });
  assert.equal((await timeout('/v1/binance/alpha/tokens')).status, 504);
});
