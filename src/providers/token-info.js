import { envelope, isObject, requireShape } from './common.js';
export function createTokenInfo(call) {
  return async params => {
    const meta = await call('tokenMeta', params);
    requireShape(isObject(meta.data) && Object.keys(meta.data).length > 0, meta);
    const dynamic = await call('tokenDynamic', params);
    requireShape(isObject(dynamic.data) && Object.keys(dynamic.data).length > 0, dynamic);
    // Keep the two source snapshots distinct; do not overwrite conflicting fields.
    return { source: 'binance', operation: 'tokenInfo', evidenceType: 'market', query: params,
      fetchedAt: dynamic.fetchedAt, httpStatus: dynamic.httpStatus,
      data: { metadata: envelope(meta, 'identity', meta.data, params),
        market: envelope(dynamic, 'market', dynamic.data, params) } };
  };
}
