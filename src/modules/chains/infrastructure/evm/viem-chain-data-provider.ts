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
  chainSlug?: string;
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

const BLOCKSCOUT_HOSTS: Readonly<Record<string, string>> = {
  ethereum: "https://eth.blockscout.com",
  base: "https://base.blockscout.com",
  arbitrum: "https://arbitrum.blockscout.com",
  optimism: "https://optimism.blockscout.com",
  polygon: "https://polygon.blockscout.com",
  robinhood: "https://robinhoodchain.blockscout.com",
  hood: "https://robinhoodchain.blockscout.com",
  zetachain: "https://zetachain.blockscout.com",
  ink: "https://explorer.inkonchain.com",
  mode: "https://explorer.mode.network",
  zora: "https://explorer.zora.energy",
  fuse: "https://explorer.fuse.io",
  plume: "https://explorer.plumenetwork.xyz"
};

interface BlockscoutTokenItem {
  token?: {
    address?: string;
    address_hash?: string;
    symbol?: string;
    name?: string;
    decimals?: string | number;
    exchange_rate?: string | number;
    type?: string;
  };
  value?: string;
}

export class ViemChainDataProvider implements ChainDataProvider {
  public readonly chain: Chain;
  public readonly nativeDecimals = EVM_NATIVE_DECIMALS;
  private readonly client;

  public constructor(options: EvmProviderOptions) {
    this.chain = {
      id: options.chainId,
      slug: options.chainSlug ?? options.chainName.toLowerCase(),
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
      const host = BLOCKSCOUT_HOSTS[this.chain.slug];
      if (!host) return [];

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${host}/api/v2/addresses/${owner}/transactions`, {
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
          assetSymbol: this.chain.nativeSymbol,
          status:
            tx.status === "ok" || !tx.has_error_in_internal_transactions ? "confirmed" : "failed"
        };
      });
    } catch {
      return [];
    }
  }

  // Reads ERC-20 balances.
  // When a Blockscout host is configured for this chain, directly discovers
  // token balances from the indexer API. Falls back to / merges with multicall3 for
  // curated token lists.
  private async fetchTokenHoldings(owner: string): Promise<TokenHolding[]> {
    const holdingsMap = new Map<string, TokenHolding>();

    // 1. Try Blockscout token indexer if available for this network
    const host = BLOCKSCOUT_HOSTS[this.chain.slug];
    if (host) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(`${host}/api/v2/addresses/${owner}/tokens`, {
          signal: controller.signal,
          headers: { accept: "application/json" }
        });
        clearTimeout(timer);

        if (res.ok) {
          const data = (await res.json()) as { items?: BlockscoutTokenItem[] };
          if (Array.isArray(data.items)) {
            for (const item of data.items) {
              const t = item.token;
              const rawAmount = item.value ?? "0";
              const tokenAddr = t?.address_hash ?? t?.address;
              if (tokenAddr && t?.symbol && rawAmount !== "0") {
                const dec = Number(t.decimals ?? 18);
                const safeDec = Number.isFinite(dec) && dec >= 0 && dec <= 36 ? dec : 18;
                const lower = tokenAddr.toLowerCase();
                holdingsMap.set(lower, {
                  tokenAddress: lower,
                  symbol: t.symbol,
                  name: t.name ?? t.symbol,
                  decimals: safeDec,
                  rawAmount
                });
              }
            }
          }
        }
      } catch {
        // Blockscout error is gracefully ignored, falling through to multicall
      }
    }

    // 2. Multicall fallback for curated tokens
    const tokens = await getErc20TokenList(this.chain.id);
    if (tokens.length > 0) {
      try {
        const unqueriedTokens = tokens.filter((t) => !holdingsMap.has(t.address.toLowerCase()));
        if (unqueriedTokens.length > 0) {
          const results = await this.client.multicall({
            allowFailure: true,
            contracts: unqueriedTokens.map((token) => ({
              address: getAddress(token.address),
              abi: ERC20_BALANCE_OF_ABI,
              functionName: "balanceOf",
              args: [owner]
            }))
          });

          results.forEach((result, index) => {
            const token = unqueriedTokens[index];
            if (!token || result.status !== "success") return;

            const rawAmount = result.result as bigint;
            if (rawAmount === 0n) return;

            const lower = token.address.toLowerCase();
            holdingsMap.set(lower, {
              tokenAddress: lower,
              symbol: token.symbol,
              name: token.name,
              decimals: token.decimals,
              rawAmount: rawAmount.toString()
            });
          });
        }
      } catch {
        // Multicall error tolerated
      }
    }

    return Array.from(holdingsMap.values());
  }
}
