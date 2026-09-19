import type { ChainProviderRegistry } from "../../chains/application/ports/chain-data-provider.js";
import { detectAddress } from "../../chains/domain/address-detection.js";
import { GrowtrackError } from "../../../shared/domain/errors.js";
import type { WalletSnapshot } from "../domain/wallet-snapshot.js";
import type { GetWalletIntelligence } from "./get-wallet-intelligence.js";
import type { RefreshWalletIntelligence } from "./refresh-wallet-intelligence.js";

// Why an analyzer result carries its provenance: a caller must be able to tell a
// cached read from a fresh upstream read, because the two have different freshness
// guarantees and different upstream cost.
export type AnalyzeSource = "cache" | "database" | "live";

export interface AnalyzeResult {
  snapshot: WalletSnapshot;
  source: AnalyzeSource;
  stale: boolean;
  // Echoed so the caller can show which chain the address was routed to without
  // re-running detection client-side.
  chain: string;
}

// The free/guest read path: a pasted address with no chain hint, no account and no
// payment. Unlike GetWalletIntelligence — which only reads what is already cached
// or persisted and therefore 404s for a wallet nobody has looked at yet — this
// falls through to a live upstream read on a miss. That fall-through is the whole
// point: a first-time search of an arbitrary address has to return real data.
//
// Read-only and idempotent. It reuses the same refresh use case the paid route
// calls, so a free read and a paid read can never disagree about a wallet's value.
export class AnalyzeWallet {
  public constructor(
    private readonly providers: ChainProviderRegistry,
    private readonly getWalletIntelligence: GetWalletIntelligence,
    private readonly refreshWalletIntelligence: RefreshWalletIntelligence
  ) {}

  public async execute(address: string, requestedChain?: string): Promise<AnalyzeResult> {
    const chain = this.resolveChain(address, requestedChain);
    const trimmed = address.trim();

    // Serve a fresh-enough snapshot when one exists, so a repeated search does not
    // re-hit keyless public endpoints.
    try {
      const existing = await this.getWalletIntelligence.execute(chain, trimmed);
      if (!existing.stale) {
        return {
          snapshot: existing.snapshot,
          source: existing.source,
          stale: false,
          chain
        };
      }
    } catch (error) {
      // A missing wallet is the expected path to a live read; anything else (an
      // invalid address, an unsupported chain) is a real failure and must surface.
      if (!(error instanceof GrowtrackError) || error.code !== "WALLET_NOT_FOUND") {
        throw error;
      }
    }

    const snapshot = await this.refreshWalletIntelligence.execute(chain, trimmed);
    return { snapshot, source: "live", stale: false, chain };
  }

  // Routes a bare address by syntax, exactly as the portfolio report does, so a
  // user can paste an address without knowing which chain it belongs to.
  private resolveChain(address: string, requestedChain?: string): string {
    const knownSlugs = this.providers.list().map((provider) => provider.chain.slug);
    const explicit = requestedChain?.trim().toLowerCase();

    if (explicit !== undefined && explicit.length > 0) {
      if (!knownSlugs.includes(explicit)) {
        throw new UnsupportedChainForAddressError(explicit, knownSlugs);
      }
      return explicit;
    }

    const detection = detectAddress(address, knownSlugs);
    if (detection.candidateChains.length === 0) {
      throw new UnrecognizedAddressError(address, knownSlugs);
    }
    if (detection.candidateChains.length > 1) {
      throw new AmbiguousAddressError(address, detection.candidateChains);
    }

    return detection.candidateChains[0] as string;
  }
}

// The three routing failures a caller can fix by passing an explicit chain, so they
// are shaped as 400s naming the supported set rather than as bare errors.
export class UnsupportedChainForAddressError extends GrowtrackError {
  public constructor(chain: string, supported: readonly string[]) {
    super(
      `Chain '${chain}' is not supported. Supported chains: ${supported.join(", ")}`,
      "UNSUPPORTED_CHAIN",
      400
    );
  }
}

export class UnrecognizedAddressError extends GrowtrackError {
  public constructor(address: string, supported: readonly string[]) {
    super(
      `'${truncate(address)}' is not a recognizable address for any chain this deployment reads ` +
        `(${supported.join(", ")}). Pass ?chain=<slug> to force a chain.`,
      "UNRECOGNIZED_ADDRESS",
      400
    );
  }
}

export class AmbiguousAddressError extends GrowtrackError {
  public constructor(address: string, candidates: readonly string[]) {
    super(
      `'${truncate(address)}' matches more than one supported chain (${candidates.join(", ")}); ` +
        `pass ?chain=<slug> to disambiguate.`,
      "AMBIGUOUS_ADDRESS",
      400
    );
  }
}

// Addresses can be long; an error message is not the place to echo a 58-character
// payload back in full.
function truncate(address: string): string {
  const trimmed = address.trim();
  return trimmed.length <= 16 ? trimmed : `${trimmed.slice(0, 8)}…${trimmed.slice(-6)}`;
}
