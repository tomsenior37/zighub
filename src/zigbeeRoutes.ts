import type { FastifyInstance } from "fastify";
import type { ZigbeeAdapter } from "./zigbee/index.js";

declare module "fastify" {
  interface FastifyInstance {
    zigbee?: ZigbeeAdapter;
  }
}

export function registerZigbeeRoutes(app: FastifyInstance, adapter: ZigbeeAdapter): void {
  app.decorate("zigbee", adapter);

  app.get("/api/zigbee/status", () => {
    return adapter.getStatus();
  });
}
