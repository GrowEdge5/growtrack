# Growtrack — Hackathon Task List

> Temporary file — project fully complete hone ke baad DELETE kar dena hai.
> Track karta hai: Algorand Global x402 Challenge ke liye jo bana hai + jo bacha hai.

## 🎯 SPRINT PLAN — Sept 20-22 tak LIVE (compressed)

**Goal:** Sep 20-22 tak poora product (multichain tracker + frontend + paid report) live. Uske baad user marketing pe focus karega.

| Din                    | Kaam                                                                   | Deliverable               |
| ---------------------- | ---------------------------------------------------------------------- | ------------------------- |
| **Sep 16 (Day 1)**     | A1 address auto-detect + A2 Solana provider + tests                    | Solana reads working      |
| **Sep 17 (Day 2)**     | A3 BTC provider + A4 seed + A5 live verify + Railway deploy            | 4 chains API pe live      |
| **Sep 18 (Day 3)**     | B1 frontend setup + B2 portfolio view (free tier)                      | Tracker UI chal raha      |
| **Sep 19 (Day 4)**     | C1 paid report endpoint + B3-B4 free/paid split + browser x402 payment | Paid report flow complete |
| **Sep 20 (Day 5)**     | B5 polish + B6 landing + B7 full deploy                                | 🚀 **PRODUCT LIVE**       |
| **Sep 21-22 (buffer)** | Bugs, edge cases, README/screenshots, demo video basics                | Submission-ready state    |

**Scope cuts (deadline ke liye — baad mein add honge):**

- Koi login/account nahi — sirf localStorage (already planned)
- Transaction history nahi (transactions/positions/signals extension points hi rahenge)
- Curated token lists hi (exhaustive discovery nahi) — documented limitation
- Report = clean printable HTML view (fancy PDF generation baad mein)
- Demo video polish marketing phase mein (Sep 22 ke baad)

**⚠️ Highest-risk item:** B4 (browser se x402 payment — Pera wallet integration). Fallback ready: report endpoint API/MCP se bhi kaam karta hai (agents ke liye), browser flow deadline ke baad polish ho sakta hai. **Isko Day 4 ki subah pehle attack karna.**

## 📅 Deadlines (Algorand Global x402 Challenge)

| Date             | Kya karna hai                                                                                      |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| **Sep 29, 2026** | Project submission form bharna (form inbox mein aayega — `sharmadj4231@gmail.com` pe watch rakhna) |
| Oct 8, 2026      | Shortlist announce (top 50 leaderboard + submitted projects)                                       |
| **Nov 2, 2026**  | Final Presentation — Devcon 8 India (virtual, top 10 finalists)                                    |
| Nov 12, 2026     | Winners                                                                                            |

**Judging criteria (evenly weighted):** (a) Volume — real USDC activity, (b) Use case quality — x402 core flow mein, (c) Sustained potential, (d) Innovation.

**⚠️ RULES WARNING:** "Repeated self-payments / wash transactions / artificial volume" penalized hain. Testing ke liye kuch self-payments theek hain, lekin leaderboard volume **sirf real users** se aani chahiye.

---

## ✅ DONE — Foundation (taareekh ke saath)

- [x] Phase 1 — Scaffold + local infrastructure (Docker, Postgres, Redis, Fastify, BullMQ worker) — 2026-08-18
- [x] EVM read chain — native balance + ERC-20 holdings (Multicall3) + DeFiLlama USD pricing + `totalValueUsd` — 2026-08-22
- [x] Algorand read chain — ALGO + curated ASA holdings + USD pricing — 2026-08-23
- [x] x402 payment core — `402 → verify → settle` guard, payment-requirements builder, GoPlausible facilitator HTTP client, unit + e2e tests (mocked facilitator) — 2026-08-31
- [x] x402 LIVE on testnet — real 0.001 USDC settle (txid `IFDRIUXY…6LOA`) — 2026-09-14
- [x] x402 LIVE on mainnet — real 0.001 USDC settle (txid `ARTGFLQK…VFZA`) — 2026-09-15
- [x] Phase 5 — Public HTTPS deploy — Railway (API + worker + Postgres + Redis), `https://api-production-7c303.up.railway.app` — 2026-09-15
- [x] Public URL pe live mainnet payments — 18+ settles, Algorand AND Ethereum dono routes, sab `200` + live snapshot — 2026-09-15
- [x] Landing page (`GET /`) og tags ke saath + facilitator site scrape success — 2026-09-15
- [x] Bazaar cataloging data spec-perfect — resource descriptor + `extensions.bazaar` (info + schema + `queryParams`) accept + payment payload dono pe — 2026-09-15
- [x] CI green on GitHub Actions (`gh` CLI set up, GrowEdge5 auth) — 2026-09-15

### 🔍 Watch item — Bazaar public directory listing

Merchant (`payTo F232…DSEA`) facilitator analytics mein fully tracked hai: `challenge: true`, site scraped, 4+ resources with URLs/prices, 100% success rate. Public Bazaar directory (`/discovery/resources`) mein listing **facilitator-side merchant promotion** pe pending hai (dusre merchants ko bhi ~2 din lage the — sitelenz: merchant 09-07, catalog 09-09).

- **Check karne ka tarika:** `https://facilitator.goplausible.xyz/discovery/resources?search=growtrack`
- Agar 2-3 din mein nahi aaya → GoPlausible Open Box form (https://forms.gle/tByShNbBSKbEaQv37) pe follow-up: "merchant F232…DSEA ka bazaar flag kab promote hoga?" (pehla reply aa chuka tha — generic)
- Listed hote hi README + submission mein link add karna

---

## 🚧 PHASE A — Backend: Solana + BTC chains (target: 3-4 din)

Vision: koi bhi user apna **SOL / BTC / EVM / ALGO** address dale → on-chain portfolio track ho.

- [ ] **A1. Address auto-detect utility** — format se chain pehchanna (base58/phrases, `0x…` hex, bech32 `bc1…`, Algorand base32 checksum). Ek shared helper jo frontend + API dono use karein
- [ ] **A2. Solana read provider** (`src/modules/chains/infrastructure/solana/`)
  - Free public RPC (`https://api.mainnet-beta.solana.com` ya fallback) se SOL native balance
  - SPL token accounts ( `getTokenAccountsByOwner`) — curated list (USDC, USDT, JUP, BONK…) + decimals handling
  - DeFiLlama pricing — `coingecko:solana` + `solana:<mint>` chain map entry
  - Provider port interface implement (`nativeDecimals` = 9 SOL ke liye)
  - Unit tests (mocked RPC) — algorand-provider.test.ts pattern follow karo
- [ ] **A3. Bitcoin read provider** (`src/modules/chains/infrastructure/bitcoin/`)
  - mempool.space ya blockstream.info API se address UTXOs → total BTC balance
  - Batching/limits ka dhyan (koi API key nahi — rate limits respect karo)
  - DeFiLlama pricing — `coingecko:bitcoin`
  - `nativeDecimals` = 8
  - Unit tests (mocked API)
- [ ] **A4. Chain registry seed update** — Solana (id 3) + Bitcoin (id 4) rows `prisma/seed.ts` mein
- [ ] **A5. Live verification** — public SOL + BTC addresses se real snapshots, `status: complete`, totalValueUsd sahi
- [ ] **A6. npm run ci green + deploy Railway pe**

Docs help: `docs/adding-a-chain.md` (pattern already documented hai).

---

## 🎨 PHASE B — Frontend: DeBank-style tracker (target: 5-6 din)

Vision: **simple, clean, dark UI** — CoinStats jaisa powerful, DeBank jaisa minimal. Sirf kaam ki cheezein, koi mess nahi.

- [ ] **B1. Setup** — Next.js (App Router) + Tailwind, `frontend/` folder mein (same repo), Railway pe alag service ya Vercel
- [ ] **B2. Core screen — Portfolio view**
  - Address input (paste karo) → auto-detect chain → live snapshot fetch (free tier: cached GET)
  - Multiple addresses support (session/local storage — koi login nahi!)
  - Holdings list: token icon/symbol, amount, USD value, per-chain badge
  - **Total portfolio value** bada sa number + per-chain breakdown card
- [ ] **B3. Free vs Paid split**
  - FREE: live portfolio view (cached snapshots — existing free `GET /v1/wallets/:chain/:address`)
  - PAID: **"Full Portfolio Report"** button → x402 payment (0.001 USDC) → detailed report: allocation %, chain-wise breakdown, per-holding detail, printable/PDF-style view
- [ ] **B4. x402 payment integration (browser se)** — GoPlausible UC pattern ya Pera Wallet connect; payment flow: `402 challenge → wallet sign → verify+settle → report render`
- [ ] **B5. Polish** — responsive (mobile-first, kyunki Devcon India audience mobile pe dekhega), loading states, empty states, error handling (invalid address, chain down)
- [ ] **B6. Landing page upgrade** — abhi wali API landing ko product landing banao (hero: "Track your entire multichain portfolio — EVM, Solana, BTC, Algorand")
- [ ] **B7. Deploy** — public URL (Railway/Vercel), CORS config API pe

---

## 🧾 PHASE C — Paid Report endpoint (Phase B ke saath parallel ho sakta hai)

- [ ] **C1. `GET /v1/portfolio/report` paid endpoint** — multi-address query (ya session) → aggregated full report (sab chains ka snapshot + totals + allocation) — x402 guard ke piche (0.001 USDC)
- [ ] **C2. Report response shape** — JSON (frontend render karega) + optional HTML/printable
- [ ] **C3. Bazaar extensions update** — naye resource URL + description report endpoint ke liye
- [ ] **C4. E2E test** — unpaid → 402, paid → 200 + report

---

## 📤 PHASE D — Submission + real usage (Sep 29 se pehle shuru, Oct tak continue)

- [ ] **D1. Demo video** (2-3 min) — address paste → portfolio view → paid report flow → txid explorer link (script pehle likh lena, screen recording clean)
- [ ] **D2. README final polish** — product screenshots, architecture diagram, demo GIF, sab txid proofs
- [ ] **D3. Submission form bharo** (inbox mein aayega) — **Sep 29 deadline, MISS MAT KARNA**
- [ ] **D4. Real usage drive** (yahi leaderboard volume banayega):
  - Algorand Discord (#x402 channels), Twitter/X threads, Devcon India communities
  - Doston se test karwao — **unke wallets se** pay karwao (self-payment nahi!)
  - Product Hunt / Reddit (r/algorand, r/CryptoCurrency) launch post
- [ ] **D5. Bazaar listing check** (watch item upar) — aaye to submission mein mention

---

## 🧰 Reference — abhi ka state

- **API (Railway):** `https://api-production-7c303.up.railway.app` — health ✓, paid `/live` ✓ (dono chains)
- **Repo:** `github.com/GrowEdge5/growtrack` — CI green, `gh` CLI authed
- **Payer wallets (testing):** `JJNP…TB4` (growtrack-mainnet-payer, ~0.43 USDC), `6T4E…ZRGI` (uc-test-payer, 0.05 USDC) — keys `~/.algorand-mcp/wallet.db` mein
- **payTo (merchant):** `F232…DSEA` — facilitator analytics mein `challenge: true`
- **Reading material:** `docs/adding-a-chain.md`, `docs/architecture.md`, `docs/provider-strategy.md`
