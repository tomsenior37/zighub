import type Database from "better-sqlite3";
import type { FastifyInstance } from "fastify";
import { get as getDevice, list as listDevices } from "./domain/devices.js";
import { log as auditLog } from "./domain/auditLog.js";
import { ZigbeeAdapterError, type ZigbeeAdapter } from "./zigbee/index.js";

export interface DevicesRoutesOptions {
  db: Database.Database;
  adapter?: ZigbeeAdapter;
  staleAfterMs?: number;
}

function isOnline(lastSeenAt: string | null, staleAfterMs: number): boolean {
  if (!lastSeenAt) return false;
  const seen = Date.parse(`${lastSeenAt} UTC`);
  if (Number.isNaN(seen)) return false;
  return Date.now() - seen <= staleAfterMs;
}

export function registerDevicesRoutes(app: FastifyInstance, opts: DevicesRoutesOptions): void {
  const { db, adapter } = opts;
  const staleAfterMs =
    opts.staleAfterMs ?? Number.parseInt(process.env.ZIGHUB_DEVICE_STALE_MS ?? "300000", 10);

  app.get("/api/devices", () => {
    const groups = listDevices(db);
    return groups.map((g) => ({
      location: g.location,
      devices: g.devices.map((d) => ({
        ...d,
        online: isOnline(d.last_seen_at, staleAfterMs),
      })),
    }));
  });

  app.get<{ Params: { ieeeAddress: string } }>("/api/devices/:ieeeAddress", (request, reply) => {
    const device = getDevice(db, request.params.ieeeAddress);
    if (!device) {
      return reply
        .code(404)
        .send({ error: "device_not_found", ieeeAddress: request.params.ieeeAddress });
    }
    return reply.send({ ...device, online: isOnline(device.last_seen_at, staleAfterMs) });
  });

  if (adapter) {
    app.post<{
      Params: { ieeeAddress: string };
      Body: Record<string, unknown>;
    }>(
      "/api/devices/:ieeeAddress/command",
      {
        schema: {
          body: { type: "object", additionalProperties: true, maxProperties: 16 },
        },
      },
      async (request, reply) => {
        const { ieeeAddress } = request.params;
        const device = getDevice(db, ieeeAddress);
        if (!device) {
          return reply.code(404).send({ error: "device_not_found", ieeeAddress });
        }
        try {
          const result = await adapter.sendCommand(ieeeAddress, request.body);
          auditLog(db, {
            category: "zigbee",
            event: "device-command",
            details: { ieeeAddress, payload: request.body },
          });
          return reply.send(result);
        } catch (err) {
          if (err instanceof ZigbeeAdapterError) {
            const status = err.code === "UNKNOWN_DEVICE" ? 404 : 502;
            return reply.code(status).send({ error: err.code, message: err.message });
          }
          throw err;
        }
      },
    );
  }
}
