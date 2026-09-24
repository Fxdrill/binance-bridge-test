import { createAlpha } from './alpha.js';
import { createSmartMoney } from './smart-money.js';
import { createTokenInfo } from './token-info.js';
import { createTokenAudit } from './token-audit.js';
import { createAddressPositions } from './address.js';
export function createProviders(call) {
  return { alpha: createAlpha(call), smartMoney: createSmartMoney(call),
    tokenInfo: createTokenInfo(call), tokenAudit: createTokenAudit(call), addressPositions: createAddressPositions(call) };
}
