import { beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { migrate } from "../db/migrate.js";
import { create as createLocation } from "./locations.js";
import {
  create,
  deleteDevice,
  get,
  list,
  rename,
  setLocation,
  setNotes,
  touchLastSeen,
  ValidationError,
} from "./devices.js";

function freshDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

const ID_A = "0x00124b001234abcd";
const ID_B = "0x00124b005678ef01";
const ID_C = "0x00124b00aabbccdd";

describe("devices.create", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = freshDb();
  });

  it("inserts a device and returns it with defaults", () => {
    const dev = create(db, { z2m_id: ID_A, friendly_name: "Hallway Switch" });
    expect(dev.z2m_id).toBe(ID_A);
    expect(dev.friendly_name).toBe("Hallway Switch");
    expect(dev.location_id).toBeNull();
    expect(dev.model).toBeNull();
    expect(dev.manufacturer).toBeNull();
    expect(dev.role).toBe("both");
    expect(dev.user_notes).toBeNull();
    expect(dev.created_at).toMatch(/^\d{4}-\d{2}-\d{2}/);
    expect(dev.last_seen_at).toBeNull();
  });

  it("inserts a device with all optional fields populated", () => {
    const loc = createLocation(db, { name: "Kitchen" });
    const dev = create(db, {
      z2m_id: ID_A,
      friendly_name: "Kitchen Bulb",
      location_id: loc.id,
      model: "TRADFRI bulb E27",
      manufacturer: "IKEA",
      role: "output",
      user_notes: "needs replacing",
    });
    expect(dev.location_id).toBe(loc.id);
    expect(dev.model).toBe("TRADFRI bulb E27");
    expect(dev.manufacturer).toBe("IKEA");
    expect(dev.role).toBe("output");
    expect(dev.user_notes).toBe("needs replacing");
  });

  it("rejects empty friendly_name", () => {
    expect(() => create(db, { z2m_id: ID_A, friendly_name: "" })).toThrow(ValidationError);
  });

  it("rejects whitespace-only friendly_name", () => {
    expect(() => create(db, { z2m_id: ID_A, friendly_name: "   " })).toThrow(ValidationError);
  });

  it("rejects empty z2m_id", () => {
    expect(() => create(db, { z2m_id: "", friendly_name: "X" })).toThrow(ValidationError);
  });

  it("rejects invalid role", () => {
    expect(() =>
      create(db, {
        z2m_id: ID_A,
        friendly_name: "X",
        // @ts-expect-error testing runtime validation
        role: "sideways",
      }),
    ).toThrow(ValidationError);
  });

  it("rejects duplicate z2m_id", () => {
    create(db, { z2m_id: ID_A, friendly_name: "X" });
    expect(() => create(db, { z2m_id: ID_A, friendly_name: "Y" })).toThrow();
  });

  it("rejects duplicate friendly_name", () => {
    create(db, { z2m_id: ID_A, friendly_name: "Same" });
    expect(() => create(db, { z2m_id: ID_B, friendly_name: "Same" })).toThrow();
  });

  it("rejects location_id pointing at a missing location", () => {
    expect(() => create(db, { z2m_id: ID_A, friendly_name: "X", location_id: 9999 })).toThrow(
      ValidationError,
    );
  });
});

describe("devices.list", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = freshDb();
  });

  it("returns an empty array on an empty table", () => {
    expect(list(db)).toEqual([]);
  });

  it("groups devices by location with location object or null", () => {
    const kitchen = createLocation(db, { name: "Kitchen" });
    const lounge = createLocation(db, { name: "Lounge" });
    create(db, { z2m_id: ID_A, friendly_name: "Kitchen Bulb", location_id: kitchen.id });
    create(db, { z2m_id: ID_B, friendly_name: "Lounge Lamp", location_id: lounge.id });
    create(db, { z2m_id: ID_C, friendly_name: "Unassigned Sensor" });

    const groups = list(db);
    expect(groups.length).toBe(3);

    const kitchenGroup = groups.find((g) => g.location?.id === kitchen.id);
    const loungeGroup = groups.find((g) => g.location?.id === lounge.id);
    const nullGroup = groups.find((g) => g.location === null);

    expect(kitchenGroup?.devices.map((d) => d.friendly_name)).toEqual(["Kitchen Bulb"]);
    expect(loungeGroup?.devices.map((d) => d.friendly_name)).toEqual(["Lounge Lamp"]);
    expect(nullGroup?.devices.map((d) => d.friendly_name)).toEqual(["Unassigned Sensor"]);
  });

  it("orders location groups alphabetically with unassigned (null) last", () => {
    const attic = createLocation(db, { name: "Attic" });
    const cellar = createLocation(db, { name: "Cellar" });
    const bedroom = createLocation(db, { name: "Bedroom" });
    create(db, { z2m_id: ID_A, friendly_name: "X", location_id: cellar.id });
    create(db, { z2m_id: ID_B, friendly_name: "Y", location_id: attic.id });
    create(db, { z2m_id: ID_C, friendly_name: "Z", location_id: bedroom.id });
    create(db, { z2m_id: "0x00124b00deadbeef", friendly_name: "Floating" });

    const groups = list(db);
    const names = groups.map((g) => g.location?.name ?? null);
    expect(names).toEqual(["Attic", "Bedroom", "Cellar", null]);
  });

  it("orders devices alphabetically within a group", () => {
    const loc = createLocation(db, { name: "Kitchen" });
    create(db, { z2m_id: ID_A, friendly_name: "Charlie", location_id: loc.id });
    create(db, { z2m_id: ID_B, friendly_name: "alpha", location_id: loc.id });
    create(db, { z2m_id: ID_C, friendly_name: "Bravo", location_id: loc.id });

    const groups = list(db);
    expect(groups[0]?.devices.map((d) => d.friendly_name)).toEqual(["alpha", "Bravo", "Charlie"]);
  });

  it("filters to one location when locationId is passed", () => {
    const kitchen = createLocation(db, { name: "Kitchen" });
    const lounge = createLocation(db, { name: "Lounge" });
    create(db, { z2m_id: ID_A, friendly_name: "Kitchen Bulb", location_id: kitchen.id });
    create(db, { z2m_id: ID_B, friendly_name: "Lounge Lamp", location_id: lounge.id });

    const groups = list(db, { locationId: kitchen.id });
    expect(groups.length).toBe(1);
    expect(groups[0]?.location?.id).toBe(kitchen.id);
    expect(groups[0]?.devices.map((d) => d.friendly_name)).toEqual(["Kitchen Bulb"]);
  });

  it("filters to unassigned devices when locationId is null", () => {
    const loc = createLocation(db, { name: "Kitchen" });
    create(db, { z2m_id: ID_A, friendly_name: "Kitchen Bulb", location_id: loc.id });
    create(db, { z2m_id: ID_B, friendly_name: "Floater" });

    const groups = list(db, { locationId: null });
    expect(groups.length).toBe(1);
    expect(groups[0]?.location).toBeNull();
    expect(groups[0]?.devices.map((d) => d.friendly_name)).toEqual(["Floater"]);
  });
});

describe("devices.get", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = freshDb();
  });

  it("returns the device when it exists", () => {
    const created = create(db, { z2m_id: ID_A, friendly_name: "Hallway" });
    expect(get(db, ID_A)).toEqual(created);
  });

  it("returns undefined for an unknown z2m_id", () => {
    expect(get(db, "0xnotreal")).toBeUndefined();
  });
});

describe("devices.rename", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = freshDb();
  });

  it("renames a device", () => {
    create(db, { z2m_id: ID_A, friendly_name: "Old" });
    const renamed = rename(db, ID_A, "New");
    expect(renamed.friendly_name).toBe("New");
    expect(get(db, ID_A)?.friendly_name).toBe("New");
  });

  it("rejects empty name", () => {
    create(db, { z2m_id: ID_A, friendly_name: "X" });
    expect(() => rename(db, ID_A, "")).toThrow(ValidationError);
  });

  it("rejects collision with another device's friendly_name", () => {
    create(db, { z2m_id: ID_A, friendly_name: "Alpha" });
    create(db, { z2m_id: ID_B, friendly_name: "Beta" });
    expect(() => rename(db, ID_B, "Alpha")).toThrow(ValidationError);
  });

  it("throws when device does not exist", () => {
    expect(() => rename(db, "0xnope", "X")).toThrow(ValidationError);
  });
});

describe("devices.setLocation", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = freshDb();
  });

  it("assigns a device to a location", () => {
    const loc = createLocation(db, { name: "Kitchen" });
    create(db, { z2m_id: ID_A, friendly_name: "Bulb" });
    const updated = setLocation(db, ID_A, loc.id);
    expect(updated.location_id).toBe(loc.id);
  });

  it("unassigns a device when locationId is null", () => {
    const loc = createLocation(db, { name: "Kitchen" });
    create(db, { z2m_id: ID_A, friendly_name: "Bulb", location_id: loc.id });
    const updated = setLocation(db, ID_A, null);
    expect(updated.location_id).toBeNull();
  });

  it("rejects a missing location id", () => {
    create(db, { z2m_id: ID_A, friendly_name: "Bulb" });
    expect(() => setLocation(db, ID_A, 9999)).toThrow(ValidationError);
  });

  it("throws when device does not exist", () => {
    expect(() => setLocation(db, "0xnope", null)).toThrow(ValidationError);
  });
});

describe("devices.setNotes", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = freshDb();
  });

  it("sets a non-empty note", () => {
    create(db, { z2m_id: ID_A, friendly_name: "X" });
    const updated = setNotes(db, ID_A, "low battery");
    expect(updated.user_notes).toBe("low battery");
  });

  it("clears notes when passed null", () => {
    create(db, { z2m_id: ID_A, friendly_name: "X", user_notes: "stale" });
    const updated = setNotes(db, ID_A, null);
    expect(updated.user_notes).toBeNull();
  });

  it("throws when device does not exist", () => {
    expect(() => setNotes(db, "0xnope", "x")).toThrow(ValidationError);
  });
});

describe("devices.touchLastSeen", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = freshDb();
  });

  it("updates last_seen_at from null to a timestamp", () => {
    create(db, { z2m_id: ID_A, friendly_name: "X" });
    expect(get(db, ID_A)?.last_seen_at).toBeNull();
    const updated = touchLastSeen(db, ID_A);
    expect(updated.last_seen_at).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });

  it("advances last_seen_at on subsequent calls", async () => {
    create(db, { z2m_id: ID_A, friendly_name: "X" });
    const first = touchLastSeen(db, ID_A).last_seen_at!;
    await new Promise((r) => setTimeout(r, 1100));
    const second = touchLastSeen(db, ID_A).last_seen_at!;
    expect(second >= first).toBe(true);
    expect(second).not.toBe(null);
  });

  it("throws when device does not exist", () => {
    expect(() => touchLastSeen(db, "0xnope")).toThrow(ValidationError);
  });
});

describe("devices.delete", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = freshDb();
  });

  it("removes the device", () => {
    create(db, { z2m_id: ID_A, friendly_name: "X" });
    deleteDevice(db, ID_A);
    expect(get(db, ID_A)).toBeUndefined();
  });

  it("is a no-op for an unknown z2m_id", () => {
    expect(() => deleteDevice(db, "0xnope")).not.toThrow();
  });
});

describe("devices and location FK behaviour", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = freshDb();
  });

  it("sets device location_id to NULL when the location is deleted", () => {
    const loc = createLocation(db, { name: "Kitchen" });
    create(db, { z2m_id: ID_A, friendly_name: "Bulb", location_id: loc.id });
    db.prepare("DELETE FROM locations WHERE id = ?").run(loc.id);
    expect(get(db, ID_A)?.location_id).toBeNull();
  });
});
