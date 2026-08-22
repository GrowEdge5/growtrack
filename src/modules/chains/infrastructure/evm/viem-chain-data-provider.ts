import { createPublicClient, defineChain, getAddress, http, isAddress } from "viem";

import type {
  ChainDataProvider,
  ProviderWalletData
} from "../../application/ports/chain-data-provider.js";
import type { Chain, WalletIdentity } from "../../domain/chain.js";
import type { TokenHolding } from "../../../wallets/domain/wallet-snapshot.js";
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

export class ViemChainDataProvider implements ChainDataProvider {
  public readonly chain: Chain;
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
      nativeCurrency: { name: options.nativeSymbol, symbol: options.nativeSymbol, decimals: 18 },
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
    const [nativeBalance, blockNumber, holdings] = await Promise.all([
      this.client.getBalance({ address: owner }),
      this.client.getBlockNumber(),
      this.fetchTokenHoldings(owner)
    ]);

    return {
      nativeBalance: nativeBalance.toString(),
      nativeSymbol: this.chain.nativeSymbol,
      provider: "viem-rpc",
      blockNumber: blockNumber.toString(),
      holdings,
      transactions: [],
      positions: [],
      signals: []
    };
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
