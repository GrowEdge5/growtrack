import type { Chain, WalletIdentity } from "../../domain/chain.js";
import type {
  IntelligenceSignal,
  ProtocolPosition,
  TokenHolding,
  WalletTransaction
} from "../../../wallets/domain/wallet-snapshot.js";

// Raw on-chain data as read by a chain provider, before USD pricing is applied.
// The snapshot's complete/partial status is derived later from pricing coverage
// (see applyUsdPricing), so it is deliberately not reported here.
export interface ProviderWalletData {
  nativeBalance: string;
  nativeSymbol: string;
  provider: string;
  blockNumber?: string;
  holdings: TokenHolding[];
  transactions: WalletTransaction[];
  positions: ProtocolPosition[];
  signals: IntelligenceSignal[];
}

export interface ChainDataProvider {
  readonly chain: Chain;
  normalizeAddress(address: string): WalletIdentity;
  fetchWalletData(wallet: WalletIdentity): Promise<ProviderWalletData>;
}

export interface ChainProviderRegistry {
  get(chainSlug: string): ChainDataProvider;
}
