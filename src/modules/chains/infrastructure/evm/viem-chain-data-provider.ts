import { createPublicClient, defineChain, getAddress, http, isAddress } from "viem";

import type {
  ChainDataProvider,
  ProviderWalletData
} from "../../application/ports/chain-data-provider.js";
import type { Chain, WalletIdentity } from "../../domain/chain.js";
import type { TokenHolding, WalletTransaction } from "../../../wallets/domain/wallet-snapshot.js";
import { InvalidWalletAddressError } from "../../../../shared/domain/errors.js";
import { getErc20TokenList } from "./ethereum-token-list.js";

// Canonical Multicall3 deployment, identical across Ethereum mainnet and most
// EVM chains. Token holdings are only read on chains with a curated token list
// (mainnet today), where this contract is guaranteed to exist.
const MULTICALL3_ADDRESS = "0xca11bde05977b3631167028862be2a173976ca11" as const;

const ERC20_BALANCE_OF_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }]
  }
] as const;

interface EvmProviderOptions {
  chainId: number;
  chainName: string;
  nativeSymbol: string;
  rpcUrl: string;
  timeoutMs: number;
}

// EVM native currency (wei) has 18 decimals on every chain Growtrack reads.
const EVM_NATIVE_DECIMALS = 18;

interface BlockscoutItem {
  hash?: string;
  block_number?: number;
  from?: { hash?: string };
  to?: { hash?: string };
  value?: string;
  timestamp?: string;
  transaction_types?: string[];
  status?: string;
  has_error_in_internal_transactions?: boolean;
}

export class ViemChainDataProvider implements ChainDataProvider {
  public readonly chain: Chain;
  public readonly nativeDecimals = EVM_NATIVE_DECIMALS;
  private readonly client;

  public constructor(options: EvmProviderOptions) {
    this.chain = {
      id: options.chainId,
      slug: options.chainName.toLowerCase(),
      namespace: "eip155",
      nativeSymbol: options.nativeSymbol
    };
    const viemChain = defineChain({
      id: options.chainId,
      name: options.chainName,
      nativeCurrency: {
        name: options.nativeSymbol,
        symbol: options.nativeSymbol,
        decimals: EVM_NATIVE_DECIMALS
      },
      rpcUrls: { default: { http: [options.rpcUrl] } },
      contracts: {
        multicall3: { address: MULTICALL3_ADDRESS }
      }
    });
    this.client = createPublicClient({
      chain: viemChain,
      transport: http(options.rpcUrl, { timeout: options.timeoutMs, retryCount: 2 })
    });
  }

  public normalizeAddress(address: string): WalletIdentity {
    if (!isAddress(address)) {
      throw new InvalidWalletAddressError(this.chain.slug);
    }

    const displayAddress = getAddress(address);
    return {
      chain: this.chain,
      canonicalAddress: displayAddress.toLowerCase(),
      displayAddress
    };
  }

  public async fetchWalletData(wallet: WalletIdentity): Promise<ProviderWalletData> {
    const owner = getAddress(wallet.displayAddress);
    const [nativeBalance, blockNumber, holdings, transactions] = await Promise.all([
      this.client.getBalance({ address: owner }),
      this.client.getBlockNumber(),
      this.fetchTokenHoldings(owner),
      this.fetchTransactions(owner)
    ]);

    return {
      nativeBalance: nativeBalance.toString(),
      nativeSymbol: this.chain.nativeSymbol,
      nativeDecimals: EVM_NATIVE_DECIMALS,
      provider: "viem-rpc",
      blockNumber: blockNumber.toString(),
      holdings,
      transactions,
      positions: [],
      signals: []
    };
  }

  private async fetchTransactions(owner: string): Promise<WalletTransaction[]> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`https://eth.blockscout.com/api/v2/addresses/${owner}/transactions`, {
        signal: controller.signal,
        headers: { accept: "application/json" }
      });
      clearTimeout(timer);
      if (!res.ok) return [];

      const data = (await res.json()) as { items?: BlockscoutItem[] };
      if (!Array.isArray(data.items)) return [];

      return data.items.slice(0, 10).map((tx: BlockscoutItem) => {
        const fromHash = tx.from?.hash ?? "";
        const isFromOwner = fromHash.toLowerCase() === owner.toLowerCase();
        const types = Array.isArray(tx.transaction_types) ? tx.transaction_types : [];
        let activityType = isFromOwner ? "Send" : "Receive";
        if (types.includes("contract_call") || types.includes("contract_creation")) {
          activityType = "Contract Interaction";
        }

        return {
          hash: String(tx.hash ?? ""),
          blockNumber: String(tx.block_number ?? 0),
          fromAddress: String(tx.from?.hash ?? owner),
          toAddress: String(tx.to?.hash ?? "Contract"),
          rawValue: String(tx.value ?? "0"),
          occurredAt: tx.timestamp ? new Date(tx.timestamp) : new Date(),
          activityType,
          assetSymbol: "ETH",
          status:
            tx.status === "ok" || !tx.has_error_in_internal_transactions ? "confirmed" : "failed"
        };
      });
    } catch {
      return [];
    }
  }

  // Reads ERC-20 balances for the curated token list in a single multicall.
  // allowFailure keeps a per-token revert (e.g. a non-standard contract) from
  // failing the whole snapshot; only successful, non-zero balances are returned.
  // Missing tokens simply do not appear — nothing is fabricated or zero-filled.
  private async fetchTokenHoldings(owner: string): Promise<TokenHolding[]> {
    const tokens = getErc20TokenList(this.chain.id);
    if (tokens.length === 0) {
      return [];
    }

    const results = await this.client.multicall({
      allowFailure: true,
      contracts: tokens.map((token) => ({
        address: getAddress(token.address),
        abi: ERC20_BALANCE_OF_ABI,
        functionName: "balanceOf",
        args: [owner]
      }))
    });

    const holdings: TokenHolding[] = [];
    results.forEach((result, index) => {
      const token = tokens[index];
      if (!token || result.status !== "success") {
        return;
      }

      const rawAmount = result.result as bigint;
      if (rawAmount === 0n) {
        return;
      }

      holdings.push({
        tokenAddress: token.address,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        rawAmount: rawAmount.toString()
      });
    });

    return holdings;
  }
}
