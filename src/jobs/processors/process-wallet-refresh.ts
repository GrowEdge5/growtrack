import type { Job } from "bullmq";

import { walletRefreshJobSchema, type WalletRefreshJob } from "../contracts/wallet-refresh-job.js";
import type { RefreshWalletIntelligence } from "../../modules/wallets/application/refresh-wallet-intelligence.js";

export function createWalletRefreshProcessor(service: RefreshWalletIntelligence) {
  return async (job: Job<WalletRefreshJob>): Promise<void> => {
    const data = walletRefreshJobSchema.parse(job.data);
    await service.execute(data.chain, data.address);
  };
}
