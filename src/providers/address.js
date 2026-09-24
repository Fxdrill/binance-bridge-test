import { envelope, isObject, requireShape } from './common.js';
export function createAddressPositions(call) {
  return async params => {
    const result = await call('addressPositions', params);
    requireShape(isObject(result.data) && (result.data.list === null || (Array.isArray(result.data.list) && result.data.list.every(isObject))), result);
    // Null holdings remain null; remainQty is already human-readable upstream.
    return envelope(result, 'holdings', result.data, params);
  };
}
