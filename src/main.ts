import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { buildContainer } from "./app/build-container.js";
import { buildHttpApp } from "./app/build-http-app.js";
import { loadEnvironment } from "./config/env.js";

const env = loadEnvironment();
const container = buildContainer(env);
await container.connect();
const app = await buildHttpApp(container);

let nextProcess: ChildProcess | undefined;

// If the web build exists and START_WEB is not explicitly disabled,
// launch Next.js web application in the background on port 3001 so Fastify can proxy frontend routes.
const webNextDir = path.resolve(process.cwd(), "web", ".next");
const nextBin = path.resolve(process.cwd(), "node_modules", "next", "dist", "bin", "next");
if (fs.existsSync(webNextDir) && fs.existsSync(nextBin) && process.env.START_WEB !== "false") {
  app.log.info("Starting background Next.js web application on port 3001");
  nextProcess = spawn(process.execPath, [nextBin, "start", "web", "-p", "3001"], {
    stdio: "inherit",
    env: { ...process.env, PORT: "3001" }
  });
  nextProcess.on("error", (err) => {
    app.log.warn({ err }, "Could not start Next.js background process");
  });
}

async function shutdown(signal: string): Promise<void> {
  app.log.info({ signal }, "Shutting down API");
  if (nextProcess) {
    nextProcess.kill();
  }
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
  if (nextProcess) {
    nextProcess.kill();
  }
  await container.close();
  process.exitCode = 1;
}
