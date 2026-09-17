// SPL token metadata from Jupiter's public token list.
//
// Solana has no on-chain symbol/name for a mint, and the RPC only reports a mint
// address plus decimals. Rather than a hand-maintained curated list, the verified
// Jupiter list is fetched once per TTL and cached in memory — which is what makes
// Solana the one chain Growtrack can report WITHOUT a curated subset, so a user's
// long-tail holdings actually appear instead of silently vanishing.
//
// Enrichment is best-effort: when the list is unavailable the provider falls back
// to the mint address as the symbol, which is honest and never invented.

export interface SolanaTokenMetadata {
  symbol: string;
  name: string;
}

interface JupiterToken {
  id?: unknown;
  symbol?: unknown;
  name?: unknown;
}

const DEFAULT_TOKEN_LIST_URL = "https://lite-api.jup.ag/tokens/v2/tag?query=verified";
const DEFAULT_TTL_MS = 6 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8_000;

export interface SolanaTokenMetadataOptions {
  tokenListUrl?: string;
  ttlMs?: number;
  logger?: { warn: (message: string) => void };
}

export interface SolanaTokenLookup {
  // Metadata for the mints we recognize. A mint absent here is unverified.
  metadata: ReadonlyMap<string, SolanaTokenMetadata>;
  // Whether the token list was actually available. When it was not, the caller must
  // NOT treat a missing mint as "unverified" — absence of the list is not evidence
  // about the token, and dropping holdings on that basis would empty a real
  // portfolio during a metadata outage.
  listAvailable: boolean;
}

export class SolanaTokenMetadataSource {
  private readonly tokenListUrl: string;
  private readonly ttlMs: number;
  private readonly logger: { warn: (message: string) => void };

  private cache: ReadonlyMap<string, SolanaTokenMetadata> | undefined;
  private cachedAt = 0;

  public constructor(options: SolanaTokenMetadataOptions = {}) {
    this.tokenListUrl = options.tokenListUrl ?? DEFAULT_TOKEN_LIST_URL;
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    this.logger = options.logger ?? { warn: () => undefined };
  }

  // Returns metadata for the given mints. Unknown mints are simply absent from the
  // result rather than given a guessed symbol.
  public async lookup(mints: readonly string[]): Promise<SolanaTokenLookup> {
    const list = await this.load();
    const metadata = new Map<string, SolanaTokenMetadata>();
    for (const mint of mints) {
      const entry = list.get(mint);
      if (entry !== undefined) {
        metadata.set(mint, entry);
      }
    }
    return { metadata, listAvailable: list.size > 0 };
  }

  private async load(): Promise<ReadonlyMap<string, SolanaTokenMetadata>> {
    const now = Date.now();
    if (this.cache !== undefined && now - this.cachedAt < this.ttlMs) {
      return this.cache;
    }

    const fetched = await this.fetch();
    if (fetched === undefined) {
      // Keep serving a stale list rather than dropping metadata on a transient
      // failure; only an empty first fetch leaves the cache unset.
      return this.cache ?? new Map();
    }

    this.cache = fetched;
    this.cachedAt = now;
    return fetched;
  }

  private async fetch(): Promise<ReadonlyMap<string, SolanaTokenMetadata> | undefined> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(this.tokenListUrl, {
        signal: controller.signal,
        headers: { accept: "application/json" }
      });
      if (!response.ok) {
        this.logger.warn(`Solana token list responded ${response.status}`);
        return undefined;
      }
      const body: unknown = await response.json();
      if (!Array.isArray(body)) {
        this.logger.warn("Solana token list was not an array");
        return undefined;
      }

      const map = new Map<string, SolanaTokenMetadata>();
      for (const entry of body as JupiterToken[]) {
        if (typeof entry.id !== "string" || typeof entry.symbol !== "string") {
          continue;
        }
        map.set(entry.id, {
          symbol: entry.symbol,
          name: typeof entry.name === "string" ? entry.name : entry.symbol
        });
      }
      return map;
    } catch (error) {
      this.logger.warn(`Solana token list request failed: ${String(error)}`);
      return undefined;
    } finally {
      clearTimeout(timer);
    }
  }
}
