# AlphaBee Binance evidence bridge

Read-only Binance evidence transport for the existing Render Node service. It supplies observations; AlphaBee retains analysis, scoring, watches, persistence, and publishing. No trading, signing, private keys, wallet initialization, self-ping loop, or Cloudflare changes.

See [the capability matrix](audit/BINANCE-CAPABILITY-MATRIX.md) for exact official sources, endpoints, CLI/auth boundaries, discovered capabilities, and remaining Render validation. No new provider is claimed Render-proven until the manual deployment audit succeeds.

## Run locally

Node >=22. No runtime dependencies.

```powershell
npm install
npm test
$env:BRIDGE_API_TOKEN = Read-Host 'Local bridge token'
npm start
```

`.env.example` contains only `BRIDGE_API_TOKEN=`. `.env` is ignored; Node does not load it automatically. Use environment variables as above, or `node --env-file=.env server.js` for local work. Render supplies environment variables directly. `PORT` defaults to 3000.

No lint or typecheck script is configured. Tests use Node's built-in runner; fixtures are synthetic, never live evidence. Optional `npm run audit:binance` runs public queries from your local network and writes ignored `audit/local-results.json`; NOT_WORKING makes that command exit 1. It does not deploy anything.

## API

All listed routes use GET. `/v1/*` and `/audit/binance` require `Authorization: Bearer <BRIDGE_API_TOKEN>`. No configured token means 503; missing/wrong bearer means 401. `/health` is public and reports configuration presence only. The original public `/test/binance` remains temporarily available and returns only the three legacy diagnostic summaries.

| Route | Query |
|---|---|
| `/v1/binance/alpha/exchange-info` | none |
| `/v1/binance/alpha/tokens` | none |
| `/v1/binance/alpha/ticker` | symbol from exchange info |
| `/v1/binance/alpha/klines` | symbol, interval; optional limit 1–500, startTime/endTime ms |
| `/v1/binance/smart-money` | chainId; optional page 1–1000, pageSize 1–100 |
| `/v1/binance/token-info` | chainId, contractAddress |
| `/v1/binance/token-audit` | chainId, contractAddress |
| `/v1/binance/address/positions` | chainId, address; optional offset 0–100000 |
| `/audit/binance` | none; fixed safe probes |

Unknown/duplicate query parameters are rejected, including URL/proxy parameters. GET bodies and other methods are rejected. Smart Money chains are syntax-validated and backend-authoritative. Audit/address chains follow official restrictions (1,56,8453,CT_501). Token-info follows the helper's unrestricted chain IDs, with EVM-format addresses for numeric chains and 32-byte base58 validation for Solana. Other CT chain addresses receive bounded alphanumeric validation; actual support is decided upstream.

Responses contain `source`, `operation`, `evidenceType`, `fetchedAt`, `httpStatus`, `query`, and `data`. Decimal strings and native units stay intact. Missing values are not invented. Token info contains separate metadata/market snapshots with their own timestamps. Alpha candle rows become named OHLCV fields. Smart Money keeps Binance names (`ticker`, `alertPrice`, `signalTriggerTime`, `maxGain`, etc.); maxGain remains a fraction and exitRate retains its native units. No synthetic direction or profitability labels.

Security has `evidenceType: security` and `available`. When isSupported or hasResult is false, only those two flags are returned; stale risk levels/taxes are suppressed. A low risk level never becomes a safe-to-trade claim. Holdings preserve Binance's `remainQty`, null lists, and change fields.

## Operational bounds

Transport accepts only named fixed operations. Incoming authorization is never forwarded to Binance. All redirects are rejected. Each upstream call has a 10-second deadline covering headers and body, an 8 MiB body limit, at most four concurrent calls, and a process-wide 60-call/minute budget. No retries amplify rate limits.

Identical in-flight calls coalesce. Successful transport results cache for 30 seconds, or five minutes for Alpha discovery/exchange data; cache is bounded to 32 entries / 16 MiB. Audit and legacy diagnostic summaries cache for five minutes. `fetchedAt` exposes snapshot age. Cache is ephemeral per process and is not evidence persistence. A full audit runs sequentially and may take around 150 seconds if upstream calls time out; client examples allow 240 seconds.

Errors expose fixed bridge codes and upstream HTTP status, not upstream response bodies, messages, request headers, or credentials. An HTTP 200 with a Binance error or unexpected schema fails. Audit summaries never contain token/wallet payloads. Authorization uses constant-time SHA-256 digest comparison. Request URL length is capped at 2048 and headers at 8192 bytes. No IP allowlist is installed.

## Manual commit, push, and Render validation

Review first; these commands are provided for you to run. Current branch observed: `main`; remote: `https://github.com/Fxdrill/binance-bridge-test.git`.

```powershell
Set-Location 'E:\My Bot Work\binance-bridge-test'
git diff --check
git diff --stat
git add server.js package.json package-lock.json .gitignore .env.example src scripts test README.md audit/BINANCE-CAPABILITY-MATRIX.md audit/VALIDATION.md
git diff --cached --stat
git commit -m "Build read-only Binance evidence bridge"
git push origin main
```

The clone, `.env`, node_modules and machine-specific audit JSON files are ignored. No commit, push, deployment, or Render setting change is performed automatically by this task.

In the existing Render service's Environment settings add exactly **BRIDGE_API_TOKEN**, using a fresh strong random secret. You can generate a value locally with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`; do not commit or share it in audit output. Keep the existing Node service and `npm start`. Manually redeploy (or let your existing push-triggered deployment run). No other hosting provider is needed.

Post-deployment commands below use PowerShell and `curl.exe` (not PowerShell's curl alias). Enter the same Render token locally. The token is read without echo and passed to curl through stdin so it is absent from curl's command-line arguments. Use the helper only with this trusted Render base URL.

```powershell
$bridgeBase = 'https://binance-bridge-test.onrender.com'
$bridgeSecure = Read-Host 'Render BRIDGE_API_TOKEN' -AsSecureString
$bridgeCredential = [System.Net.NetworkCredential]::new('', $bridgeSecure)
$bridgeToken = $bridgeCredential.Password
function Invoke-BridgeCurl([string]$Path) {
  'header = "Authorization: Bearer ' + $bridgeToken + '"' |
    curl.exe --config - --silent --show-error --fail-with-body --max-time 240 "$bridgeBase$Path"
}

curl.exe --silent --show-error --fail-with-body --max-time 120 "$bridgeBase/health"
curl.exe --silent --show-error --fail-with-body --max-time 120 "$bridgeBase/test/binance"

# Must return HTTP 401 after BRIDGE_API_TOKEN is configured.
curl.exe --silent --show-error --include --max-time 120 "$bridgeBase/v1/binance/alpha/tokens"

Invoke-BridgeCurl '/audit/binance' | Set-Content -Encoding utf8 'audit/render-results.json'
Get-Content 'audit/render-results.json'
Invoke-BridgeCurl '/v1/binance/alpha/exchange-info'
Invoke-BridgeCurl '/v1/binance/alpha/tokens'
Invoke-BridgeCurl '/v1/binance/smart-money?chainId=56'
Invoke-BridgeCurl '/v1/binance/smart-money?chainId=CT_501'
Invoke-BridgeCurl '/v1/binance/smart-money?chainId=1'
Invoke-BridgeCurl '/v1/binance/smart-money?chainId=8453'
Invoke-BridgeCurl '/v1/binance/smart-money?chainId=4663'
Invoke-BridgeCurl '/v1/binance/token-info?chainId=56&contractAddress=0x55d398326f99059ff775485246999027b3197955'
Invoke-BridgeCurl '/v1/binance/token-audit?chainId=56&contractAddress=0x55d398326f99059ff775485246999027b3197955'
Invoke-BridgeCurl '/v1/binance/address/positions?chainId=56&address=0x000000000000000000000000000000000000dEaD&offset=0'

# Discover a current pair instead of relying on a stale example symbol.
$bridgeExchange = Invoke-BridgeCurl '/v1/binance/alpha/exchange-info' | ConvertFrom-Json
$bridgePair = ($bridgeExchange.data.symbols | Where-Object status -eq 'TRADING' | Select-Object -First 1).symbol
if ($bridgePair) {
  Invoke-BridgeCurl "/v1/binance/alpha/ticker?symbol=$bridgePair"
  Invoke-BridgeCurl "/v1/binance/alpha/klines?symbol=$bridgePair&interval=1h&limit=10"
}
Remove-Variable bridgeToken, bridgeCredential, bridgeSecure
```

Expected outcomes are conditional, not a promised live result:

- Original exchange/BSC/Solana probes are expected to remain reachable given the previous verified 200s, but must also pass the new envelope/schema checks.
- Every successful HTTP/provider probe returns `status: WORKING, httpStatus: 200`; upstream failures return `NOT_WORKING` with actual HTTP status or null plus a sanitized reason. ETH/Base/4663 and all new endpoints remain unproven on Render until this run.
- `alphaTicker`/`alphaKlines` are `NOT_APPLICABLE` if exchange discovery yields no trading pair. Empty results are distinct from failures.
- `leaderboard`, `walletTrackerSmartMoney`, `walletTrackerKol`, `walletScoring`, `walletTrackerWebSocket`: `CLI_REQUIRED`.
- `gemHunter`, `privateTracker`, `followList`, `savedPresets`: `AUTH_REQUIRED`.
- `tradingAndSigning`: `NOT_APPLICABLE`.

Example fragments (illustrative, not observed):

```json
{
  "alphaExchangeInfo": {"status":"WORKING","httpStatus":200},
  "smartMoneyBsc": {"status":"WORKING","httpStatus":200},
  "smartMoneySolana": {"status":"WORKING","httpStatus":200},
  "tokenInfo": {"status":"NOT_WORKING","httpStatus":403,"error":"UPSTREAM_HTTP_ERROR"},
  "leaderboard": {"status":"CLI_REQUIRED","httpStatus":null},
  "gemHunter": {"status":"AUTH_REQUIRED","httpStatus":null}
}
```

After recording actual Render results in the matrix, stop. Connecting AlphaBee Cloudflare is a separate step.
