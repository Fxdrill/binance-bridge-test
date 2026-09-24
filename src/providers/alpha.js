import { envelope, isObject, requireShape } from './common.js';
export function createAlpha(call) {
  return {
    async exchangeInfo() {
      const result = await call('alphaExchangeInfo');
      requireShape(isObject(result.data) && Array.isArray(result.data.symbols), result);
      return envelope(result, 'market', result.data);
    },
    async tokens() {
      const result = await call('alphaTokens');
      requireShape(Array.isArray(result.data) && result.data.every(isObject), result);
      return envelope(result, 'identity', result.data);
    },
    async ticker(params) {
      const result = await call('alphaTicker', params);
      requireShape(isObject(result.data) && typeof result.data.symbol === 'string', result);
      return envelope(result, 'market', result.data, params);
    },
    async klines(params) {
      const result = await call('alphaKlines', params);
      requireShape(Array.isArray(result.data) && result.data.every(row => Array.isArray(row) && row.length >= 11), result);
      const fields = ['openTime','open','high','low','close','volume','closeTime','quoteVolume','tradeCount','takerBuyBaseVolume','takerBuyQuoteVolume'];
      return envelope(result, 'market', result.data.map(row => Object.fromEntries(fields.map((key, i) => [key, row[i]]))), params);
    },
  };
}
