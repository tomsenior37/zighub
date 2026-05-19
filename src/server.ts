import Fastify, { type FastifyInstance } from "fastify";
import type Database from "better-sqlite3";
import { registerAutomationsRoutes } from "./automationsRoutes.js";
import { registerCoordinatorRoutes } from "./coordinatorRoutes.js";
import { registerDevicesRoutes } from "./devicesRoutes.js";
import { registerLocationsRoutes } from "./locationsRoutes.js";
import { registerSetupStateRoutes } from "./setupStateRoutes.js";
import type { SerialPortLister } from "./coordinator/serialPorts.js";
import type { SettingsRepo } from "./domain/settings.js";
import { registerEventStreamRoute } from "./eventsStream.js";
import { registerNetworkRoutes } from "./networkRoutes.js";
import { registerStaticWeb, shouldServeStaticWeb } from "./staticWeb.js";
import { VERSION } from "./version.js";
import { registerZigbeeRoutes, type ZigbeeRuntimeInfo } from "./zigbeeRoutes.js";
import type { ZigbeeAdapter } from "./zigbee/index.js";

export interface BuildServerOptions {
  logger?: boolean;
  staticWebRoot?: string;
  serveStaticWeb?: boolean;
  zigbeeAdapter?: ZigbeeAdapter;
  serialPortLister?: SerialPortLister;
  settings?: SettingsRepo;
  db?: Database.Database;
  zigbeeRuntime?: ZigbeeRuntimeInfo;
}

export async function buildServer(opts: BuildServerOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: opts.logger ?? false,
  });

  app.get("/health", () => ({ status: "ok", version: VERSION }));

  if (opts.zigbeeAdapter) {
    registerZigbeeRoutes(app, opts.zigbeeAdapter, opts.zigbeeRuntime);
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

  if (opts.db) {
    const devicesOpts: Parameters<typeof registerDevicesRoutes>[1] = { db: opts.db };
    if (opts.zigbeeAdapter) devicesOpts.adapter = opts.zigbeeAdapter;
    registerDevicesRoutes(app, devicesOpts);
    registerLocationsRoutes(app, opts.db);
    registerAutomationsRoutes(app, { db: opts.db });
  }

  if (opts.settings) {
    const setupOpts: Parameters<typeof registerSetupStateRoutes>[1] = { settings: opts.settings };
    if (opts.db) setupOpts.db = opts.db;
    registerSetupStateRoutes(app, setupOpts);
  }

  const serveWeb = opts.serveStaticWeb ?? shouldServeStaticWeb();
  if (serveWeb) {
    const registerOpts = opts.staticWebRoot ? { root: opts.staticWebRoot } : {};
    await registerStaticWeb(app, registerOpts);
  }

  return app;
}
