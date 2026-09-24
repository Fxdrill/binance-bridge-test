import { BridgeError } from '../errors.js';
export const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export function requireShape(condition, result) {
  if (!condition) throw new BridgeError('UPSTREAM_SCHEMA_ERROR', 502, result.httpStatus);
}
// Preserve upstream evidence without forwarding unexpected credential fields.
export function clean(value, depth = 0) {
  if (depth > 24) throw new BridgeError('UPSTREAM_SCHEMA_ERROR');
  if (Array.isArray(value)) return value.map(item => clean(item, depth + 1));
  if (!isObject(value)) return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !/^(?:authorization|cookie|set-cookie|api[_-]?key|access[_-]?token|refresh[_-]?token|bridge[_-]?api[_-]?token|agentSessionId|private[_-]?key|seed[_-]?phrase|mnemonic|secret|password|__proto__|constructor|prototype)$/i.test(key))
    .map(([key, item]) => [key, clean(item, depth + 1)]));
}
export function pick(value, fields) {
  return Object.fromEntries(fields.filter(key => Object.hasOwn(value, key)).map(key => [key, clean(value[key])]));
}
export function envelope(result, evidenceType, data, query = {}) {
  return { source: 'binance', operation: result.operation, evidenceType,
    fetchedAt: result.fetchedAt, httpStatus: result.httpStatus, query, data: clean(data) };
}
