import type Database from "better-sqlite3";
import type { FastifyInstance } from "fastify";
import {
  ValidationError,
  get as getDevice,
  list as listDevices,
  rename as renameDevice,
  setLocation,
} from "./domain/devices.js";
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

  app.patch<{
    Params: { ieeeAddress: string };
    Body: { friendly_name?: string; location_id?: number | null };
  }>(
    "/api/devices/:ieeeAddress",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            friendly_name: { type: "string", minLength: 1, maxLength: 64 },
            location_id: { type: ["integer", "null"] },
          },
          additionalProperties: false,
          minProperties: 1,
        },
      },
    },
    (request, reply) => {
      const { ieeeAddress } = request.params;
      const existing = getDevice(db, ieeeAddress);
      if (!existing) {
        return reply.code(404).send({ error: "device_not_found", ieeeAddress });
      }
      try {
        if (request.body.friendly_name !== undefined) {
          renameDevice(db, ieeeAddress, request.body.friendly_name);
          auditLog(db, {
            category: "devices",
            event: "renamed",
            details: { ieeeAddress, friendly_name: request.body.friendly_name },
          });
        }
        if (request.body.location_id !== undefined) {
          setLocation(db, ieeeAddress, request.body.location_id);
          auditLog(db, {
            category: "devices",
            event: "location-changed",
            details: { ieeeAddress, location_id: request.body.location_id },
          });
        }
      } catch (err) {
        if (err instanceof ValidationError) {
          if (err.message.includes("already in use")) {
            return reply.code(409).send({ error: "name_collision", message: err.message });
          }
          if (err.message.includes("location") && err.message.includes("not found")) {
            return reply.code(400).send({ error: "location_not_found", message: err.message });
          }
          return reply.code(400).send({ error: "invalid", message: err.message });
        }
        throw err;
      }
      const updated = getDevice(db, ieeeAddress);
      if (!updated) {
        return reply.code(404).send({ error: "device_not_found", ieeeAddress });
      }
      return reply.send({
        ...updated,
        online: isOnline(updated.last_seen_at, staleAfterMs),
      });
    },
  );

  if (adapter) {
    app.get<{ Params: { ieeeAddress: string } }>(
      "/api/devices/:ieeeAddress/ping",
      async (request, reply) => {
        const { ieeeAddress } = request.params;
        if (!getDevice(db, ieeeAddress)) {
          return reply.code(404).send({ error: "device_not_found", ieeeAddress });
        }
        const result = await adapter.pingDevice(ieeeAddress);
        return reply.send(result);
      },
    );

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
