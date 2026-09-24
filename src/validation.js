import { BridgeError } from './errors.js';
const fail = () => { throw new BridgeError('INVALID_PARAMETERS', 400); };
export const CHAINS = ['1', '56', '8453', 'CT_501'];
export function chain(value, restricted = false) {
  if (typeof value !== 'string' || !/^(?:[1-9][0-9]{0,11}|CT_[1-9][0-9]{0,9})$/.test(value)) fail();
  if (restricted && !CHAINS.includes(value)) fail();
  return value;
}
export function address(value, chainId, wallet = false) {
  if (typeof value !== 'string' || value.length > 128) fail();
  if (chainId === 'CT_501') {
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)) fail();
    const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let number = 0n;
    for (const character of value) number = number * 58n + BigInt(alphabet.indexOf(character));
    let bytes = 0;
    while (number > 0n) { bytes++; number >>= 8n; }
    if (bytes + value.match(/^1*/)[0].length !== 32) fail();
  } else if (/^[0-9]+$/.test(chainId)) {
    if (!/^0x[0-9a-fA-F]{40}$/.test(value)) fail();
    if (wallet && /^0x0{40}$/i.test(value)) fail();
  } else if (!/^[A-Za-z0-9]{20,128}$/.test(value)) fail();
  return value;
}
export function integer(value, fallback, min, max) {
  if (value === undefined) return fallback;
  if (!/^[0-9]{1,16}$/.test(value)) fail();
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < min || result > max) fail();
  return result;
}
export function symbol(value) {
  if (typeof value !== 'string' || !/^ALPHA_[0-9]{1,12}[A-Z0-9]{2,16}$/.test(value)) fail();
  return value;
}
export function parameters(searchParams, allowed) {
  const result = {};
  for (const [key, value] of searchParams) {
    if (!allowed.includes(key) || Object.hasOwn(result, key) || value.length > 128) fail();
    result[key] = value;
  }
  return result;
}
export function tokenParams(p, restricted = false) {
  const chainId = chain(p.chainId, restricted);
  return { chainId, contractAddress: address(p.contractAddress, chainId) };
}
export function klinesParams(p) {
  if (!['1s','15s','1m','3m','5m','15m','30m','1h','2h','4h','6h','8h','12h','1d','3d','1w','1M'].includes(p.interval)) fail();
  const result = { symbol: symbol(p.symbol), interval: p.interval, limit: integer(p.limit, 100, 1, 500) };
  for (const key of ['startTime', 'endTime']) if (p[key] !== undefined) result[key] = integer(p[key], undefined, 0, 8640000000000000);
  if (result.startTime !== undefined && result.endTime !== undefined && result.startTime > result.endTime) fail();
  return result;
}
