import { envelope, isObject, requireShape } from './common.js';
export function createSmartMoney(call) {
  return async params => {
    const result = await call('smartMoney', params);
    requireShape(Array.isArray(result.data) && result.data.every(isObject), result);
    // Native field names/units, including maxGain as a fraction and stale status.
    // No synthetic buy/sell direction, profitability, or missing wallet identities.
    return envelope(result, 'directional', result.data, params);
  };
}
