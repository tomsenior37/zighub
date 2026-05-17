import type Database from "better-sqlite3";
import { getDb, resolveDbPath } from "./db/connection.js";
import { runIntegrityCheck } from "./db/integrity.js";
import { log as auditLog } from "./domain/auditLog.js";
import { buildServer } from "./server.js";
import { createZigbeeAdapter } from "./zigbee/factory.js";

const HOST = process.env.HOST ?? "127.0.0.1";
const PORT = Number.parseInt(process.env.PORT ?? "8282", 10);

const dbPath = resolveDbPath();

function failCorrupt(errors: string[]): never {
  console.error(`[startup] database integrity check failed for ${dbPath}:`);
  for (const e of errors) console.error(`  - ${e}`);
  console.error(
    "[startup] Do not continue with a corrupt database. Restore from a recent backup and retry.",
  );
  process.exit(2);
}

let db: Database.Database;
try {
  db = getDb({ path: dbPath });
} catch (err) {
  // A severely corrupted file can throw on open (e.g. setting PRAGMA journal_mode
  // already triggers a scan). Treat it the same as a failed integrity check.
  failCorrupt([`open failed: ${err instanceof Error ? err.message : String(err)}`]);
}

const integrity = runIntegrityCheck(db);
auditLog(db, {
  category: "db",
  event: integrity.ok ? "integrity-check-pass" : "integrity-check-fail",
  details: integrity.ok ? {} : { errors: integrity.errors },
});

if (!integrity.ok) {
  db.close();
  failCorrupt(integrity.errors);
}

const coordinatorPath = process.env.ZIGHUB_COORDINATOR_PATH;
const zigbee = createZigbeeAdapter(
  {
    ...(coordinatorPath !== undefined && { coordinatorPath }),
    databasePath: dbPath,
  },
  {
    logger: { warn: (msg) => console.warn(`[zigbee] ${msg}`) },
  },
);

const app = await buildServer({ logger: true, zigbeeAdapter: zigbee.adapter });
app.log.info({ kind: zigbee.kind, reason: zigbee.reason }, "zigbee adapter ready");

try {
  await zigbee.adapter.start();
} catch (err) {
  app.log.error({ err }, "zigbee adapter failed to start");
}

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  app.log.info({ signal }, "shutdown signal received");
  try {
    await zigbee.adapter.stop();
    await app.close();
    db.close();
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
  db.close();
  process.exit(1);
}
