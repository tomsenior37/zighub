import type { FastifyInstance } from "fastify";
import type Database from "better-sqlite3";
import {
  NETWORK_CHANNEL_MAX,
  NETWORK_CHANNEL_MIN,
  NETWORK_PAN_ID_MAX,
  NETWORK_PAN_ID_MIN,
  PERMIT_JOIN_MAX_SEC,
  type CreateNetworkOptions,
  type NetworkInfo,
  type ZigbeeAdapter,
} from "./zigbee/index.js";
import { SETTINGS_KEYS, type SettingsRepo } from "./domain/settings.js";
import { log as auditLog } from "./domain/auditLog.js";

interface CreateNetworkBody {
  channel?: number;
  panId?: number;
}

interface PermitJoinBody {
  durationSec: number;
}

export interface NetworkRoutesOptions {
  settings?: SettingsRepo;
  db?: Database.Database;
}

export function registerNetworkRoutes(
  app: FastifyInstance,
  adapter: ZigbeeAdapter,
  opts: NetworkRoutesOptions = {},
): void {
  app.get("/api/network", () => {
    const live = adapter.getNetworkInfo();
    if (live) return live;
    return opts.settings?.get<NetworkInfo>(SETTINGS_KEYS.NETWORK_INFO) ?? null;
  });

  app.post<{ Body: CreateNetworkBody }>(
    "/api/network/create",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            channel: {
              type: "integer",
              minimum: NETWORK_CHANNEL_MIN,
              maximum: NETWORK_CHANNEL_MAX,
            },
            panId: {
              type: "integer",
              minimum: NETWORK_PAN_ID_MIN,
              maximum: NETWORK_PAN_ID_MAX,
            },
          },
          additionalProperties: false,
        },
      },
    },
    async (request) => {
      const body = request.body;
      const opts2: CreateNetworkOptions = {};
      if (body.channel !== undefined) opts2.channel = body.channel;
      if (body.panId !== undefined) opts2.panId = body.panId;

      const info = await adapter.createNetwork(opts2);
      opts.settings?.set(SETTINGS_KEYS.NETWORK_INFO, info);
      return info;
    },
  );

  app.get("/api/network/permit-join", () => {
    return adapter.getJoinStatus();
  });

  app.post<{ Body: PermitJoinBody }>(
    "/api/network/permit-join",
    {
      schema: {
        body: {
          type: "object",
          required: ["durationSec"],
          properties: {
            durationSec: {
              type: "integer",
              minimum: 0,
              maximum: PERMIT_JOIN_MAX_SEC,
            },
          },
          additionalProperties: false,
        },
      },
    },
    async (request) => {
      const { durationSec } = request.body;
      await adapter.permitJoin(durationSec);
      if (opts.db) {
        auditLog(opts.db, {
          category: "network",
          event: durationSec === 0 ? "permit-join-stop" : "permit-join-open",
          details: { durationSec },
        });
      }
      return adapter.getJoinStatus();
    },
  );
}
