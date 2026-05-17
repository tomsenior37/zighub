import { buildServer } from "./server.js";

const HOST = process.env.HOST ?? "127.0.0.1";
const PORT = Number.parseInt(process.env.PORT ?? "8080", 10);

const app = buildServer({ logger: true });

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  app.log.info({ signal }, "shutdown signal received");
  try {
    await app.close();
    process.exit(0);
  } catch (err) {
    app.log.error({ err }, "error during shutdown");
    process.exit(1);
  }
}

process.on("SIGINT", (sig) => {
  void shutdown(sig);
});
process.on("SIGTERM", (sig) => {
  void shutdown(sig);
});

try {
  await app.listen({ host: HOST, port: PORT });
} catch (err) {
  app.log.error({ err }, "server failed to start");
  process.exit(1);
}
