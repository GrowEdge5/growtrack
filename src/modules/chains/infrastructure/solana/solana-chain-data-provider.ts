import { Decimal } from "decimal.js";

import type {
  ChainDataProvider,
  ProviderWalletData
} from "../../application/ports/chain-data-provider.js";
import type { Chain, WalletIdentity } from "../../domain/chain.js";
import type {
  IntelligenceSignal,
  TokenHolding,
  WalletTransaction
} from "../../../wallets/domain/wallet-snapshot.js";
import { InvalidWalletAddressError } from "../../../../shared/domain/errors.js";
import { isSolanaAddress } from "../../domain/address-detection.js";
import { SolanaTokenMetadataSource, type SolanaTokenLookup } from "./solana-token-metadata.js";

// SOL's smallest unit is the lamport: 1 SOL = 1_000_000_000 lamports.
const SOL_DECIMALS = 9;

// The two SPL token programs. Token-2022 is a separate program id and its accounts
// are not returned by a query against the original program, so both are asked.
const SPL_TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

interface SolanaProviderOptions {
  chainId: number;
  chainName: string;
  rpcUrl: string;
  timeoutMs: number;
  tokenMetadata?: SolanaTokenMetadataSource;
}

interface JsonRpcResponse {
  result?: unknown;
  error?: { code?: unknown; message?: unknown };
}

interface ParsedTokenAmount {
  amount?: unknown;
  decimals?: unknown;
}

interface ParsedTokenInfo {
  mint?: unknown;
  tokenAmount?: ParsedTokenAmount;
}

interface TokenAccountEntry {
  account?: {
    data?: {
      parsed?: {
        info?: ParsedTokenInfo;
      };
    };
  };
}

// Reads SOL and every SPL token balance the account holds from a Solana JSON-RPC
// endpoint (the public mainnet-beta RPC by default).
//
// Unlike the EVM and Algorand providers this does not restrict holdings to a
// curated list: `getTokenAccountsByOwner` enumerates all of an owner's token
// accounts, so long-tail holdings are reported rather than silently dropped.
// Amounts are carried as decimal strings and summed with Decimal, because a
// lamport balance exceeds Number.MAX_SAFE_INTEGER for large holders.
export class SolanaChainDataProvider implements ChainDataProvider {
  public readonly chain: Chain;
  public readonly nativeDecimals = SOL_DECIMALS;

  private readonly rpcUrl: string;
  private readonly timeoutMs: number;
  private readonly tokenMetadata: SolanaTokenMetadataSource;

  public constructor(options: SolanaProviderOptions) {
    this.chain = {
      id: options.chainId,
      slug: options.chainName.toLowerCase(),
      namespace: "solana",
      nativeSymbol: "SOL"
    };
    this.rpcUrl = options.rpcUrl;
    this.timeoutMs = options.timeoutMs;
    this.tokenMetadata = options.tokenMetadata ?? new SolanaTokenMetadataSource();
  }

  // Base58, and exactly 32 decoded bytes — checked without any network call.
  public normalizeAddress(address: string): WalletIdentity {
    const trimmed = address.trim();
    if (!isSolanaAddress(trimmed)) {
      throw new InvalidWalletAddressError(this.chain.slug);
    }

    return {
      chain: this.chain,
      canonicalAddress: trimmed,
      displayAddress: trimmed
    };
  }

  public async fetchWalletData(wallet: WalletIdentity): Promise<ProviderWalletData> {
    const owner = wallet.displayAddress;
    const [balance, slot, accounts, transactions] = await Promise.all([
      this.rpc<{ value: number }>("getBalance", [owner]),
      this.rpc<number>("getSlot", []),
      this.fetchTokenAccounts(owner),
      this.fetchTransactions(owner)
    ]);

    const signals: IntelligenceSignal[] = [];
    const holdings = await this.mapHoldings(accounts, signals);

    return {
      // Solana's RPC reports lamports as a JSON number, so a holder above ~9.007M SOL
      // (2^53 lamports) would already have lost precision at the RPC boundary. Token
      // amounts are returned as strings and are unaffected.
      nativeBalance: balance.value.toString(),
      nativeSymbol: this.chain.nativeSymbol,
      nativeDecimals: SOL_DECIMALS,
      provider: "solana-rpc",
      blockNumber: slot.toString(),
      holdings,
      transactions,
      positions: [],
      signals
    };
  }

  private async fetchTransactions(owner: string): Promise<WalletTransaction[]> {
    try {
      const sigs = await this.rpc<
        Array<{ signature: string; slot: number; blockTime?: number; err?: unknown }>
      >("getSignaturesForAddress", [owner, { limit: 10 }]);

      if (!Array.isArray(sigs)) return [];

      return sigs.map((sig) => ({
        hash: sig.signature,
        blockNumber: String(sig.slot),
        fromAddress: owner,
        toAddress: "Solana Network",
        rawValue: "0",
        occurredAt: sig.blockTime ? new Date(sig.blockTime * 1000) : new Date(),
        activityType: "Contract Interaction",
        assetSymbol: "SOL",
        status: sig.err ? "failed" : "confirmed"
      }));
    } catch {
      return [];
    }
  }

  private fetchTokenAccounts(owner: string): Promise<TokenAccountEntry[]> {
    return Promise.all(
      [SPL_TOKEN_PROGRAM, TOKEN_2022_PROGRAM].map(async (programId) => {
        const result = await this.rpc<{ value: TokenAccountEntry[] }>("getTokenAccountsByOwner", [
          owner,
          { programId },
          { encoding: "jsonParsed" }
        ]);
        return result.value;
      })
    ).then((batches) => batches.flat());
  }

  // One owner can hold several accounts for the same mint, so amounts are summed
  // per mint. Zero balances are dropped.
  //
  // Solana accounts are spammed with unsolicited airdropped tokens: one real wallet
  // probed here returned 971 distinct mints, the overwhelming majority worthless
  // junk. A mint absent from the verified token list is therefore treated as
  // unverified and left out of holdings — but never silently: the count is reported
  // as a signal, and when the list itself was unavailable nothing is dropped at all,
  // because absence of the list is not evidence about a token.
  private async mapHoldings(
    accounts: readonly TokenAccountEntry[],
    signals: IntelligenceSignal[]
  ): Promise<TokenHolding[]> {
    const rawByMint = new Map<string, { amount: Decimal; decimals: number }>();

    for (const entry of accounts) {
      const info = entry.account?.data?.parsed?.info;
      const mint = info?.mint;
      const amount = info?.tokenAmount?.amount;
      const decimals = info?.tokenAmount?.decimals;
      if (typeof mint !== "string" || typeof amount !== "string" || typeof decimals !== "number") {
        continue;
      }

      const parsed = new Decimal(amount);
      if (parsed.isZero()) {
        continue;
      }

      const existing = rawByMint.get(mint);
      rawByMint.set(mint, {
        amount: existing === undefined ? parsed : existing.amount.plus(parsed),
        decimals
      });
    }

    if (rawByMint.size === 0) {
      return [];
    }

    let lookup: SolanaTokenLookup = { metadata: new Map(), listAvailable: false };
    try {
      lookup = await this.tokenMetadata.lookup([...rawByMint.keys()]);
    } catch {
      lookup = { metadata: new Map(), listAvailable: false };
    }

    const holdings: TokenHolding[] = [];
    let unverified = 0;
    for (const [mint, { amount, decimals }] of rawByMint) {
      const found = lookup.metadata.get(mint);
      if (found === undefined) {
        if (lookup.listAvailable) {
          unverified += 1;
          continue;
        }
        // Degraded mode: no list to judge against, so report the real balance under
        // the mint's own identifier rather than dropping or mislabelling it.
        holdings.push({
          tokenAddress: mint,
          symbol: shortenMint(mint),
          name: "Unrecognized SPL token",
          decimals,
          rawAmount: amount.toFixed(0)
        });
        continue;
      }

      holdings.push({
        tokenAddress: mint,
        symbol: found.symbol,
        name: found.name,
        decimals,
        rawAmount: amount.toFixed(0)
      });
    }

    if (unverified > 0) {
      signals.push({
        category: "token-coverage",
        severity: "info",
        title: `${unverified} unverified SPL token${unverified === 1 ? "" : "s"} excluded`,
        description:
          `This Solana address holds ${unverified} token${unverified === 1 ? "" : "s"} that are not on the ` +
          "verified token list, typically unsolicited airdrops. They are excluded from holdings and from the " +
          "portfolio total because they cannot be named or priced reliably.",
        source: "jupiter-token-list"
      });
    }

    return holdings;
  }

  // Minimal JSON-RPC 2.0 call with a hard timeout. A JSON-RPC `error` member or a
  // non-2xx status rejects, so a refresh fails loudly instead of reporting the
  // failure as a zero balance. (A genuinely absent account is not an error: the RPC
  // returns 0 lamports for it, which is accurate.)
  private async rpc<T>(method: string, params: unknown[]): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(this.rpcUrl, {
        method: "POST",
        signal: controller.signal,
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params })
      });
      if (!response.ok) {
        throw new Error(`Solana RPC responded ${response.status} for ${method}`);
      }

      const body = (await response.json()) as JsonRpcResponse;
      if (body.error !== undefined) {
        const message = typeof body.error.message === "string" ? body.error.message : "RPC error";
        throw new Error(`Solana RPC error for ${method}: ${message}`);
      }
      if (body.result === undefined) {
        throw new Error(`Solana RPC returned no result for ${method}`);
      }
      return body.result as T;
    } finally {
      clearTimeout(timer);
    }
  }
}

// A mint we have no metadata for is still identified honestly by its own address.
function shortenMint(mint: string): string {
  return mint.length <= 10 ? mint : `${mint.slice(0, 4)}…${mint.slice(-4)}`;
}
