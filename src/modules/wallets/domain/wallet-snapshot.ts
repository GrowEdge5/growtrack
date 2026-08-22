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
  totalValueUsd?: string;
  capturedAt: Date;
  expiresAt: Date;
  holdings: TokenHolding[];
  transactions: WalletTransaction[];
  positions: ProtocolPosition[];
  signals: IntelligenceSignal[];
}
