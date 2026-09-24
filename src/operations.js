// Official sources pinned in audit/BINANCE-CAPABILITY-MATRIX.md.
const web3 = 'https://web3.binance.com/bapi/defi';
const alpha = 'https://www.binance.com/bapi/defi/v1/public';
export const OPERATIONS = Object.freeze({
  alphaExchangeInfo: { url: `${alpha}/alpha-trade/get-exchange-info`, ttl: 300000 },
  alphaTokens: { url: `${alpha}/wallet-direct/buw/wallet/cex/alpha/all/token/list`, ttl: 300000 },
  alphaTicker: { url: `${alpha}/alpha-trade/ticker` },
  alphaKlines: { url: `${alpha}/alpha-trade/klines` },
  smartMoney: { url: `${web3}/v1/public/wallet-direct/buw/wallet/web/signal/smart-money/ai`, method: 'POST' },
  tokenMeta: { url: `${web3}/v1/public/wallet-direct/buw/wallet/dex/market/token/meta/info/ai` },
  tokenDynamic: { url: `${web3}/v4/public/wallet-direct/buw/wallet/market/token/dynamic/info/ai` },
  tokenAudit: { url: `${web3}/v1/public/wallet-direct/security/token/audit`, method: 'POST', headers: { 'User-Agent': 'binance-web3/1.4 (Skill)', source: 'agent' } },
  addressPositions: { url: `${web3}/v3/public/wallet-direct/buw/wallet/address/pnl/active-position-list/ai`, headers: { clienttype: 'web', clientversion: '1.2.0' } },
  // Audit-only discoveries; no production routes until validated on Render.
  addressPnlRank: { url: `${web3}/v1/public/wallet-direct/market/leaderboard/query/ai`, headers: { 'User-Agent': 'binance-web3/3.0 (Skill)' } },
  smartMoneyInflow: { url: `${web3}/v1/public/wallet-direct/tracker/wallet/token/inflow/rank/query/ai`, method: 'POST', headers: { 'User-Agent': 'binance-web3/3.0 (Skill)' } },
});
