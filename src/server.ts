import Fastify, { type FastifyInstance } from "fastify";
import type Database from "better-sqlite3";
import { registerCoordinatorRoutes } from "./coordinatorRoutes.js";
import type { SerialPortLister } from "./coordinator/serialPorts.js";
import type { SettingsRepo } from "./domain/settings.js";
import { registerEventStreamRoute } from "./eventsStream.js";
import { registerNetworkRoutes } from "./networkRoutes.js";
import { registerStaticWeb, shouldServeStaticWeb } from "./staticWeb.js";
import { VERSION } from "./version.js";
import { registerZigbeeRoutes } from "./zigbeeRoutes.js";
import type { ZigbeeAdapter } from "./zigbee/index.js";

export interface BuildServerOptions {
  logger?: boolean;
  staticWebRoot?: string;
  serveStaticWeb?: boolean;
  zigbeeAdapter?: ZigbeeAdapter;
  serialPortLister?: SerialPortLister;
  settings?: SettingsRepo;
  db?: Database.Database;
}

export async function buildServer(opts: BuildServerOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: opts.logger ?? false,
  });

  app.get("/health", () => ({ status: "ok", version: VERSION }));

  if (opts.zigbeeAdapter) {
    registerZigbeeRoutes(app, opts.zigbeeAdapter);
    const networkOpts: Parameters<typeof registerNetworkRoutes>[2] = {};
    if (opts.settings) networkOpts.settings = opts.settings;
    if (opts.db) networkOpts.db = opts.db;
    registerNetworkRoutes(app, opts.zigbeeAdapter, networkOpts);
    registerEventStreamRoute(app, opts.zigbeeAdapter);
  }

  const coordinatorOpts: Parameters<typeof registerCoordinatorRoutes>[1] = {};
  if (opts.serialPortLister) coordinatorOpts.lister = opts.serialPortLister;
  if (opts.settings) coordinatorOpts.settings = opts.settings;
  registerCoordinatorRoutes(app, coordinatorOpts);

  const serveWeb = opts.serveStaticWeb ?? shouldServeStaticWeb();
  if (serveWeb) {
    const registerOpts = opts.staticWebRoot ? { root: opts.staticWebRoot } : {};
    await registerStaticWeb(app, registerOpts);
  }

  return app;
}
