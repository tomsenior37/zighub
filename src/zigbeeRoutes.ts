import type { FastifyInstance } from "fastify";
import type { ZigbeeAdapter, ZigbeeStatus } from "./zigbee/index.js";

declare module "fastify" {
  interface FastifyInstance {
    zigbee?: ZigbeeAdapter;
  }
}

export type ZigbeeAdapterMode = "mock" | "herdsman";

export interface ZigbeeRuntimeInfo {
  adapterMode: ZigbeeAdapterMode;
  adapterReason: string;
}

export interface ZigbeeRuntimeStatus extends ZigbeeStatus, ZigbeeRuntimeInfo {
  mockMode: boolean;
}

export function registerZigbeeRoutes(
  app: FastifyInstance,
  adapter: ZigbeeAdapter,
  runtime: ZigbeeRuntimeInfo = {
    adapterMode: "mock",
    adapterReason: "adapter mode metadata was not supplied",
  },
): void {
  app.decorate("zigbee", adapter);

  app.get("/api/zigbee/status", () => {
    return {
      ...adapter.getStatus(),
      adapterMode: runtime.adapterMode,
      adapterReason: runtime.adapterReason,
      mockMode: runtime.adapterMode === "mock",
    } satisfies ZigbeeRuntimeStatus;
  });
}
