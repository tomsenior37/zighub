import type { FastifyInstance } from "fastify";
import {
  NETWORK_CHANNEL_MAX,
  NETWORK_CHANNEL_MIN,
  NETWORK_PAN_ID_MAX,
  NETWORK_PAN_ID_MIN,
  type CreateNetworkOptions,
  type NetworkInfo,
  type ZigbeeAdapter,
} from "./zigbee/index.js";
import { SETTINGS_KEYS, type SettingsRepo } from "./domain/settings.js";

interface CreateNetworkBody {
  channel?: number;
  panId?: number;
}

export interface NetworkRoutesOptions {
  settings?: SettingsRepo;
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
}
