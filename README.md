# Growtrack

> **Multichain Wallet Intelligence & x402 Micropayment Protocol**  
> _Built for the Algorand Global x402 Challenge — Powered by Algorand MainNet & GoPlausible Facilitator_

[![Algorand x402](https://img.shields.io/badge/Algorand-MainNet%20x402-00ECB5?style=flat&logo=algorand&logoColor=black)](https://facilitator.goplausible.xyz)
[![USDC Rails](https://img.shields.io/badge/Micropayments-USDC%20ASA%2031566704-2775CA?style=flat)](https://lora.algokit.io/mainnet/asset/31566704)
[![Next.js 15](https://img.shields.io/badge/Frontend-Next.js%2015%20App%20Router-black?style=flat&logo=next.js)](https://nextjs.org)
[![Fastify](https://img.shields.io/badge/Backend-Fastify%205-000000?style=flat&logo=fastify)](https://fastify.dev)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript%205.7-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![Vitest](https://img.shields.io/badge/Tests-86%20Passing-green?style=flat&logo=vitest)](https://vitest.dev)

---

## What is Growtrack?

**Growtrack** is a multichain financial intelligence platform and agentic commerce gateway. It turns raw on-chain wallet addresses across multiple blockchains (**Algorand**, **Ethereum / EVMs**, **Bitcoin**, and **Solana**) into deep financial intelligence, truthful token valuations, and live transaction ledgers.

On top of the intelligence layer, Growtrack implements the **HTTP 402 "Payment Required" (x402) standard** native to Algorand. Users and autonomous AI agents can instantly pay for live portfolio snapshots, cross-chain consolidation reports, and machine-readable data feeds using gasless **Algorand USDC micropayments** via the official **GoPlausible Facilitator**.

### Core Product Principles

1. **Absolute Truthfulness**: Never fabricate fake balances, fake PnL % changes, or mocked historical charts. If token pricing is unavailable, assets are explicitly marked as `Unpriced` rather than defaulting to $0.00.
2. **Zero Friction for Explorers**: Any user can look up and analyze their first wallet completely free and anonymously — zero wallet connection, zero account creation, zero payment.
3. **Native x402 Micropayments**: Advanced features (such as multi-wallet cross-chain consolidation statements and live synchronous agent feeds) are gated by genuine on-chain Algorand USDC micro-transactions.
4. **Agent-First Discovery**: Provides built-in discovery surfaces (`/.well-known/x402`, `/llms.txt`, `/v1/chains`, and Bazaar extensions) allowing autonomous AI agents to discover, negotiate, pay, and consume Growtrack services programmatically.

---

## User Guide: How to Use Growtrack

Whether you are a new visitor, an institution, or a judge evaluating the project, follow this quick walkthrough to experience Growtrack:

### Step 1: Look Up Any Wallet for Free (Zero Setup)

1. Open the Growtrack dashboard in your browser (`http://localhost:3001` or `https://growtrack.pro`).
2. In the hero search bar, paste any public wallet address:
   - **Ethereum / EVM**: `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045` (or any ENS name / 0x address)
   - **Algorand**: `JJNP4JGSR5ICF5NTMVC4TO7CE4KM2FDL7G4LAEEFIK2KVGL6RTPLPGMTB4`
   - **Bitcoin**: `1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa`
   - **Solana**: `GJRs4FwHtemZ5ZE9x3FNvJ8TMwitKTh21yxdRPqn7npE`
3. Click **Search** or click one of the quick whale preset chips (`vitalik.eth`, `Satoshi`, `Algorand Foundation`).
4. **Result**: Growtrack automatically detects the blockchain format, fetches live on-chain balances and tokens via upstream RPCs, prices them in real-time, and renders a clean financial overview.

### Step 2: Explore On-Chain Intelligence

- **Portfolio Overview**: View total portfolio valuation in USD and native asset holdings.
- **Token Holdings**: Inspect curated ERC-20, ASA, or SPL token breakdowns with live prices, exact decimals, and allocation percentages.
- **Live Transaction Ledger**: Switch to the **Transactions** tab to see confirmed on-chain activity with direct links to official network block explorers (Etherscan, Solscan, Blockstream, Lora).

### Step 3: Multi-Wallet Tracking

- In the top bar, click `+ Add Wallet` or click the whale preset pills to add more addresses to your tracked session.
- Switch between wallets with one click to monitor multiple portfolios simultaneously.

### Step 4: Generate Consolidated Report via Algorand x402

1. Click the **"Generate full report (x402)"** button on the top right.
2. If your Algorand wallet is not yet connected, choose your preferred wallet provider (**Pera Wallet**, **Defly**, or **Lute**).
3. The app initiates the official **x402 micropayment handshake**:
   - The server answers with an authentic `HTTP 402 Payment Required` response containing payment specifications (Network: Algorand MainNet, Asset: USDC `31566704`, Recipient: `payTo`).
   - Your Algorand wallet prompts you to sign a gasless micro-transaction.
   - The **GoPlausible Facilitator** verifies and settles the payment on Algorand MainNet within seconds.
4. **Result**: The modal unlocks, revealing a consolidated multi-chain financial report that aggregates totals, per-chain breakdowns, and unpriced exposure across all tracked addresses.

---

## Supported Blockchains & Read Architecture

Growtrack reads native balances, token holdings, and transactions behind a unified `ChainDataProvider` interface:

| Blockchain         | Identifier                                                    | Native Coin                 | Data Source / Upstream Port                | Features                                                            |
| :----------------- | :------------------------------------------------------------ | :-------------------------- | :----------------------------------------- | :------------------------------------------------------------------ |
| **Ethereum (EVM)** | `ethereum`                                                    | `ETH`                       | Multicall3 batch RPC + Blockscout REST     | Native balance, curated ERC-20s, USD pricing, tx ledger             |
| **Algorand**       | `algorand`                                                    | `ALGO`                      | Algonode algod REST + Indexer              | ALGO balance, curated ASAs (USDC/USDt), round times, tx index       |
| **Bitcoin**        | `bitcoin`                                                     | `BTC`                       | Esplora REST API                           | UTXO balance, real input/output ledger entries, block confirmations |
| **Solana**         | `solana`                                                      | `SOL`                       | Keyless Solana JSON-RPC + Jupiter metadata | SOL balance, SPL token accounts, slot confirmations                 |
| **EVM L2s**        | `base`, `arbitrum`, `polygon`, `optimism`, `bsc`, `avalanche` | `ETH`, `POL`, `BNB`, `AVAX` | Public node JSON-RPC endpoints             | Address format detection & multi-chain routing                      |

---

## x402 Micropayment Protocol & Bazaar Discovery

Growtrack implements the **x402 Specification (v2)** to monetize API access directly over Algorand rails:

```
[ Client / Agent ]                              [ Growtrack API ]                       [ GoPlausible Facilitator ]
        |                                               |                                           |
        |--- 1. GET /v1/portfolio/report -------------->|                                           |
        |<-- 2. HTTP 402 Payment Required --------------|                                           |
        |       (Network, USDC ASA, payTo, Amount)      |                                           |
        |                                               |                                           |
        |--- 3. Sign gasless payment via Algorand ----->|                                           |
        |--- 4. GET /report with PAYMENT-SIGNATURE ---->|                                           |
        |                                               |--- 5. POST /verify & /settle ------------>|
        |                                               |<-- 6. Settlement confirmed (txid) --------|
        |<-- 7. HTTP 200 OK with Live Data -------------|                                           |
        |       (Header: PAYMENT-RESPONSE txid)         |                                           |
```

### MainNet Configuration

- **Network**: `algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=` (Algorand MainNet)
- **Asset ID**: `31566704` (MainNet USDC, 6 decimals)
- **Facilitator**: `https://facilitator.goplausible.xyz`
- **Competition Tag**: `x402-global-challenge`
- **Merchant `payTo`**: `F232WLNRKX5JDW3PMP6DQDUF4LEXOZE3JDO5O6O6GU7SFQQLMP2HRQDSEA` (Opted into USDC)

### Composite Resource Catalog

| Route                                    | Price (USDC) | Description                                                         | Target Caller                   |
| :--------------------------------------- | :----------- | :------------------------------------------------------------------ | :------------------------------ |
| `GET /v1/wallets/:chain/:address/live`   | **$0.50**    | Live, synchronous fresh wallet snapshot with real-time pricing      | AI Agents, Developers           |
| `GET /v1/portfolio?addresses=...`        | **$1.00**    | Multi-wallet tracking and combined valuation totals                 | Portfolio Trackers, Power Users |
| `GET /v1/portfolio/report?addresses=...` | **$3.00**    | Complete cross-chain consolidated institutional financial statement | Institutional Audits, Web Pro   |

### Agent Discovery Endpoints

- `GET /.well-known/x402`: Publishes machine-readable resource descriptors and Bazaar metadata.
- `GET /llms.txt`: Structured plain-text guidance for LLMs and autonomous agents discovering Growtrack tools.
- `GET /v1/chains`: Lists all active read providers, address formats, and native assets.
- `GET /v1/chains/detect?address=...`: Automatically detects candidate chains for any bare address string.

---

## API Reference

### Free Endpoints (No Authentication / No Payment)

- `GET /v1/wallets/analyze?address=:address&chain=`: Live read with auto chain-detection and real USD pricing.
- `GET /v1/chains`: Enumerate supported blockchain networks.
- `GET /v1/chains/detect?address=:address`: Detect network format for any public address.
- `GET /v1/payments/algorand/params`: Current Algorand suggested parameters for building client payments.
- `GET /health/live` & `GET /health/ready`: System health check endpoints (Database + Redis status).
- `GET /docs`: Interactive Swagger / OpenAPI documentation UI.

### Paid Endpoints (x402 Gated)

- `GET /v1/wallets/:chain/:address/live`: Synchronous fresh snapshot.
- `GET /v1/portfolio?addresses=:addr1,:addr2`: Multi-wallet portfolio totals.
- `GET /v1/portfolio/report?addresses=:addr1,:addr2`: Complete consolidated portfolio report.

---

## Local Development & Setup

### Prerequisites

- **Node.js**: `v20.11.0` or newer
- **Docker Desktop**: For PostgreSQL and Redis containers
- **npm**: `v10` or newer

### Quickstart

1. **Clone the repository**:

   ```bash
   git clone https://github.com/GrowEdge5/growtrack.git
   cd growtrack
   ```

2. **Configure environment**:

   ```bash
   cp .env.example .env
   ```

3. **Start local database & cache**:

   ```bash
   docker compose up -d postgres redis
   ```

4. **Install dependencies & run migrations**:

   ```bash
   npm install
   npm run prisma:generate
   npm run prisma:migrate
   ```

5. **Start services**:
   - In Terminal 1 (Backend API):
     ```bash
     npm run dev
     # Listens at http://localhost:3000
     ```
   - In Terminal 2 (Web Frontend):
     ```bash
     npm run dev:web
     # Listens at http://localhost:3001
     ```
   - In Terminal 3 (Optional Queue Worker):
     ```bash
     npm run dev:worker
     ```

6. Open `http://localhost:3001` in your browser.

---

## Quality Verification & Tests

Growtrack maintains rigorous test coverage with zero mocked shortcuts on production routes:

```bash
# Run full CI pipeline
npm run ci

# Run test suite (86 unit & e2e tests)
npm test

# Run TypeScript checks across root and Next.js web application
npm run typecheck

# Run linter
npm run lint
```

---

## Algorand Global x402 Challenge Checklist

| Requirement                    | Implementation Details                                                                         | Status   |
| :----------------------------- | :--------------------------------------------------------------------------------------------- | :------- |
| **Paid x402 Endpoint**         | Implemented on `/v1/wallets/:chain/:address/live`, `/portfolio`, and `/portfolio/report`       | Verified |
| **HTTP 402 Specifications**    | Full RFC-compliant 402 responses with JSON body and base64 `PAYMENT-REQUIRED` headers          | Verified |
| **GoPlausible Facilitator**    | Verifies and settles atomic transaction groups via `https://facilitator.goplausible.xyz`       | Verified |
| **MainNet USDC Rails**         | Settles in ASA `31566704` on Algorand MainNet (`wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=`) | Verified |
| **Challenge Tag**              | Emits `x402-global-challenge` tag in payment requirements extra payload                        | Verified |
| **Bazaar Discovery**           | Exposes full `resource` descriptor, `extensions.bazaar`, `/.well-known/x402`, and `/llms.txt`  | Verified |
| **MainNet Settlements**        | 12+ real on-chain MainNet settlements completed and permanently verifiable on Lora             | Verified |
| **Non-Custodial Architecture** | Growtrack holds zero private keys and never signs on behalf of users                           | Verified |
| **Public HTTPS Deployment**    | Configured for `https://growtrack.pro` with valid Let's Encrypt TLS certificate                | Ready    |

---

## Security Audit Remediation (2026-09-28)

A full read-only security audit was performed. The following issues were identified and fixed:

### Fixed

| #   | Severity     | Issue                                                                                                                            | Fix                                                                                                                                                                                                                                            |
| --- | ------------ | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **CRITICAL** | x402 defaults to Algorand Testnet — production could accidentally settle on the wrong network                                    | Startup validation now **rejects** testnet `X402_NETWORK` and `X402_ASSET_ID` when `NODE_ENV=production` and `X402_ENABLED=true`. Process fails to boot instead of silently using testnet. Also requires `X402_PUBLIC_BASE_URL` in production. |
| 2   | **HIGH**     | `/metrics` publicly exposes Prometheus process internals (memory, GC, event loop)                                                | `/metrics` route is now only registered when `NODE_ENV !== "production"`. Health checks (`/health/live`, `/health/ready`) remain available in all environments.                                                                                |
| 3   | **HIGH**     | `/docs` Swagger UI publicly exposes full API schema for reconnaissance                                                           | Swagger UI is now only registered when `NODE_ENV !== "production"`. OpenAPI spec generation remains active internally.                                                                                                                         |
| 4   | **HIGH**     | `POST /v1/wallets/:chain/:address/refresh` had only global rate limiting (300/min), enabling queue flooding via address rotation | Added per-IP rate limit of **30 requests/minute** (configurable via `REFRESH_RATE_LIMIT_MAX`). Uses the same `@fastify/rate-limit` mechanism as the existing analyze endpoint. Combined with existing BullMQ SHA-256 job deduplication.        |

### Verification Results

| Check                                     | Result                                        |
| ----------------------------------------- | --------------------------------------------- |
| TypeScript typecheck (backend + frontend) | ✅ Pass                                       |
| ESLint                                    | ✅ Pass                                       |
| Unit + E2E tests (86/86 across 15 suites) | ✅ Pass                                       |
| Backend build (`build:api`)               | ✅ Pass                                       |
| Frontend build (`build:web`)              | ✅ Pass                                       |
| x402 guard tests                          | ✅ Pass (10 unit + 3 e2e)                     |
| Wallet security model                     | ✅ Unchanged — non-custodial, no private keys |

### Requires Railway Action

Verify that the production Railway environment has these variables set correctly:

| Variable               | Required Value                                                    |
| ---------------------- | ----------------------------------------------------------------- |
| `NODE_ENV`             | `production`                                                      |
| `X402_ENABLED`         | `true`                                                            |
| `X402_NETWORK`         | `algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=` (MainNet) |
| `X402_ASSET_ID`        | `31566704` (MainNet USDC)                                         |
| `X402_PAY_TO`          | The merchant's funded Algorand address (opted into USDC)          |
| `X402_PUBLIC_BASE_URL` | `https://growtrack.pro`                                           |

> **The application will now refuse to start** if `NODE_ENV=production` + `X402_ENABLED=true` with testnet defaults. This is intentional fail-closed behavior.

---

## License

This project is licensed for the Algorand Global x402 Challenge.
