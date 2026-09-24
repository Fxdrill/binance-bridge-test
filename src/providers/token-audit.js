import { envelope, isObject, pick, requireShape } from './common.js';
export function createTokenAudit(call) {
  return async ({ chainId, contractAddress }) => {
    const result = await call('tokenAudit', { binanceChainId: chainId, contractAddress });
    requireShape(isObject(result.data) && typeof result.data.isSupported === 'boolean' && typeof result.data.hasResult === 'boolean', result);
    const available = result.data.isSupported === true && result.data.hasResult === true;
    const data = available ? result.data : pick(result.data, ['isSupported', 'hasResult']);
    return { ...envelope(result, 'security', data, { chainId, contractAddress }), available };
  };
}
