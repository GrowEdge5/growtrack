import type { WalletIdentity } from "../../chains/domain/chain.js";

export type SnapshotStatus = "complete" | "partial";

export interface TokenHolding {
  tokenAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  rawAmount: string;
  valueUsd?: string;
}

export interface WalletTransaction {
  hash: string;
  blockNumber: string;
  fromAddress: string;
  toAddress?: string;
  rawValue: string;
  occurredAt: Date;
  activityType?: string;
  assetSymbol?: string;
  status?: string;
}

export interface ProtocolPosition {
  protocol: string;
  category: string;
  externalId: string;
  valueUsd?: string;
  data: Record<string, unknown>;
}

export type SignalSeverity = "info" | "low" | "medium" | "high" | "critical";

export interface IntelligenceSignal {
  category: string;
  severity: SignalSeverity;
  title: string;
  description: string;
  source: string;
  evidence?: Record<string, unknown>;
  expiresAt?: Date;
}

export interface WalletSnapshot {
  wallet: WalletIdentity;
  status: SnapshotStatus;
  nativeBalance: string;
  nativeSymbol: string;
  provider: string;
  blockNumber?: string;
  // The native balance's own USD value. Carried separately from totalValueUsd so a
  // reader can show "ALGO $412.19, and here is an unpriced token" without having to
  // infer which part of the total was priced — an inference that would report a
  // genuinely unpriced native balance as $0.
  nativeValueUsd?: string;
  // Sum of native + all priced holdings, in USD. Omitted when nothing could
  // be priced (never zero-filled).
  totalValueUsd?: string;
  capturedAt: Date;
  expiresAt: Date;
  holdings: TokenHolding[];
  transactions: WalletTransaction[];
  positions: ProtocolPosition[];
  signals: IntelligenceSignal[];
}
