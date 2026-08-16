import type { WalletIdentity } from "../../../chains/domain/chain.js";
import type { WalletSnapshot } from "../../domain/wallet-snapshot.js";

export interface WalletRepository {
  findLatest(identity: WalletIdentity): Promise<WalletSnapshot | null>;
  save(snapshot: WalletSnapshot): Promise<void>;
}
