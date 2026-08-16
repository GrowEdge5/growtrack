import { buildContainer } from "./app/build-container.js";
import { buildHttpApp } from "./app/build-http-app.js";
import { loadEnvironment } from "./config/env.js";

const env = loadEnvironment();
const container = buildContainer(env);
await container.connect();
const app = await buildHttpApp(container);

async function shutdown(signal: string): Promise<void> {
  app.log.info({ signal }, "Shutting down API");
  await app.close();
  await container.close();
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void shutdown(signal);
  });
}

try {
  await app.listen({ host: env.HOST, port: env.PORT });
} catch (error) {
  app.log.fatal({ err: error }, "API failed to start");
  await container.close();
  process.exitCode = 1;
}
