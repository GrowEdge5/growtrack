import type { Chain, WalletIdentity } from "../../domain/chain.js";
import type {
  IntelligenceSignal,
  ProtocolPosition,
  TokenHolding,
  WalletTransaction
} from "../../../wallets/domain/wallet-snapshot.js";

export interface ProviderWalletData {
  status: "complete" | "partial";
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
