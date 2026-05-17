import type Database from "better-sqlite3";
import { ValidationError } from "./errors.js";
import type { Location } from "./locations.js";

export { ValidationError };

export type DeviceRole = "input" | "output" | "both";
const DEVICE_ROLES: readonly DeviceRole[] = ["input", "output", "both"];

export interface Device {
  z2m_id: string;
  friendly_name: string;
  location_id: number | null;
  model: string | null;
  manufacturer: string | null;
  role: DeviceRole;
  user_notes: string | null;
  created_at: string;
  last_seen_at: string | null;
}

export interface CreateDeviceInput {
  z2m_id: string;
  friendly_name: string;
  location_id?: number | null;
  model?: string | null;
  manufacturer?: string | null;
  role?: DeviceRole;
  user_notes?: string | null;
}

export interface ListDevicesOptions {
  locationId?: number | null;
}

export interface DeviceGroup {
  location: Location | null;
  devices: Device[];
}

const DEVICE_COLUMNS =
  "z2m_id, friendly_name, location_id, model, manufacturer, role, user_notes, created_at, last_seen_at";

function normaliseRequired(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new ValidationError(`${field} must be a string`);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new ValidationError(`${field} must not be empty`);
  }
  return trimmed;
}

function assertRole(role: DeviceRole): void {
  if (!DEVICE_ROLES.includes(role)) {
    throw new ValidationError(`role must be one of ${DEVICE_ROLES.join(", ")}`);
  }
}

function assertLocationExists(db: Database.Database, locationId: number): void {
  const row = db.prepare("SELECT id FROM locations WHERE id = ?").get(locationId);
  if (!row) {
    throw new ValidationError(`location ${locationId} not found`);
  }
}

function isUniqueConstraintError(err: unknown, column: string): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message;
  return msg.includes("UNIQUE constraint failed") && msg.includes(`devices.${column}`);
}

export function create(db: Database.Database, input: CreateDeviceInput): Device {
  const z2mId = normaliseRequired(input.z2m_id, "z2m_id");
  const friendlyName = normaliseRequired(input.friendly_name, "friendly_name");
  const role: DeviceRole = input.role ?? "both";
  assertRole(role);

  const locationId = input.location_id ?? null;
  if (locationId !== null) {
    assertLocationExists(db, locationId);
  }

  try {
    db.prepare(
      `INSERT INTO devices (z2m_id, friendly_name, location_id, model, manufacturer, role, user_notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      z2mId,
      friendlyName,
      locationId,
      input.model ?? null,
      input.manufacturer ?? null,
      role,
      input.user_notes ?? null,
    );
  } catch (err) {
    if (isUniqueConstraintError(err, "friendly_name")) {
      throw new ValidationError(`friendly_name "${friendlyName}" is already in use`);
    }
    throw err;
  }

  const row = get(db, z2mId);
  if (!row) {
    throw new Error("failed to load device after insert");
  }
  return row;
}

export function get(db: Database.Database, z2mId: string): Device | undefined {
  return db.prepare(`SELECT ${DEVICE_COLUMNS} FROM devices WHERE z2m_id = ?`).get(z2mId) as
    | Device
    | undefined;
}

function requireDevice(db: Database.Database, z2mId: string): Device {
  const row = get(db, z2mId);
  if (!row) {
    throw new ValidationError(`device ${z2mId} not found`);
  }
  return row;
}

function fetchAllDevicesOrdered(
  db: Database.Database,
  where: string,
  params: unknown[] = [],
): Device[] {
  return db
    .prepare(
      `SELECT ${DEVICE_COLUMNS} FROM devices ${where}
       ORDER BY friendly_name COLLATE NOCASE ASC`,
    )
    .all(...params) as Device[];
}

function fetchLocations(db: Database.Database, ids: number[]): Map<number, Location> {
  const map = new Map<number, Location>();
  if (ids.length === 0) return map;
  const placeholders = ids.map(() => "?").join(", ");
  const rows = db
    .prepare(`SELECT id, name, parent_id, created_at FROM locations WHERE id IN (${placeholders})`)
    .all(...ids) as Location[];
  for (const r of rows) map.set(r.id, r);
  return map;
}

export function list(db: Database.Database, options: ListDevicesOptions = {}): DeviceGroup[] {
  let devices: Device[];
  if (options.locationId === undefined) {
    devices = fetchAllDevicesOrdered(db, "");
  } else if (options.locationId === null) {
    devices = fetchAllDevicesOrdered(db, "WHERE location_id IS NULL");
  } else {
    assertLocationExists(db, options.locationId);
    devices = fetchAllDevicesOrdered(db, "WHERE location_id = ?", [options.locationId]);
  }

  const locationIds = Array.from(
    new Set(devices.map((d) => d.location_id).filter((id): id is number => id !== null)),
  );
  const locations = fetchLocations(db, locationIds);

  const buckets = new Map<number | "null", Device[]>();
  for (const d of devices) {
    const key: number | "null" = d.location_id ?? "null";
    const arr = buckets.get(key) ?? [];
    arr.push(d);
    buckets.set(key, arr);
  }

  const namedGroups: DeviceGroup[] = [];
  for (const [key, devs] of buckets) {
    if (key === "null") continue;
    const loc = locations.get(key);
    if (!loc) continue;
    namedGroups.push({ location: loc, devices: devs });
  }
  namedGroups.sort((a, b) =>
    a.location!.name.localeCompare(b.location!.name, undefined, {
      sensitivity: "base",
    }),
  );

  const result: DeviceGroup[] = namedGroups;
  const unassigned = buckets.get("null");
  if (unassigned) {
    result.push({ location: null, devices: unassigned });
  }
  return result;
}

export function rename(db: Database.Database, z2mId: string, friendlyName: string): Device {
  const trimmed = normaliseRequired(friendlyName, "friendly_name");
  requireDevice(db, z2mId);
  try {
    db.prepare("UPDATE devices SET friendly_name = ? WHERE z2m_id = ?").run(trimmed, z2mId);
  } catch (err) {
    if (isUniqueConstraintError(err, "friendly_name")) {
      throw new ValidationError(`friendly_name "${trimmed}" is already in use`);
    }
    throw err;
  }
  return requireDevice(db, z2mId);
}

export function setLocation(
  db: Database.Database,
  z2mId: string,
  locationId: number | null,
): Device {
  requireDevice(db, z2mId);
  if (locationId !== null) {
    assertLocationExists(db, locationId);
  }
  db.prepare("UPDATE devices SET location_id = ? WHERE z2m_id = ?").run(locationId, z2mId);
  return requireDevice(db, z2mId);
}

export function setNotes(db: Database.Database, z2mId: string, notes: string | null): Device {
  requireDevice(db, z2mId);
  db.prepare("UPDATE devices SET user_notes = ? WHERE z2m_id = ?").run(notes, z2mId);
  return requireDevice(db, z2mId);
}

export function touchLastSeen(db: Database.Database, z2mId: string): Device {
  requireDevice(db, z2mId);
  db.prepare("UPDATE devices SET last_seen_at = datetime('now') WHERE z2m_id = ?").run(z2mId);
  return requireDevice(db, z2mId);
}

export function deleteDevice(db: Database.Database, z2mId: string): void {
  db.prepare("DELETE FROM devices WHERE z2m_id = ?").run(z2mId);
}
