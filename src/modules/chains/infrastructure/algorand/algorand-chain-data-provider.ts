import algosdk from "algosdk";

import type {
  ChainDataProvider,
  ProviderWalletData
} from "../../application/ports/chain-data-provider.js";
import type { Chain, WalletIdentity } from "../../domain/chain.js";
import type { TokenHolding, WalletTransaction } from "../../../wallets/domain/wallet-snapshot.js";
import { InvalidWalletAddressError } from "../../../../shared/domain/errors.js";
import { getAsaTokenList } from "./algorand-asset-list.js";

// ALGO's native micro-unit has 6 decimals (1 ALGO = 1_000_000 microAlgos), unlike
// the 18-decimal EVM family. This flows through ProviderWalletData.nativeDecimals
// so USD valuation scales the balance correctly.
const ALGO_DECIMALS = 6;

interface AlgorandProviderOptions {
  chainId: number;
  chainName: string;
  apiUrl: string;
  timeoutMs: number;
}

// Reads ALGO balance and curated ASA holdings from a keyless algod REST endpoint
// (Algonode by default). algosdk v3 returns bigint for account and asset amounts,
// so balances are carried as exact strings — no JS-number precision loss for whale
// balances or large-supply assets, which the no-wrong-data rule forbids.
interface AlgonodeTxItem {
  id?: string;
  "confirmed-round"?: number;
  sender?: string;
  "tx-type"?: string;
  "round-time"?: number;
  "payment-transaction"?: {
    amount?: number;
    receiver?: string;
  };
  "asset-transfer-transaction"?: {
    amount?: number;
    receiver?: string;
  };
}

export class AlgorandChainDataProvider implements ChainDataProvider {
  public readonly chain: Chain;
  public readonly nativeDecimals = ALGO_DECIMALS;
  private readonly client: algosdk.Algodv2;
  private readonly timeoutMs: number;

  public constructor(options: AlgorandProviderOptions) {
    this.chain = {
      id: options.chainId,
      slug: options.chainName.toLowerCase(),
      namespace: "algorand",
      nativeSymbol: "ALGO"
    };
    // Token is empty for public endpoints; port is unused for a full https URL.
    this.client = new algosdk.Algodv2("", options.apiUrl, "");
    this.timeoutMs = options.timeoutMs;
  }

  // Algorand addresses are case-sensitive base32 with a trailing checksum, so they
  // are validated verbatim and NEVER lowercased (unlike EVM). isValidAddress does
  // the checksum check — we never hand-roll that crypto.
  public normalizeAddress(address: string): WalletIdentity {
    const trimmed = address.trim();
    if (!algosdk.isValidAddress(trimmed)) {
      throw new InvalidWalletAddressError(this.chain.slug);
    }

    return {
      chain: this.chain,
      canonicalAddress: trimmed,
      displayAddress: trimmed
    };
  }

  public async fetchWalletData(wallet: WalletIdentity): Promise<ProviderWalletData> {
    let account: Awaited<ReturnType<ReturnType<algosdk.Algodv2["accountInformation"]>["do"]>>;
    let transactions: WalletTransaction[] = [];

    try {
      const [acctRes, txs] = await Promise.all([
        withTimeout(
          this.client.accountInformation(wallet.displayAddress).do(),
          this.timeoutMs,
          "algod accountInformation"
        ),
        this.fetchTransactions(wallet.displayAddress)
      ]);
      account = acctRes;
      transactions = txs;
    } catch (error) {
      if (isAccountNotFound(error)) {
        return this.zeroBalanceData();
      }
      throw error;
    }

    return {
      nativeBalance: account.amount.toString(),
      nativeSymbol: this.chain.nativeSymbol,
      nativeDecimals: ALGO_DECIMALS,
      provider: "algonode-rest",
      blockNumber: account.round.toString(),
      holdings: this.mapHoldings(account.assets ?? []),
      transactions,
      positions: [],
      signals: []
    };
  }

  private async fetchTransactions(address: string): Promise<WalletTransaction[]> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      const res = await fetch(
        `https://mainnet-idx.algonode.cloud/v2/accounts/${address}/transactions?limit=10`,
        {
          signal: controller.signal,
          headers: { accept: "application/json" }
        }
      );
      clearTimeout(timer);
      if (!res.ok) return [];

      const data = (await res.json()) as { transactions?: AlgonodeTxItem[] };
      if (!Array.isArray(data.transactions)) return [];

      return data.transactions.map((tx: AlgonodeTxItem) => {
        const txType = tx["tx-type"];
        let activityType = "Transfer";
        let rawValue = "0";
        let toAddress: string | undefined = undefined;

        if (txType === "pay") {
          const pay = tx["payment-transaction"];
          rawValue = String(pay?.amount ?? 0);
          toAddress = pay?.receiver;
          activityType = tx.sender === address ? "Send" : "Receive";
        } else if (txType === "axfer") {
          const axfer = tx["asset-transfer-transaction"];
          rawValue = String(axfer?.amount ?? 0);
          toAddress = axfer?.receiver;
          activityType = tx.sender === address ? "Send" : "Receive";
        } else if (txType === "appl") {
          activityType = "Contract Interaction";
        }

        return {
          hash: String(tx.id ?? ""),
          blockNumber: String(tx["confirmed-round"] ?? 0),
          fromAddress: String(tx.sender ?? address),
          toAddress: toAddress ?? "Algorand Network",
          rawValue,
          occurredAt: tx["round-time"] ? new Date(tx["round-time"] * 1000) : new Date(),
          activityType,
          assetSymbol: txType === "pay" ? "ALGO" : "ASA",
          status: "confirmed"
        };
      });
    } catch {
      return [];
    }
  }

  // Keeps only assets on the curated list with a positive balance. An account may
  // hold other ASAs; those simply do not appear (a documented coverage limit).
  // Frozen holdings are still real balances, so they are reported.
  private mapHoldings(assets: readonly { assetId: bigint; amount: bigint }[]): TokenHolding[] {
    // Asset ids are small sequential counters (far below 2^53), so Number() is safe
    // here — unlike amounts, which stay bigint.
    const curated = new Map(getAsaTokenList(this.chain.id).map((asset) => [asset.assetId, asset]));

    const holdings: TokenHolding[] = [];
    for (const holding of assets) {
      if (holding.amount === 0n) {
        continue;
      }
      const asset = curated.get(Number(holding.assetId));
      if (!asset) {
        continue;
      }

      holdings.push({
        tokenAddress: asset.assetId.toString(),
        symbol: asset.symbol,
        name: asset.name,
        decimals: asset.decimals,
        rawAmount: holding.amount.toString()
      });
    }

    return holdings;
  }

  private zeroBalanceData(): ProviderWalletData {
    return {
      nativeBalance: "0",
      nativeSymbol: this.chain.nativeSymbol,
      nativeDecimals: ALGO_DECIMALS,
      provider: "algonode-rest",
      holdings: [],
      transactions: [],
      positions: [],
      signals: []
    };
  }
}

// algod's REST client throws an error carrying the HTTP response; a 404 there means
// the account is unknown to the node.
function isAccountNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: { status?: unknown } }).response === "object" &&
    (error as { response: { status?: unknown } }).response?.status === 404
  );
}

// Bounds the network read: algosdk's .do() has no built-in timeout, so a hung node
// would otherwise stall the refresh. The underlying request may keep running after a
// timeout, which is harmless for a read-only call.
async function withTimeout<T>(operation: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
      timeoutMs
    );
  });

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}
