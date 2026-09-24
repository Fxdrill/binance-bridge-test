import { diagnostic } from './errors.js';
import { requireShape, isObject } from './providers/common.js';
export const AUDIT_TOKEN = { chainId: '56', contractAddress: '0x55d398326f99059ff775485246999027b3197955' };
// Public burn address: tests read-only endpoint availability, not wallet quality.
export const AUDIT_ADDRESS = { chainId: '56', address: '0x000000000000000000000000000000000000dEaD', offset: 0 };
export function createAudit(providers, call, { now = Date.now } = {}) {
  let cached, running;
  async function run() {
    const results = {};
    const probe = async (name, operation) => {
      const started = now();
      try {
        const value = await operation();
        results[name] = { status: 'WORKING', httpStatus: value.httpStatus, durationMs: now() - started,
          fetchedAt: value.fetchedAt, ...(value.available !== undefined ? { resultAvailable: value.available } : {}),
          ...(Array.isArray(value.data) ? { recordCount: value.data.length } : {}) };
        return value;
      } catch (error) {
        const detail = diagnostic(error);
        results[name] = { status: detail.error === 'UPSTREAM_AUTH_REQUIRED' ? 'AUTH_REQUIRED' : 'NOT_WORKING',
          ...detail, durationMs: now() - started };
      }
    };
    const exchange = await probe('alphaExchangeInfo', () => providers.alpha.exchangeInfo());
    await probe('alphaTokens', () => providers.alpha.tokens());
    const symbol = exchange?.data.symbols.find(item => item.status === 'TRADING' && /^ALPHA_[0-9]+[A-Z0-9]+$/.test(item.symbol))?.symbol;
    if (symbol) {
      await probe('alphaTicker', () => providers.alpha.ticker({ symbol }));
      await probe('alphaKlines', () => providers.alpha.klines({ symbol, interval: '1h', limit: 2 }));
    } else {
      for (const key of ['alphaTicker', 'alphaKlines']) results[key] = { status: 'NOT_APPLICABLE', httpStatus: null, reason: 'NO_DISCOVERED_TRADING_PAIR' };
    }
    for (const [name, chainId] of [['Bsc','56'],['Solana','CT_501'],['Ethereum','1'],['Base','8453'],['Robinhood','4663']]) {
      await probe(`smartMoney${name}`, () => providers.smartMoney({ chainId, page: 1, pageSize: 5 }));
    }
    await probe('tokenInfo', () => providers.tokenInfo(AUDIT_TOKEN));
    await probe('tokenAudit', () => providers.tokenAudit(AUDIT_TOKEN));
    await probe('addressInfo', () => providers.addressPositions(AUDIT_ADDRESS));
    await probe('addressPnlRankHttp', async () => {
      const value = await call('addressPnlRank', { chainId: '56', period: '7d', tag: 'ALL', pageNo: 1, pageSize: 5 });
      requireShape(isObject(value.data) && Array.isArray(value.data.data), value);
      return value;
    });
    await probe('smartMoneyInflowHttp', async () => {
      const value = await call('smartMoneyInflow', { chainId: '56', period: '24h', tagType: 2 });
      requireShape(Array.isArray(value.data), value);
      return value;
    });
    for (const key of ['leaderboard', 'walletTrackerSmartMoney', 'walletTrackerKol', 'walletScoring', 'walletTrackerWebSocket']) {
      results[key] = { status: 'CLI_REQUIRED', httpStatus: null, reason: 'BAW_NOT_IN_BRIDGE_RUNTIME' };
    }
    for (const key of ['gemHunter', 'privateTracker', 'followList', 'savedPresets']) {
      results[key] = { status: 'AUTH_REQUIRED', httpStatus: null, reason: 'BAW_AGENT_SESSION_REQUIRED', cliRequired: true };
    }
    results.tradingAndSigning = { status: 'NOT_APPLICABLE', httpStatus: null, reason: 'READ_ONLY_BRIDGE' };
    return { service: 'alphabee-binance-evidence-bridge', executedAt: new Date(now()).toISOString(),
      executionEnvironment: process.env.RENDER === 'true' ? 'render' : 'local', results };
  }
  return async () => {
    if (cached && now() - cached.time < 300000) return structuredClone(cached.value);
    if (running) return structuredClone(await running);
    running = run();
    try { const value = await running; cached = { value, time: now() }; return structuredClone(value); }
    finally { running = null; }
  };
}
