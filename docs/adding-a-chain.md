# Adding a Chain

Adding a chain touches **six** places. Four of them are easy to miss, and missing any one
fails quietly rather than loudly — a chain that reads perfectly but prices at nothing, or one
that never appears in the discovery surfaces.

1. **Chain id** — add a constant to `src/modules/chains/infrastructure/chain-ids.ts`. These ids
   are Growtrack-internal and must stay unique across all chains and must never collide with an
   EIP-155 chainId (`1` = Ethereum, `2` = Algorand, `3` = Solana, `4` = Bitcoin).
2. **Provider** — a class in `src/modules/chains/infrastructure/<chain>/` implementing
   `ChainDataProvider`: `chain`, `nativeDecimals`, `normalizeAddress`, `fetchWalletData`. Reuse the
   shared address-format checks in `src/modules/chains/domain/address-detection.ts` so validation
   and paste-routing agree instead of drifting. Amounts are carried as decimal strings; a native
   balance that can exceed `Number.MAX_SAFE_INTEGER` must never be a JS number.
3. **DeFiLlama price map** — add the chain to `LLAMA_CHAINS` in
   `src/modules/wallets/infrastructure/pricing/defillama-price-provider.ts`. **A chain missing here
   silently returns no prices**, so every snapshot comes back `partial` with no `totalValueUsd` and
   nothing in the logs says why.
4. **Prisma seed** — add the chain row in `prisma/seed.ts`, matching the id from step 1.
5. **Container wiring** — construct the provider and add it to the array passed to
   `DefaultChainProviderRegistry` in `src/app/build-container.ts`. This single line also decides
   the contract defaults and the chain vocabulary advertised in the Bazaar discovery schemas, which
   are derived from the registry — so a chain that is wired but not priced (step 3) still shows up
   as "supported" while returning nothing.
6. **Environment** — add any endpoint/URL variables to `src/config/env.ts` with a working default,
   and document them in `.env.example`.

Then:

7. **Tests** — address accept/reject, holdings mapping, and a failure path (an upstream error must
   throw, not be reported as a zero balance).
8. **Verify live** — read a real address on the chain and confirm `nativeBalance`, per-holding
   `valueUsd`, and a non-empty `totalValueUsd`. Unit tests cannot catch a wrong DeFiLlama platform
   slug or a dead public endpoint.

## Optional: token coverage

Coverage is a per-chain decision, and the honest options differ:

- **Complete by construction** — Bitcoin (a UTXO sum is the whole balance), Solana (enumerate all
  token accounts, then name them from a metadata list; exclude unverified mints and report the
  count rather than trimming silently).
- **Needs an indexer to be complete** — an account-model chain whose RPC only returns opted-in
  assets or a curated list. Report the curated subset and document the limit; never imply
  exhaustiveness.

## Extending the read layer

`ProviderWalletData` already carries `transactions`, `positions` and `signals`. A new provider may
leave them empty — that is an unimplemented extension point, not fabricated data — or populate
them without any change to the ports, the HTTP schemas, the cache or the persistence layer, all of
which are chain-generic.

Provider capabilities may be partial. Mark the snapshot `partial` and expose source/freshness
metadata when a provider cannot supply every intelligence category.
