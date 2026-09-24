# Validation Record

Audit Date: 2026-09-24  
Scope: AlphaBee Binance Evidence Bridge (`binance-bridge-test`)  
Execution Environment: Local Node.js v22.16.0 on Windows

---

## 1. Automated Test Suite

- **Command**: `npm test` (`node --test test/*.test.js`)
- **Status**: PASS (19 passed, 0 failed, 0 skipped, duration: ~1.8s)
- **Coverage**:
  1. `health is public and missing configuration fails closed` (PASS)
  2. `missing and invalid bearer tokens never call upstream` (PASS)
  3. `all production routes accept valid parameters and require bearer auth` (PASS)
  4. `reject arbitrary URLs, unknown parameters, duplicates, unknown routes and mutations` (PASS)
  5. `valid backend-authoritative smart-money chains are forwarded` (PASS)
  6. `invalid chains, addresses and unbounded parameters are rejected before fetch` (PASS)
  7. `smart-money normalization preserves missing fields, zeros, stale status and units` (PASS)
  8. `market snapshots remain separate and never infer accumulation` (PASS)
  9. `audit availability gates every risk field, including taxes` (PASS)
  10. `Alpha identity and candles normalize without numeric precision loss` (PASS)
  11. `empty holdings remain null and malformed successful payloads fail` (PASS)
  12. `transport uses fixed current endpoints, exact headers and UUID audit body` (PASS)
  13. `non-2xx, redirect, business errors, invalid JSON and HTML 200 are sanitized` (PASS)
  14. `timeout covers initial fetch and streaming response body` (PASS)
  15. `both declared and streamed response sizes are bounded` (PASS)
  16. `cache deduplicates requests, expires, and global budget limits distinct fetches` (PASS)
  17. `audit classifies actual outcomes, skips missing pairs and caches summaries` (PASS)
  18. `errors and unexpected upstream credential fields cannot leak secrets` (PASS)
  19. `legacy diagnostic remains public and summary-only; timeout maps to 504` (PASS)

---

## 2. Live Local Binance Capability Audit

- **Command**: `npm run audit:binance` (`node scripts/audit-binance.js`)
- **Output Record**: `audit/local-results.json`
- **Exit Code**: 0 (0 failed probes)
- **Live Probes**:

| Operation | Target / Input | HTTP Status | Duration | Result Details | Status |
|---|---|---|---|---|---|
| `alphaExchangeInfo` | REST exchange info | 200 | 4113ms | Symbol trading pairs retrieved | WORKING |
| `alphaTokens` | REST token universe | 200 | 2120ms | 678 tokens discovered | WORKING |
| `alphaTicker` | Discovered Alpha symbol | 200 | 528ms | 24h ticker data returned | WORKING |
| `alphaKlines` | Discovered Alpha symbol, 1h, limit 2 | 200 | 489ms | 2 OHLCV bars returned | WORKING |
| `smartMoneyBsc` | Chain 56, page 1, size 5 | 200 | 2698ms | 5 signal records returned | WORKING |
| `smartMoneySolana` | Chain CT_501, page 1, size 5 | 200 | 1820ms | 5 signal records returned | WORKING |
| `smartMoneyEthereum` | Chain 1, page 1, size 5 | 200 | 899ms | 5 signal records returned | WORKING |
| `smartMoneyBase` | Chain 8453, page 1, size 5 | 200 | 438ms | 5 signal records returned | WORKING |
| `smartMoneyRobinhood` | Chain 4663, page 1, size 5 | 200 | 474ms | 5 signal records returned | WORKING |
| `tokenInfo` | Chain 56, USDT (0x55d3...) | 200 | 1222ms | Metadata + Dynamic market data | WORKING |
| `tokenAudit` | Chain 56, USDT (0x55d3...) | 200 | 519ms | `resultAvailable: true` | WORKING |
| `addressInfo` | Chain 56, burn address | 200 | 4033ms | Public holdings inspection | WORKING |
| `addressPnlRankHttp` | Chain 56, 7d, ALL, page 1, size 5 | 200 | 707ms | Leaderboard ranking data | WORKING |
| `smartMoneyInflowHttp`| Chain 56, 24h, tagType 2 | 200 | 976ms | 64 inflow records | WORKING |

---

## 3. Live Server Route & Security Checks

- **Server Instance**: Ephemeral port with `BRIDGE_API_TOKEN` configured
- **Public Routes**:
  - `GET /health` → HTTP 200 `{"status":"ok","service":"alphabee-binance-evidence-bridge","configured":true}`
- **Security Rejections**:
  - `GET /v1/*` without Authorization → HTTP 401 `{"error":"UNAUTHORIZED","httpStatus":null}`
  - `GET /v1/*` with invalid Bearer token → HTTP 401 `{"error":"UNAUTHORIZED","httpStatus":null}`
  - `POST /v1/*` → HTTP 405 `{"error":"METHOD_NOT_ALLOWED","httpStatus":null}`
  - `GET /v1/binance/smart-money?chainId=bad&url=http://evil.com` → HTTP 400 `{"error":"INVALID_PARAMETERS","httpStatus":null}`
- **Protected Live Routes (Verified HTTP 200 with Bearer Token)**:
  - `GET /v1/binance/alpha/exchange-info` → 200 OK
  - `GET /v1/binance/alpha/tokens` → 200 OK
  - `GET /v1/binance/smart-money?chainId=56` → 200 OK
  - `GET /v1/binance/smart-money?chainId=CT_501` → 200 OK
  - `GET /v1/binance/token-info?chainId=56&contractAddress=0x55d3...` → 200 OK
  - `GET /v1/binance/token-audit?chainId=56&contractAddress=0x55d3...` → 200 OK
  - `GET /v1/binance/address/positions?chainId=56&address=0x000...dEaD&offset=0` → 200 OK
  - `GET /audit/binance` → 200 OK

---

## 4. Previously Proven Render Results

- `Binance Alpha exchange-info` → HTTP 200 (Proven from Render)
- `Binance Smart Money BSC (chainId=56)` → HTTP 200 (Proven from Render)
- `Binance Smart Money Solana (chainId=CT_501)` → HTTP 200 (Proven from Render)

New routes will be verified on Render following manual commit, push, and redeployment.

