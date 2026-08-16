import { Redis } from "ioredis";

export function createRedisClient(url: string): Redis {
  return new Redis(url, {
    enableReadyCheck: true,
    lazyConnect: true,
    maxRetriesPerRequest: 2
  });
}

export function createWorkerRedisClient(url: string): Redis {
  return new Redis(url, {
    enableReadyCheck: true,
    lazyConnect: true,
    maxRetriesPerRequest: null
  });
}
