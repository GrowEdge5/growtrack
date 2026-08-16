import { Worker } from "bullmq";

import { buildContainer } from "./app/build-container.js";
import { loadEnvironment } from "./config/env.js";
import { walletRefreshQueueName } from "./infrastructure/queue/queue-names.js";
import { createWorkerRedisClient } from "./infrastructure/redis/redis.js";
import type { WalletRefreshJob } from "./jobs/contracts/wallet-refresh-job.js";
import { createWalletRefreshProcessor } from "./jobs/processors/process-wallet-refresh.js";

const env = loadEnvironment();
const container = buildContainer(env);
const workerRedis = createWorkerRedisClient(env.REDIS_URL);
await Promise.all([container.connect(), workerRedis.connect()]);

const worker = new Worker<WalletRefreshJob>(
  walletRefreshQueueName,
  createWalletRefreshProcessor(container.refreshWalletIntelligence),
  { connection: workerRedis, concurrency: 5 }
);

worker.on("failed", (job, error) => {
  console.error({ jobId: job?.id, error }, "Wallet refresh job failed");
});

async function shutdown(): Promise<void> {
  await worker.close();
  await workerRedis.quit();
  await container.close();
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void shutdown();
  });
}
