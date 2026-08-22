import type {
  PriceProvider,
  PriceQuote,
  PriceRequest
} from "../../application/ports/price-provider.js";

// Maps an EVM chainId to DeFiLlama's chain slug and the coin key it uses for the
// chain's native currency. Only chains Growtrack actually reads are listed; any
// other chain yields an empty quote rather than guessing.
interface LlamaChain {
  slug: string;
  nativeCoinKey: string;
}

const LLAMA_CHAINS: Readonly<Record<number, LlamaChain>> = {
  1: { slug: "ethereum", nativeCoinKey: "coingecko:ethereum" }
};

// DeFiLlama attaches a 0..1 confidence to each price. Anything below this is
// treated as unpriced rather than surfaced as a trustworthy value.
const MIN_CONFIDENCE = 0.5;

export interface DefiLlamaPriceProviderOptions {
  baseUrl: string;
  timeoutMs: number;
  // Optional sink for degradation warnings; defaults to silent.
  logger?: { warn: (message: string) => void };
}

// Read-only USD price lookup backed by the keyless DeFiLlama coins API.
//
// A single request prices the native currency and every token together. Every
// network path degrades gracefully: on any failure (timeout, non-2xx, malformed
// body, low confidence) the affected price is simply omitted, so a refresh still
// produces a saveable snapshot — just without those USD values. Prices are never
// invented or zero-filled.
export class DefiLlamaPriceProvider implements PriceProvider {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly logger: { warn: (message: string) => void };

  public constructor(options: DefiLlamaPriceProviderOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.timeoutMs = options.timeoutMs;
    this.logger = options.logger ?? { warn: () => undefined };
  }

  public async getUsdPrices(request: PriceRequest): Promise<PriceQuote> {
    const chain = LLAMA_CHAINS[request.chainId];
    if (!chain) {
      return { tokenUsd: {} };
    }

    const tokenKeys = request.tokenAddresses.map(
      (address) => `${chain.slug}:${address.toLowerCase()}`
    );
    const keys = [chain.nativeCoinKey, ...tokenKeys];
    const body = await this.getJson(`${this.baseUrl}/prices/current/${keys.join(",")}`);
    const coins = isRecord(body) && isRecord(body.coins) ? body.coins : {};

    const nativeUsd = readPrice(coins[chain.nativeCoinKey]);
    const tokenUsd: Record<string, number> = {};
    for (const address of request.tokenAddresses) {
      const price = readPrice(coins[`${chain.slug}:${address.toLowerCase()}`]);
      if (price !== undefined) {
        tokenUsd[address.toLowerCase()] = price;
      }
    }

    return nativeUsd === undefined ? { tokenUsd } : { nativeUsd, tokenUsd };
  }

  // Fetches and parses JSON with a hard timeout. Any failure resolves to
  // undefined so callers degrade gracefully instead of throwing.
  private async getJson(url: string): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { accept: "application/json" }
      });
      if (!response.ok) {
        this.logger.warn(`DeFiLlama responded ${response.status} for ${url}`);
        return undefined;
      }
      return await response.json();
    } catch (error) {
      this.logger.warn(`DeFiLlama request failed for ${url}: ${String(error)}`);
      return undefined;
    } finally {
      clearTimeout(timer);
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

// Reads a DeFiLlama coin entry's USD price, or undefined if it is absent,
// malformed, or below the confidence threshold.
function readPrice(entry: unknown): number | undefined {
  if (!isRecord(entry)) {
    return undefined;
  }
  const confidence = entry.confidence;
  if (typeof confidence === "number" && confidence < MIN_CONFIDENCE) {
    return undefined;
  }
  const price = entry.price;
  return typeof price === "number" && Number.isFinite(price) ? price : undefined;
}
