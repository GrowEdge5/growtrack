# Growtrack — Hackathon Task List

> Temporary file — project fully complete hone ke baad DELETE kar dena hai.
> Track karta hai: Algorand Global x402 Challenge ke liye jo bana hai + jo bacha hai.
> Detail wala plan `docs/roadmap.md` mein hai (usme market data aur 3 corrections hain).

## 🌐 DOMAIN — `growtrack.pro` (2026-09-17)

- [x] **Domain kharida** — `growtrack.pro`, Railway se (Railway Domains). Registered 2026-09-17 06:04 UTC,
      expiry 2027-09-17. NS = name.com (Railway ka registrar backend), registry status
      `client transfer prohibited` + `add period` (normal, ICANN ka 60-day transfer lock).
- [x] **Custom domain attach kiya** service `api` pe (domain ID `16c3e3b4-99cd-4ea8-8c20-496291e74110`).
- [x] **DNS records auto-configure ho gaye** — ye important discovery hai: Railway-managed domain hone ki
      wajah se CNAME + TXT khud ban gaye, manually add karne ki zarurat nahi padi. Public resolvers se
      verify kiya: apex A → `69.46.46.73` (Railway edge), `_railway-verify` TXT → Railway ka exact token.
- [x] **Env vars set kiye**: `X402_PUBLIC_BASE_URL=https://growtrack.pro`,
      `CORS_ORIGIN=https://growtrack.pro,https://api-production-7c303.up.railway.app,http://localhost:3000`
- [x] **Naya code deploy hua** `railway up` se — live verify: `/live` → 402 `10000` ($0.01) aur
      `resource.url` = `https://growtrack.pro/...`, `/v1/portfolio/report` → 402 `50000` ($0.05),
      body mein `extensions` present (pehle gayab the), `/v1/chains/detect` Solana address resolve
      kar raha hai, `/llms.txt` + `/.well-known/x402` → 200.
- [x] **Domain VERIFIED aur LIVE** — Railway ne ownership check complete kar liya (`Verified: yes`,
      certificate `VALID`). Final verify (public DNS se, kyunki is machine ka local resolver `growtrack.pro`
      ko resolve nahi karta): - `https://growtrack.pro/` → 200, `/health/ready` → 200, `/v1/chains` → 200,
      `/llms.txt` → 200, `/.well-known/x402` → 200, `/logo.svg` → 200 - TLS cert: `CN=growtrack.pro`, Let's Encrypt, valid 17 Sep – 16 Dec 2026, `ssl_verify_result=0` - `/live` → 402 `10000` ($0.01) · `/v1/portfolio` → 402 `20000` ($0.02) ·
      `/v1/portfolio/report` → 402 `50000` ($0.05) — teeno ka `resource.url` `https://growtrack.pro/...` - `/v1/portfolio` ka discovery input contract live check: `{"type":"http","method":"GET","queryParams":{"addresses":"..."}}`
- [ ] **Optional cleanup (commit ke baad karo)** — generated `*.up.railway.app` domain hata do, taaki ek
      `payTo` sirf ek hi root domain pe reachable ho (guide: ek merchant = ek root domain). Iske saath
      `X402_RESOURCE_URL` env var bhi hata dena. **Commit se pehle mat karo** — agar GitHub se purana code
      deploy ho jaye to wo `X402_RESOURCE_URL` pe depend karta hai.

### ⚠️ Deploy source ka dhyan rakho

Naya code `railway up` se deploy hua hai, matlab **local working tree se** — GitHub se nahi. Isliye:
**abhi git mein commit + push karna zaroori hai.** Warna agli baar jab GitHub pe koi push hoga
(auto-deploy on), Railway purana commit deploy kar dega aur saare aaj ke changes chup-chaap revert
ho jayenge (composite pricing, Solana/BTC, naye routes — sab).

## 🚨 AAJ HI KARNA — blocking (code nahi, account/deploy kaam hai)

- [ ] **Repo ko PUBLIC karo** — `github.com/GrowEdge5/growtrack` abhi PRIVATE hai, aur official guide
      ka naya qualification step isse explicitly maangta hai: _"Submit your Github repo to Electric
      Capital... Make sure your repository is publicly accessible and contains the relevant Algorand
      code."_ Repo private = qualification fail. (Python: settings → change visibility)
- [ ] **Aaj ke changes commit + push karo** — naya code `railway up` se live hai par git mein nahi;
      GitHub pe push hote hi Railway purana commit deploy kar dega (neeche warning dekho)
- [ ] **Electric Capital pe repo submit karo** (guide ka step 7 — TASKS mein pehle ye missing tha)
- [ ] **Submission form bharo** — window abhi open hai, deadline **29 Sept** (rules: 11:45pm ET;
      guide "through September 30th" kehta hai). Safe date 29 Sept maano.
- [x] ~~Railway pe env vars update karo + redeploy~~ — **DONE** (neeche "Environment changes" dekho)
- [ ] Repo description + topics set karo (khali hai abhi)

## 🔧 Environment changes (Railway pe already applied)

| Variable                                                       | Status                                                                                                                                                                                             |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `X402_PUBLIC_BASE_URL`                                         | ✅ **SET** = `https://growtrack.pro` — live 402 body isi se `https://growtrack.pro/...` resource URLs de raha hai                                                                                  |
| `X402_RESOURCE_URL`                                            | ⏳ Purana value abhi bhi set hai — jaan-bujh ke rakha, taaki agar purana code wapas deploy ho to cataloging data na toote. Naya code `X402_PUBLIC_BASE_URL` ko prefer karta hai. Ab hata sakte ho. |
| `X402_RESOURCE_DESCRIPTION`                                    | ⏳ Ab use nahi hota (naye code mein ye env var hi nahi hai; descriptions resource definitions mein hain). Hata sakte ho.                                                                           |
| `X402_PRICE_ATOMIC`                                            | ➖ Railway pe kabhi set nahi tha, koi kaam nahi                                                                                                                                                    |
| `CORS_ORIGIN`                                                  | ✅ **SET** = `https://growtrack.pro,https://api-production-7c303.up.railway.app,http://localhost:3000`                                                                                             |
| `SOLANA_RPC_URL` / `SOLANA_TOKEN_LIST_URL` / `BITCOIN_API_URL` | ➖ Set nahi kiye — code ke defaults sahi hain aur live verify ho chuke hain                                                                                                                        |

## ✅ DONE — 2026-09-17 (aaj ka kaam)

- [x] **Solana read chain** (id 3) — `getTokenAccountsByOwner` se **saare** SPL tokens (koi curated
      list nahi) + Jupiter verified list se names. Live verified: ek real wallet pe 971 mint accounts
      mile, jinme 862 unverified airdrop the — wo exclude hote hain aur count `signals` mein report
      hota hai (silently trim nahi).
- [x] **Bitcoin read chain** (id 4) — Esplora REST (blockstream.info) se UTXO balance, confirmed +
      mempool dono. Live verified. `mempool.space` is machine se unreachable tha, isliye blockstream
      primary hai.
- [x] **Address auto-detect** — `detectAddress()`. Solana vs Bitcoin legacy ka base58 ambiguity
      **decoded byte length** se resolve hota hai (32 bytes = Solana, 25 = BTC legacy), heuristic guess
      se nahi. 6 unit tests.
- [x] **Composite Entry** — ab 3 paid endpoints, ek hi `payTo`, alag-alag price aur alag Bazaar listing
      (`src/modules/payments/domain/paid-resource.ts`):
      `/v1/wallets/:chain/:address/live` **$0.01** · `/v1/portfolio` **$0.02** ·
      `/v1/portfolio/report` **$0.05**
- [x] **Price correction** — $0.001 → $0.01–$0.05 (live Bazaar catalog data ke against calibrate kiya)
- [x] **Multichain aggregation** (`GetPortfolioReport`) — multi-address, multichain totals,
      per-chain/per-wallet/per-holding breakdown, allocation %, aur unpriced positions ki alag list.
      Bounded concurrency (keyless endpoints rate-limited hain), per-target errors collect hote hain
      (ek kharab address baaki ko void nahi karta).
- [x] **402 body bug fix** — zod response schema undeclared fields strip kar raha tha, isliye JSON body
      se `extensions` aur `accepts[].resource` gayab the (header mein the). Body aur header ab match
      karte hain; e2e test isko assert karta hai.
- [x] **Phase 0 metadata** — landing page upgrade (4 chains, price table, og/twitter tags, logo),
      `/llms.txt`, `/.well-known/x402`, `/logo.svg`, `/favicon.ico`
- [x] **Free discovery routes** — `GET /v1/chains`, `GET /v1/chains/detect?address=`
- [x] **CORS** single origin → comma-separated list
- [x] **Tests 34 → 69** (13 files), `npm run ci` green (format + lint + typecheck + test + build)

---

## ⏭️ NEXT — jo bacha hai

### Phase B2 — Frontend (sabse bada bacha hua kaam)

- [ ] Next.js (App Router) + Tailwind, `frontend/` folder same repo mein
- [ ] **Same root domain** — SPA `/` pe, API `/v1/*` pe proxy. Vercel pe alag domain **nahi**
      (guide: "Each merchant account should be connected to only one root domain")
- [ ] Address paste → auto-detect → portfolio; multi-address localStorage mein, koi login nahi
- [ ] Bada total number + per-chain breakdown + holdings list
- [ ] Paid report flow (Pera wallet / x402 browser pattern) → report render
- [ ] Mobile-first (Devcon India audience phone pe dekhega), loading/empty/error states

### Phase B3 — Domain + Bazaar polish

- [x] Custom root domain kharido + attach karo — **DONE**: `growtrack.pro` (Railway se)
- [x] `X402_PUBLIC_BASE_URL` set + deploy + 402 body verify — **DONE** (live body `https://growtrack.pro/...` dikha raha hai)
- [ ] Merchant NFD (Algorand name service) `payTo` ke liye, agar available ho
- [ ] `og:image` ko 1200×630 **PNG** banao (abhi SVG hai — kuch social crawlers SVG skip karte hain)
- [ ] Bazaar resource descriptions ko dobara padho: catalog mein jeetne wale entries 300+ chars likhte
      hain (kya milta hai, kis data se, kyun trustworthy) — Growtrack ki descriptions already aisi hain,
      par agents ke liye specific rakho

### Phase C — Volume (yahi leaderboard banayega)

- [ ] Algorand Discord (#x402), X/Twitter threads, r/algorand, Devcon India communities
- [ ] Doston se **unke apne wallets** se pay karwao — rules self-payments/wash transactions pe
      penalty lagate hain aur admin inauthentic activity exclude kar sakta hai
- [ ] Leaderboard unannounced October window pe measure hota hai — Sep 29 ke baad bhi chalate raho

### Phase D — Submission material

- [ ] Demo video (2-3 min): address paste → portfolio → paid report → explorer txid
- [ ] README screenshots + architecture diagram refresh
- [ ] Bazaar listing check: `https://facilitator.goplausible.xyz/discovery/resources?search=growtrack`

---

## 📅 Deadlines

| Date             | Kya                                                                              |
| ---------------- | -------------------------------------------------------------------------------- |
| **Sep 29, 2026** | Project submission form (guide kehta hai "through Sept 30") — **MISS MAT KARNA** |
| Oct 8, 2026      | Shortlist (top 50 leaderboard)                                                   |
| Nov 2, 2026      | Final Presentation — Devcon 8 India (virtual)                                    |
| Nov 12, 2026     | Winners                                                                          |

**Judging (evenly weighted):** Volume · Use case quality · Technical execution · Sustained
potential · Innovation. Volume ke liye market calibration: top merchant ~$5.2K, **rank 20 ~$26**,
rank 50 ~$1 (2026-09-17 ka Bazaar catalog, 2,019 resources / 147 merchants).

---

## 📊 Market intel (2026-09-17, live Bazaar catalog se)

- **2,019 resources, 147 merchant domains.** Growtrack abhi catalog mein **nahi** hai (verify kiya).
- Price bands: `$0.01` ×11, `$0.02` ×8, `$0.50` ×6, `$0.03` ×5, `$0.05` ×5 — poore catalog mein
  sirf **2 endpoints $0.001** pe the. Isliye apna price badla.
- `agenthub` (rank 4, ~$1.4K, 19 endpoints, ek domain) wahi composite pattern use kar raha hai jo
  humne adopt kiya.
- `proofmint.app` rank 3 pe hai sirf **12 settles** se (~$4.2K) — matlab high-value atomic actions
  bhi kaam karte hain, sirf transaction-count grinding nahi.

---

## 🧰 Reference

- **API (Railway):** `https://growtrack.pro` (custom domain, verification pending) — abhi bhi reachable at
  `https://api-production-7c303.up.railway.app` — 2026-09-17 ko live check kiya:
  `/health/ready` → 200, unpaid `/live` → 402
- **Repo:** `github.com/GrowEdge5/growtrack` — CI green, **PRIVATE (fix karna hai)**
- **Payer wallets:** `JJNP…TB4` (growtrack-mainnet-payer), `6T4E…ZRGI` (uc-test-payer) — keys
  `~/.algorand-mcp/wallet.db` mein
- **payTo (merchant):** `F232…DSEA`
- **Docs:** `docs/roadmap.md` (plan + market data), `docs/adding-a-chain.md` (ab 6 steps),
  `docs/architecture.md`, `docs/provider-strategy.md`
