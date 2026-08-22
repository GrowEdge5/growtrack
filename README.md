# Growtrack

Growtrack is a multichain wallet intelligence API. The current build provides a production-oriented TypeScript modular monolith with a Fastify API, a BullMQ worker, PostgreSQL persistence, Redis caching, and an EVM provider adapter that reads native balance, ERC-20 token holdings, and USD valuation.

## Development Status

_Last verified: **2026-08-22** — EVM wallet intelligence (ERC-20 holdings + USD pricing + valuation exposure): **COMPLETE**. Phase 1 (scaffold + local infrastructure): COMPLETE (2026-08-18)._

### Completed progress

**EVM wallet intelligence (2026-08-22)** — the wallet snapshot now carries real token holdings and USD valuation, end-to-end:

- **ERC-20 token holdings** are read in a single Multicall3 `balanceOf` batch over a curated Ethereum token list (`src/modules/chains/infrastructure/evm/ethereum-token-list.ts`). Only successful, non-zero balances appear; a per-token revert is tolerated (`allowFailure`) and never fails the whole snapshot. Nothing is fabricated or zero-filled.
- **USD pricing** uses the keyless DeFiLlama coins API (`https://coins.llama.fi`). One request prices the native currency plus every token. DeFiLlama's per-price `confidence` (0..1) is enforced at `>= 0.5`; anything lower is treated as unpriced. Pricing sits behind a `PriceProvider` port, so the source is a pure adapter swap. _(CoinGecko was dropped: its keyless API now caps token lookups at one address per request, which breaks the no-API-key design.)_
- **USD valuation is exposed** in the API: each holding carries an optional `valueUsd`, and the snapshot carries an optional top-level `totalValueUsd` (native + all priced holdings). Amounts use `decimal.js` and are persisted as `Decimal(36,8)`.
- **Honest `status` semantics.** `status: "complete"` means every asset we discovered was assigned a USD value — the native balance and every holding. Any missing price yields `"partial"`. **This describes USD-pricing coverage of the assets we found; it does NOT claim exhaustive portfolio coverage**, because token discovery is limited to the curated list above. A missing price is never faked — the holding simply has no `valueUsd` and is excluded from `totalValueUsd`, which is omitted entirely (never `"0"`) when nothing can be priced.

**Phase 1 — scaffold + local infrastructure (2026-08-18):**

- Docker Desktop + PostgreSQL + Redis brought up and verified; Prisma migration `20260817062730_init` applied.
- Fixed a startup bug: BullMQ eagerly connects the shared ioredis client during `Queue` construction, so the unconditional `redis.connect()` in the DI container threw `Redis is already connecting/connected`. Guarded in `src/app/build-container.ts`; fixes both API and worker boot.
- API + worker + full EVM read path verified end-to-end.

**Currently working functionality:**

- `GET /health/live`, `GET /health/ready` (DB + Redis checks), `GET /metrics`, `GET /docs`
- EVM (Ethereum) **native balance + block number + ERC-20 holdings (curated list) + USD pricing + `totalValueUsd`**, persisted in PostgreSQL and cached in Redis
- CQRS flow: `GET` reads cache/DB (`404` if absent) · `POST /refresh` enqueues · worker computes the snapshot

### Problems / limitations

- **Token discovery is curated-list-based, not exhaustive.** Holdings come from a fixed list of well-known Ethereum ERC-20s; a token outside that list is not detected. `status` reflects USD-pricing coverage of discovered assets, not total portfolio completeness. _(By design for now; documented above. File: `src/modules/chains/infrastructure/evm/ethereum-token-list.ts`.)_
- **`transactions`, `positions`, `signals` are still empty** — unimplemented extension points, not fabricated data. _(Later scope.)_
- **Only EVM/Ethereum is implemented.** Algorand, Solana, Bitcoin are not. _(Roadmap Phases 3–4.)_
- **x402 payment layer not started.** _(Blocker for hackathon submission — later roadmap phases.)_
- Compiled/production start (`npm start`) expects env vars from the environment; `.env` is auto-loaded only in dev. _(Non-blocker; expected for Docker/prod deployment.)_

### Tests & verification

Every check below was actually executed.

| Command / check                                  | Result   | Notes                                                                                                                                                  |
| ------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run ci`                                     | **PASS** | format:check ✓ · eslint ✓ · tsc --noEmit ✓ · vitest (11 tests / 4 files) ✓ · build ✓                                                                   |
| `applyUsdPricing` unit tests                     | **PASS** | totals, missing-price honesty, and the `complete`/`partial` status rule (5 tests)                                                                      |
| `walletResponseSchema` serializer test           | **PASS** | confirms `totalValueUsd` + per-holding `valueUsd` survive serialization — the field zod previously stripped (2 tests)                                  |
| Live refresh + `GET` (vitalik.eth `0xd8dA…6045`) | **PASS** | `200`, `status: "complete"`, `totalValueUsd` ≈ `$20,086.64`, all 9 discovered holdings priced with `valueUsd`, through the full Fastify/zod serializer |
| Docker `postgres` + `redis`                      | **PASS** | `Up (healthy)`, ports 5432 / 6379                                                                                                                      |

### Infrastructure status

| Component          | Status                                                            |
| ------------------ | ----------------------------------------------------------------- |
| Docker Desktop     | RUNNING (v4.87.0)                                                 |
| PostgreSQL         | RUNNING & VERIFIED (`:5432`, healthy)                             |
| Redis              | RUNNING & VERIFIED (`:6379`, healthy)                             |
| API (Fastify)      | RUNNING & VERIFIED (`:3000`)                                      |
| Worker (BullMQ)    | RUNNING & VERIFIED                                                |
| Environment config | `.env` present (gitignored), schema-validated, auto-loaded in dev |

### Hackathon compliance status (Algorand Global x402 Challenge)

| Requirement                      | Status                            |
| -------------------------------- | --------------------------------- |
| Paid x402 endpoint               | NOT IMPLEMENTED                   |
| HTTP 402 response                | NOT IMPLEMENTED                   |
| Algorand Testnet flow            | NOT IMPLEMENTED                   |
| Algorand Mainnet endpoint        | NOT IMPLEMENTED                   |
| GoPlausible x402 Facilitator     | NOT IMPLEMENTED                   |
| Mainnet USDC ASA `31566704`      | NOT IMPLEMENTED                   |
| `payTo` (Mainnet, USDC-opted-in) | NOT IMPLEMENTED                   |
| Bazaar discovery                 | NOT IMPLEMENTED                   |
| `x402-global-challenge` tag      | NOT IMPLEMENTED                   |
| HTTPS (public)                   | NOT IMPLEMENTED (local HTTP only) |
| Real Mainnet payment             | NOT TESTED                        |
| USDC received at payTo           | NOT TESTED                        |
| Leaderboard attribution          | NOT TESTED                        |
| Submission readiness             | NOT IMPLEMENTED                   |

### Current project phase

**EVM wallet intelligence — ERC-20 holdings + USD pricing + valuation exposure + honest status: COMPLETE and verified.** Runtime API + worker + full EVM read path (balance, block, holdings, USD totals) are verified locally against a live public address.

### Next recommended step

1. **Commit this tested milestone** (USD valuation exposure + honest snapshot status):

   ```bash
   git add -A && git commit -m "Expose USD valuation (totalValueUsd + per-holding valueUsd) and derive honest snapshot status"
   ```

2. **Continue the roadmap:** broaden EVM coverage as needed, then begin the next read chain (Algorand), followed by the x402 payment layer.

x402 work stays deferred until the multichain data layer is solid, per the project plan. The GoPlausible x402 Facilitator and Algorand USDC ASA are the intended payment path — no custom or fake facilitator.

## Prerequisites

- Node.js 20.11 or newer
- npm 10 or newer
- Docker Desktop for PostgreSQL/Redis and integration tests

The scaffold is installed, generated, type-checked, linted, tested, and compiled. Local infrastructure (Docker Desktop, PostgreSQL, Redis) and the live API + worker runtime are verified as of 2026-08-18 — see [Development Status](#development-status) below for the full breakdown.

## Local setup

```bash
cp .env.example .env
npm install
docker compose up -d postgres redis
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:seed
npm run dev
```

Start the worker in a second terminal:

```bash
npm run dev:worker
```

The API is served at `http://localhost:3000`.

- Liveness: `GET /health/live`
- Readiness: `GET /health/ready`
- Metrics: `GET /metrics`
- OpenAPI UI: `http://localhost:3000/docs`
- Wallet snapshot: `GET /v1/wallets/ethereum/:address`
- Queue refresh: `POST /v1/wallets/ethereum/:address/refresh`

## Quality checks

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

## Current capability boundary

The EVM provider reads native balance, block number, and ERC-20 holdings (from a curated Ethereum token list), then enriches each holding with a USD `valueUsd` and the snapshot with a `totalValueUsd`. A snapshot is `complete` only when the native balance and every discovered holding were priced; otherwise it is `partial`. Because token discovery is limited to the curated list, `complete` describes USD-pricing coverage of the assets found — **not** exhaustive portfolio coverage. Transactions, protocol positions, and intelligence signals remain explicit extension points rather than fabricated data.
