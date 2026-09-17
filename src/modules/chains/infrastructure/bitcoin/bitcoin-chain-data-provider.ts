import { Decimal } from "decimal.js";

import type {
  ChainDataProvider,
  ProviderWalletData
} from "../../application/ports/chain-data-provider.js";
import type { Chain, WalletIdentity } from "../../domain/chain.js";
import { InvalidWalletAddressError } from "../../../../shared/domain/errors.js";
import { isBitcoinAddress } from "../../domain/address-detection.js";

// 1 BTC = 100_000_000 satoshis.
const BTC_DECIMALS = 8;

interface BitcoinProviderOptions {
  chainId: number;
  chainName: string;
  // Esplora-compatible REST base (blockstream.info by default). Verified reachable
  // where mempool.space was not, so it is the primary.
  apiUrl: string;
  timeoutMs: number;
  // Optional second Esplora base, tried when the primary fails.
  fallbackApiUrl?: string;
  logger?: { warn: (message: string) => void };
}

interface AddressStats {
  funded_txo_sum?: unknown;
  spent_txo_sum?: unknown;
}

interface AddressResponse {
  chain_stats?: AddressStats;
  mempool_stats?: AddressStats;
}

// Reads a Bitcoin address's balance from an Esplora REST API.
//
// Bitcoin needs no token list and no curation: an address's balance IS the sum of
// its unspent outputs, which the API reports directly as funded minus spent. That
// makes BTC the chain where coverage is complete by construction.
//
// Confirmed and unconfirmed (mempool) totals are both included, so a payment that
// has been broadcast but not yet mined is reflected rather than shown as absent.
export class BitcoinChainDataProvider implements ChainDataProvider {
  public readonly chain: Chain;
  public readonly nativeDecimals = BTC_DECIMALS;

  private readonly apiUrls: readonly string[];
  private readonly timeoutMs: number;
  private readonly logger: { warn: (message: string) => void };

  public constructor(options: BitcoinProviderOptions) {
    this.chain = {
      id: options.chainId,
      slug: options.chainName.toLowerCase(),
      namespace: "bitcoin",
      nativeSymbol: "BTC"
    };
    this.apiUrls = [options.apiUrl, options.fallbackApiUrl]
      .filter((url): url is string => url !== undefined && url.length > 0)
      .map((url) => url.replace(/\/+$/, ""));
    this.timeoutMs = options.timeoutMs;
    this.logger = options.logger ?? { warn: () => undefined };
  }

  public normalizeAddress(address: string): WalletIdentity {
    const trimmed = address.trim();
    if (!isBitcoinAddress(trimmed)) {
      throw new InvalidWalletAddressError(this.chain.slug);
    }

    return {
      chain: this.chain,
      canonicalAddress: trimmed,
      displayAddress: trimmed
    };
  }

  public async fetchWalletData(wallet: WalletIdentity): Promise<ProviderWalletData> {
    const address = wallet.displayAddress;
    const [stats, tipHeight] = await Promise.all([
      this.getJson<AddressResponse>(`/address/${address}`),
      this.getText("/blocks/tip/height")
    ]);

    const balance = sumStats(stats.chain_stats).plus(sumStats(stats.mempool_stats));
    const height = Number.parseInt(tipHeight, 10);

    return {
      nativeBalance: balance.toFixed(0),
      nativeSymbol: this.chain.nativeSymbol,
      nativeDecimals: BTC_DECIMALS,
      provider: "esplora-rest",
      ...(Number.isFinite(height) ? { blockNumber: String(height) } : {}),
      // A Bitcoin address holds no tokens and no positions: the UTXO sum is the
      // whole portfolio.
      holdings: [],
      transactions: [],
      positions: [],
      signals: []
    };
  }

  // Tries each configured API base in order and returns the first usable response.
  // A failure on every base throws, so the refresh fails loudly rather than
  // reporting a zero balance for an address that simply could not be read.
  private async getJson<T>(path: string): Promise<T> {
    const text = await this.getText(path);
    return JSON.parse(text) as T;
  }

  private async getText(path: string): Promise<string> {
    let lastError: unknown;
    for (const base of this.apiUrls) {
      try {
        return await this.fetchText(`${base}${path}`);
      } catch (error) {
        lastError = error;
        this.logger.warn(`Bitcoin API ${base} failed for ${path}: ${String(error)}`);
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error(`No Bitcoin API base could serve ${path}`);
  }

  private async fetchText(url: string): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { accept: "application/json, text/plain" }
      });
      if (!response.ok) {
        throw new Error(`Bitcoin API responded ${response.status} for ${url}`);
      }
      return await response.text();
    } finally {
      clearTimeout(timer);
    }
  }
}

// funded - spent, per the Esplora stats contract. Decimal (not Number) because
// cumulative funded totals can exceed Number.MAX_SAFE_INTEGER satoshis for an
// address that has been paid many times.
function sumStats(stats: AddressStats | undefined): Decimal {
  const funded = toDecimal(stats?.funded_txo_sum);
  const spent = toDecimal(stats?.spent_txo_sum);
  return funded.minus(spent);
}

function toDecimal(value: unknown): Decimal {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Decimal(value);
  }
  if (typeof value === "string" && /^\d+$/.test(value)) {
    return new Decimal(value);
  }
  return new Decimal(0);
}
