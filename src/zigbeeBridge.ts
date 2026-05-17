import type Database from "better-sqlite3";
import { log as auditLog } from "./domain/auditLog.js";
import { ValidationError, create, deleteDevice, get as getDevice } from "./domain/devices.js";
import type { ZigbeeAdapter, ZigbeeEvent, ZigbeeJoinedDevice } from "./zigbee/index.js";

export interface ZigbeeBridgeDeps {
  adapter: ZigbeeAdapter;
  db: Database.Database;
  logger?: { error: (obj: unknown, msg?: string) => void };
}

export interface ZigbeeBridge {
  detach(): void;
}

const FRIENDLY_NAME_MAX_ATTEMPTS = 50;

function shortName(ieeeAddress: string): string {
  const compact = ieeeAddress.replace(/[^0-9a-f]/gi, "").toLowerCase();
  const tail = compact.length >= 6 ? compact.slice(-6) : compact;
  return `device_${tail}`;
}

function defaultDeviceUpdate(db: Database.Database, device: ZigbeeJoinedDevice): void {
  db.prepare(
    "UPDATE devices SET model = COALESCE(?, model), manufacturer = COALESCE(?, manufacturer), last_seen_at = datetime('now') WHERE z2m_id = ?",
  ).run(device.modelId ?? null, device.manufacturerName ?? null, device.ieeeAddress);
}

function insertWithUniqueName(
  db: Database.Database,
  device: ZigbeeJoinedDevice,
  base: string,
): void {
  for (let attempt = 0; attempt < FRIENDLY_NAME_MAX_ATTEMPTS; attempt++) {
    const friendly = attempt === 0 ? base : `${base}-${(attempt + 1).toString()}`;
    try {
      create(db, {
        z2m_id: device.ieeeAddress,
        friendly_name: friendly,
        model: device.modelId ?? null,
        manufacturer: device.manufacturerName ?? null,
      });
      return;
    } catch (err) {
      if (err instanceof ValidationError && err.message.includes("already in use")) {
        continue;
      }
      throw err;
    }
  }
  throw new Error(
    `gave up after ${FRIENDLY_NAME_MAX_ATTEMPTS.toString()} attempts finding a unique friendly_name based on '${base}'`,
  );
}

export function attachZigbeeBridge(deps: ZigbeeBridgeDeps): ZigbeeBridge {
  const { adapter, db, logger } = deps;

  const handler = (event: ZigbeeEvent): void => {
    try {
      if (event.type === "deviceJoined") {
        handleJoin(db, event.device);
      } else if (event.type === "deviceLeft") {
        handleLeave(db, event.ieeeAddress);
      }
    } catch (err) {
      logger?.error({ err, event }, "zigbeeBridge handler failed");
    }
  };

  const unsubscribe = adapter.onEvent(handler);

  return {
    detach() {
      unsubscribe();
    },
  };
}

function handleJoin(db: Database.Database, device: ZigbeeJoinedDevice): void {
  const existing = getDevice(db, device.ieeeAddress);
  if (existing) {
    defaultDeviceUpdate(db, device);
    auditLog(db, {
      category: "zigbee",
      event: "device-rejoined",
      details: {
        ieeeAddress: device.ieeeAddress,
        modelId: device.modelId ?? null,
        manufacturerName: device.manufacturerName ?? null,
      },
    });
    return;
  }

  insertWithUniqueName(db, device, shortName(device.ieeeAddress));
  auditLog(db, {
    category: "zigbee",
    event: "device-joined",
    details: {
      ieeeAddress: device.ieeeAddress,
      modelId: device.modelId ?? null,
      manufacturerName: device.manufacturerName ?? null,
    },
  });
}

function handleLeave(db: Database.Database, ieeeAddress: string): void {
  const existing = getDevice(db, ieeeAddress);
  if (existing) {
    deleteDevice(db, ieeeAddress);
    auditLog(db, {
      category: "zigbee",
      event: "device-left",
      details: {
        ieeeAddress,
        hadRow: true,
        friendlyName: existing.friendly_name,
      },
    });
    return;
  }
  auditLog(db, {
    category: "zigbee",
    event: "device-left",
    details: { ieeeAddress, hadRow: false },
  });
}

export const __testing = { shortName };
