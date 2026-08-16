import { createPublicClient, defineChain, getAddress, http, isAddress } from "viem";

import type {
  ChainDataProvider,
  ProviderWalletData
} from "../../application/ports/chain-data-provider.js";
import type { Chain, WalletIdentity } from "../../domain/chain.js";
import { InvalidWalletAddressError } from "../../../../shared/domain/errors.js";

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
      rpcUrls: { default: { http: [options.rpcUrl] } }
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
    const [nativeBalance, blockNumber] = await Promise.all([
      this.client.getBalance({ address: getAddress(wallet.displayAddress) }),
      this.client.getBlockNumber()
    ]);

    return {
      status: "partial",
      nativeBalance: nativeBalance.toString(),
      nativeSymbol: this.chain.nativeSymbol,
      provider: "viem-rpc",
      blockNumber: blockNumber.toString(),
      holdings: [],
      transactions: [],
      positions: [],
      signals: []
    };
  }
}
