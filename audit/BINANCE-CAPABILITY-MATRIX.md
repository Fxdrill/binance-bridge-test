# Binance capability matrix

Audit date: 2026-09-24. Scope: this bridge only. No deployment or Render configuration changes were made.

## Sources and precedence

Primary reference: the existing clean clone of [binance/binance-skills-hub](https://github.com/binance/binance-skills-hub), commit **9960c675387bd27f8866645b83693c1fa87242f6**. The runtime does not depend on the clone. Source helpers take precedence over older prose or the duplicate `trading-signal` skill.

Exact sources (paths relative to that commit):

- [S1: current Smart Money helper](https://github.com/binance/binance-skills-hub/blob/9960c675387bd27f8866645b83693c1fa87242f6/skills/binance-web3/binance-trading-signal/scripts/cli.mjs) and [field reference](https://github.com/binance/binance-skills-hub/blob/9960c675387bd27f8866645b83693c1fa87242f6/skills/binance-web3/binance-trading-signal/references/cli.md).
- [S2: token-info helper](https://github.com/binance/binance-skills-hub/blob/9960c675387bd27f8866645b83693c1fa87242f6/skills/binance-web3/query-token-info/scripts/cli.mjs) and [field reference](https://github.com/binance/binance-skills-hub/blob/9960c675387bd27f8866645b83693c1fa87242f6/skills/binance-web3/query-token-info/references/cli.md).
- [S3: token-security specification](https://github.com/binance/binance-skills-hub/blob/9960c675387bd27f8866645b83693c1fa87242f6/skills/binance-web3/query-token-audit/SKILL.md).
- [S4: address helper](https://github.com/binance/binance-skills-hub/blob/9960c675387bd27f8866645b83693c1fa87242f6/skills/binance-web3/query-address-info/scripts/cli.mjs) and [field reference](https://github.com/binance/binance-skills-hub/blob/9960c675387bd27f8866645b83693c1fa87242f6/skills/binance-web3/query-address-info/references/cli.md).
- [S5: leaderboard skill](https://github.com/binance/binance-skills-hub/blob/9960c675387bd27f8866645b83693c1fa87242f6/skills/binance-web3/binance-leaderboard/SKILL.md), [CLI reference](https://github.com/binance/binance-skills-hub/blob/9960c675387bd27f8866645b83693c1fa87242f6/skills/binance-web3/binance-leaderboard/references/cli.md), and scoring reference in the same directory.
- [S6: tracker skill](https://github.com/binance/binance-skills-hub/blob/9960c675387bd27f8866645b83693c1fa87242f6/skills/binance-web3/binance-wallet-tracker/SKILL.md) and [CLI reference](https://github.com/binance/binance-skills-hub/blob/9960c675387bd27f8866645b83693c1fa87242f6/skills/binance-web3/binance-wallet-tracker/references/cli.md).
- [S7: Alpha skill reference](https://github.com/binance/binance-skills-hub/blob/9960c675387bd27f8866645b83693c1fa87242f6/skills/binance/binance/references/alpha.md). The skill lists CLI command names, so exact HTTP paths and parameter spelling were verified against [official Alpha REST market-data documentation](https://developers.binance.com/en/docs/catalog/advanced-trading-alpha-trading/api/rest-api/market-data).
- [S8: crypto-market-rank helper](https://github.com/binance/binance-skills-hub/blob/9960c675387bd27f8866645b83693c1fa87242f6/skills/binance-web3/crypto-market-rank/scripts/cli.mjs) and [reference](https://github.com/binance/binance-skills-hub/blob/9960c675387bd27f8866645b83693c1fa87242f6/skills/binance-web3/crypto-market-rank/references/cli.md).
- [S9: meme-rush helper](https://github.com/binance/binance-skills-hub/blob/9960c675387bd27f8866645b83693c1fa87242f6/skills/binance-web3/meme-rush/scripts/cli.mjs) and reference in the same directory.
- [S10: tokenized securities](https://github.com/binance/binance-skills-hub/blob/9960c675387bd27f8866645b83693c1fa87242f6/skills/binance-web3/binance-tokenized-securities-info/SKILL.md).
- [S11: CLI authentication](https://github.com/binance/binance-skills-hub/blob/9960c675387bd27f8866645b83693c1fa87242f6/skills/binance-web3/binance-agentic-wallet/references/authentication.md). npm registry metadata queried with `npm view @binance/agentic-wallet version engines os cpu bin dist.unpackedSize --json`: version 1.10.0, Node >=18, executable `baw` -> `dist/index.js`, no os/cpu restriction returned.

## HTTP operations and parameters

In this section `W` means `https://web3.binance.com/bapi/defi` and `A` means `https://www.binance.com/bapi/defi/v1/public`. Paths below concatenate exactly with these prefixes. All operations are anonymous public reads: no Binance credentials, wallet initialization, signing, or `baw` required. POST requests only query evidence.

Headers: `Accept: application/json`, `Accept-Encoding: identity`, `Content-Type: application/json`; Web3 uses `User-Agent: binance-web3/2.0 (Skill)` except S8 uses `3.0` and audit uses `1.4`. Audit additionally sends `source: agent`; positions sends `clienttype: web` and `clientversion: 1.2.0`. Alpha requires no authentication; the bridge sends the common JSON/identity headers.

| Capability / source | Exact method and endpoint | Required parameters; bounded bridge options | Chains |
|---|---|---|---|
| Alpha exchange / S7 | GET `A/alpha-trade/get-exchange-info` | None | Universe returned by Binance |
| Alpha discovery / S7 | GET `A/wallet-direct/buw/wallet/cex/alpha/all/token/list` | None | Returned chain/contract identities |
| Alpha ticker / S7 | GET `A/alpha-trade/ticker` | `symbol`, selected from exchange info | Alpha trading pairs |
| Alpha candles / S7 | GET `A/alpha-trade/klines` | `symbol`, `interval`; `limit` 1–500, optional `startTime`/`endTime` in ms | Alpha trading pairs |
| Smart Money / S1 | POST `W/v1/public/wallet-direct/buw/wallet/web/signal/smart-money/ai` | `chainId`; `page` 1–1000, `pageSize` 1–100 | Backend-authoritative; probes 56, CT_501, 1, 8453, 4663 |
| Token metadata / S2 | GET `W/v1/public/wallet-direct/buw/wallet/dex/market/token/meta/info/ai` | `chainId`, `contractAddress` | 1,56,8453,CT_501 documented; helper does not restrict |
| Token market / S2 | GET `W/v4/public/wallet-direct/buw/wallet/market/token/dynamic/info/ai` | `chainId`, `contractAddress` | Same as metadata |
| Token security / S3 | POST `W/v1/public/wallet-direct/security/token/audit` | `binanceChainId`, `contractAddress`, generated UUID-v4 `requestId` | 1,56,8453,CT_501 |
| Public holdings / S4 | GET `W/v3/public/wallet-direct/buw/wallet/address/pnl/active-position-list/ai` | `chainId`, `address`, `offset` (bridge 0–100000) | 1,56,8453,CT_501 in current helper |
| Address PnL ranking / S8 | GET `W/v1/public/wallet-direct/market/leaderboard/query/ai` | `chainId`, `period` 7d/30d/90d, `tag` ALL/KOL; pageNo >=1, pageSize <=25 | Current helper: 1,56,8453,CT_501 |
| Smart Money inflow / S8 | POST `W/v1/public/wallet-direct/tracker/wallet/token/inflow/rank/query/ai` | `chainId`, optional period 5m/1h/4h/24h; helper defaults `tagType:2` | Current helper: 56,CT_501,8453 |

The final two are **audit-only**, using fixed small requests. They are documented HTTP capabilities in their own right, not invented equivalents of `baw`. No production leaderboard/tracker route is exposed before Render validation.

## Capability classification and Render evidence

Only the running Render service can establish new Render results. No new code has been deployed to Render during this task. Local results were verified through live execution of `npm run audit:binance` on 2026-09-24, where every live public HTTP probe completed successfully with HTTP 200.

IMPORTANT: The Render results below preserve the facts independently proven during earlier Render connectivity tests (Alpha exchange-info = HTTP 200, Smart Money BSC 56 = HTTP 200, Smart Money Solana CT_501 = HTTP 200). Newly implemented providers will be verified on Render after manual commit, push, and redeployment.

| Capability | Source | Endpoint or CLI | Method | Public/auth | Supported/tested chains | Local result (HTTP) | Render result (Proven) | Useful AlphaBee evidence | Limitations | Final classification |
|---|---|---|---|---|---|---|---|---|---|---|
| Alpha exchange info | S7 | `A/alpha-trade/get-exchange-info` | GET | Public HTTP | Universe returned by Binance | WORKING (200, 4.1s) | WORKING (HTTP 200) | Pairs, assets, symbol trading rules | Pairs/rules only; no direct on-chain contract addresses | WORKING |
| Alpha tokens | S7 | `A/wallet-direct/buw/wallet/cex/alpha/all/token/list` | GET | Public HTTP | Multi-chain (678 tokens discovered) | WORKING (200, 2.1s, 678 records) | Pending Render redeploy | Alpha ID, symbol, contract, chain mapping | Retains upstream fields; Alpha universe only | WORKING (Local) / Pending Render |
| Alpha ticker | S7 | `A/alpha-trade/ticker` | GET | Public HTTP | Alpha trading pairs | WORKING (200, 528ms) | Pending Render redeploy | Last price, 24h price/volume context | Requires valid symbol from exchange-info (e.g. `ALPHA_1USDT`) | WORKING (Local) / Pending Render |
| Alpha candles (klines) | S7 | `A/alpha-trade/klines` | GET | Public HTTP | Alpha trading pairs | WORKING (200, 489ms, 2 bars) | Pending Render redeploy | OHLCV, trade counts, taker volumes, timestamps | Bridge caps 500 bars; requires whitelisted interval | WORKING (Local) / Pending Render |
| Smart Money BSC | S1 | `W/v1/public/wallet-direct/buw/wallet/web/signal/smart-money/ai` | POST | Public HTTP | BSC (56) | WORKING (200, 2.7s, 5 records) | WORKING (HTTP 200) | Trigger price/time, direction if supplied, market cap, exit rate, wallet counts | Preserves native fields; keeps stale status; no synthetic direction | WORKING |
| Smart Money Solana | S1 | `W/v1/public/wallet-direct/buw/wallet/web/signal/smart-money/ai` | POST | Public HTTP | Solana (CT_501) | WORKING (200, 1.8s, 5 records) | WORKING (HTTP 200) | Same signal evidence for Solana | Preserves native fields; keeps stale status | WORKING |
| Smart Money ETH/Base/4663 | S1 | `W/v1/public/wallet-direct/buw/wallet/web/signal/smart-money/ai` | POST | Public HTTP | Ethereum (1), Base (8453), Robinhood (4663) | WORKING (200, 438-899ms each) | Pending Render redeploy | Multi-chain smart money signals | Backend-authoritative; bridge passes chainId through without artificial restriction | WORKING (Local) / Pending Render |
| Token metadata + market | S2 | `W/v1/.../meta/info/ai` + `W/v4/.../dynamic/info/ai` | GET | Public HTTP | 56 verified; 1, 8453, CT_501 supported | WORKING (200, 1.2s) | Pending Render redeploy | Token identity, price, liquidity, holders, 24h volume, 5m/1h/4h/24h buy/sell | Separate snapshots; no holder-growth accumulation inference | WORKING (Local) / Pending Render |
| Security audit | S3 | `W/v1/public/wallet-direct/security/token/audit` | POST | Public HTTP | 56 verified; 1, 8453, CT_501 supported | WORKING (200, 519ms, available=true) | Pending Render redeploy | Honeypot flag, contract risks, buy tax, sell tax, risk level (1-5) | Suppressed unless supported AND hasResult; strictly security only | WORKING (Local) / Pending Render |
| Public address holdings | S4 | `W/v3/public/wallet-direct/buw/wallet/address/pnl/active-position-list/ai` | GET | Public HTTP | 56 verified; 1, 8453, CT_501 supported | WORKING (200, 4.0s) | Pending Render redeploy | Token balance, price, 24h change, chain | Null list means no tracked holdings (not an error); read-only | WORKING (Local) / Pending Render |
| Address PnL HTTP ranking | S8 | `W/v1/public/wallet-direct/market/leaderboard/query/ai` | GET | Public HTTP | 56 verified; 1, 8453, CT_501 supported | WORKING (200, 707ms) | Pending Render redeploy | Realized PnL, win rate, volume, trades, token counts | Audit probe only; no invented profitability labels | WORKING (Audit Only) |
| Smart Money inflow HTTP rank | S8 | `W/v1/public/wallet-direct/tracker/wallet/token/inflow/rank/query/ai` | POST | Public HTTP | 56 verified; CT_501, 8453 supported | WORKING (200, 976ms, 64 records) | Pending Render redeploy | Net inflow, traders, buys/sells, risk/tags | Audit probe only; distinct from full CLI wallet tracker | WORKING (Audit Only) |
| Leaderboard query | S5 | `baw leaderboard query` | CLI | Public CLI | 56, CT_501, 8453, 1 | CLI_REQUIRED (BAW_NOT_IN_BRIDGE_RUNTIME) | Not run / — | PnL, win rate, volume, trades, tokens, daily PnL | Requires optional `baw` CLI; not installed in bridge runtime | CLI_REQUIRED |
| Wallet analysis/scoring | S5 | `baw leaderboard analyze` | CLI | Public CLI | 56, CT_501, 8453, 1 | CLI_REQUIRED (BAW_NOT_IN_BRIDGE_RUNTIME) | Not run / — | 6-dimension scoring model | Computed scoring belongs in AlphaBee overlay; requires `baw` | CLI_REQUIRED |
| Public SMY/KOL token and trade tracking | S6 | `baw tracker token/tx query` | CLI | Public CLI | 56, CT_501, 8453, 1, 4663 | CLI_REQUIRED (BAW_NOT_IN_BRIDGE_RUNTIME) | Not run / — | Consensus tokens, trade activity, inflow | Requires `baw` CLI; no standalone public HTTP trade stream | CLI_REQUIRED |
| Tracker WebSocket | S6 | `baw tracker ws` | CLI / WS | Public CLI | 56, CT_501, 8453, 1 | CLI_REQUIRED (BAW_NOT_IN_BRIDGE_RUNTIME) | Not run / — | Live wallet/trade event streaming | Long-lived WebSocket connection; unsuited for stateless bridge | CLI_REQUIRED |
| Gem Hunter / token-holder lookup | S5 | `baw leaderboard alpha-radar` | CLI | Private CLI | 56, CT_501, 8453, 1 | AUTH_REQUIRED (BAW_AGENT_SESSION_REQUIRED) | Not run / — | Wallets holding queried tokens, matched tokens | Requires user authentication via `agentSessionId` | AUTH_REQUIRED |
| Private tracker/follow list/groups | S6 | `baw tracker follow/group` | CLI | Private CLI | User account specific | AUTH_REQUIRED (BAW_AGENT_SESSION_REQUIRED) | Not run / — | User-specific groups and followed addresses | Current user's follows only; requires auth session | AUTH_REQUIRED |
| Saved presets/config reads | S5 | `baw leaderboard preset` | CLI | Private CLI | User account specific | AUTH_REQUIRED (BAW_AGENT_SESSION_REQUIRED) | Not run / — | Saved filter context | Not needed for public evidence | AUTH_REQUIRED |
| Writes, trading, signing, payments | S5/S6 | None | None | Prohibited | N/A | NOT_APPLICABLE (READ_ONLY_BRIDGE) | Not run / — | None | Explicitly prohibited; read-only bridge | NOT_APPLICABLE |

WORKING means a successful HTTP response, successful Binance envelope, and expected data shape. Empty signal/ranking arrays can be WORKING with `recordCount:0`; they do not prove signals exist. Security audit can be WORKING with `resultAvailable:false`. A 403/451 or rate limit is NOT_WORKING, not guessed authentication. HTTP 401 is AUTH_REQUIRED. No unexpected response messages or full payloads appear in audit diagnostics.

## CLI operation details and unattended operation

All CLI output should use `--json`. CLI HTTP headers and private transport are managed by `baw`; undocumented endpoints are not reproduced.

| Capability | Exact official read command | Chains / required input | Credentials / unattended assessment |
|---|---|---|---|
| Rankings | `baw leaderboard query -c 56 -p 7d -t ALL --page 0 --size 20 --json` | 56,CT_501,8453,1; chain required; sort-by 0 PnL,20 win rate,30 volume,50 trades,80 tokens | Public, no wallet required per S5; Node/Linux compatibility plausible but Render not tested |
| Address score | `baw leaderboard analyze -c 56 -a <public-address> --json` | Same; chain + address | Scans leaderboard; computed scoring excluded from bridge |
| Gem Hunter | `baw leaderboard alpha-radar -c 56 -t <token-addresses> -m 1 --json` | Same; chain,tokens,match count | Requires agentSessionId; not unattended without managed auth |
| Public token monitor | `baw tracker token query -c 56 --tag-type smy --token-size 20 --period 4h --json` | 56,CT_501,8453,1,4663 verified in skill; broader chains require probes; kol also accepted | Public no auth per S6; CLI_REQUIRED |
| Public trade monitor | `baw tracker tx query -c 56 --tag-type kol --json` | Same; chain + tag type | Public; no pagination, so subprocess output must be bounded before future integration |
| WebSocket | `baw tracker ws --smy -c 56 --duration 15 --json` | Subscription-specific; see S6 | CLI_REQUIRED; no session opened |
| Private token monitor | `baw tracker token query -c 56 --group-id 1 --json` | Chain + existing group | AUTH_REQUIRED; no groups created |
| Own follows | `baw tracker follow -c 56 --json` | Chain | AUTH_REQUIRED |
| Preset/config reads | `baw leaderboard preset list --json`; `baw leaderboard alpha-radar-config list -c 56 --json` | Config list requires chain | AUTH_REQUIRED |

S5 requires baw >=1.6.2. S6 metadata requires >=1.9.1 although its prose still says >=1.6.2; prefer the stricter requirement. Registry version observed was 1.10.0, Node >=18. This project uses Node >=22. These prerequisites suggest Render Node compatibility, **not proven reliable operation**. No CLI was installed in the bridge, no wallet was initialized, and no auth flow was started. S11 authentication requires user interaction in the Binance app; it is not a credential-free unattended bootstrap. A separate Render CLI probe would be needed before adding routes or a pinned dependency.

Tracker consensus is CLI-derived from `addressList.length`; net inflow and counts are sums of supplied per-address fields. These are not top-level API observations. A2 latestTxTime/launchTime are ms; A3 trade `ts` is seconds. No consensus calculation, analysis, watch, database, or publishing is implemented here.

## Additional useful discoveries (investigated, deliberately deferred)

These public reads have no Binance credential/`baw` requirement and are candidates for unattended bounded HTTP calls, but are not exposed or tested in this phase. Classification: NOT_APPLICABLE to the implemented route set; this does not assert they are unsupported upstream.

| Source / capability | Exact operation | Parameters / chains / evidence / limitation |
|---|---|---|
| S2 token search | GET `W/v5/public/wallet-direct/buw/wallet/market/token/search/ai` | keyword required; optional chainIds comma list, orderBy. Identity + price/liquidity. Alpha token discovery already covered. |
| S2 on-chain candles | GET `https://dquery.sintral.io/u-kline/v1/k-line/candles` | Helper maps chainId 1/56/8453/CT_501 to platform ethereum/bsc/base/solana and contractAddress to address; interval required; limit<=500, from/to ms, pm p/m optional. Different status envelope and 7-column candle order. External host deliberately excluded; Alpha candles implemented. |
| S8 social hype | GET `W/v1/public/wallet-direct/buw/wallet/market/token/pulse/social/hype/rank/leaderboard/ai` | chainId,targetLanguage,timeRange required; 56/8453/CT_501. Social summaries are context, not verified buying evidence. UA 3.0. |
| S8 unified ranks | POST `W/v1/public/wallet-direct/buw/wallet/market/token/pulse/unified/rank/list/ai` | rankType 10/11/20/40, chainId in 1/56/8453/CT_501, page,size<=200; current helper applies defaults for rank types 10/20. Volume/holders/liquidity/trader context. UA 3.0. |
| S8 meme rank | GET `W/v1/public/wallet-direct/buw/wallet/market/token/pulse/exclusive/rank/list/ai` | chainId=56; Binance's own rank/score plus token context. Does not establish profitability. UA 3.0. |
| S9 launchpad lifecycle | POST `W/v1/public/wallet-direct/buw/wallet/market/token/pulse/rank/list/ai` | chainId,rankType 10/20/30; limit<=200; helper supports 56/CT_501/8453 (older prose omits Base). Launch, migration, holder concentration; UA 2.0. |
| S9 topic discovery | GET `W/v2/public/wallet-direct/buw/wallet/market/token/social-rush/rank/list/ai` | chainId 56/CT_501,rankType 10/20,sort 10/20; optional asc. Topic narratives and associated token inflows; UA 2.0. |
| S10 tokenized stock discovery | GET `A/wallet-direct/buw/wallet/market/token/rwa/stock/detail/list/ai` | optional type=1; ETH/BSC. Identity/share multipliers; specialized RWA scope deferred. UA 1.1, identity encoding. |
| S7 depth / trades | GET `A/alpha-trade/fullDepth`; GET `A/alpha-trade/agg-trades` | symbol required; limit bounded; trades additionally fromId,startTime,endTime. Market-depth context discovered, not implemented yet. |

## Validation workflow

`npm test` uses deterministic synthetic fixtures and never represents live Binance evidence. `npm run audit:binance` performs live public reads from the **local machine**, writing ignored `audit/local-results.json`. Render validation is the authenticated `GET /audit/binance` after manual push/redeploy; save its output to ignored `audit/render-results.json`. See README for exact commands and expectations. Update the pending cells only from that output, including execution timestamp and HTTP status. Stop before connecting Cloudflare.
