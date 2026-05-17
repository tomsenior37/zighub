import { describe, expect, it } from "vitest";
import {
  __testing,
  listSerialPorts,
  type RawSerialPortEntry,
  type SerialPortLister,
} from "./serialPorts.js";

const { normaliseHexId } = __testing;

describe("normaliseHexId", () => {
  it.each([
    ["10c4", "10c4"],
    ["10C4", "10c4"],
    ["0x10c4", "10c4"],
    ["0X10C4", "10c4"],
    ["  10C4 ", "10c4"],
  ])("normalises %s to %s", (input, expected) => {
    expect(normaliseHexId(input)).toBe(expected);
  });

  it("returns undefined for empty strings and undefined", () => {
    expect(normaliseHexId("")).toBeUndefined();
    expect(normaliseHexId("   ")).toBeUndefined();
    expect(normaliseHexId(undefined)).toBeUndefined();
  });
});

describe("listSerialPorts", () => {
  function fakeLister(entries: RawSerialPortEntry[]): SerialPortLister {
    return { list: () => Promise.resolve(entries) };
  }

  it("normalises uppercase VID/PID to lowercase hex without 0x prefix", async () => {
    const result = await listSerialPorts(
      fakeLister([
        {
          path: "/dev/ttyUSB0",
          manufacturer: "Silicon Labs",
          vendorId: "0x10C4",
          productId: "EA60",
        },
      ]),
    );
    expect(result).toEqual([
      {
        path: "/dev/ttyUSB0",
        manufacturer: "Silicon Labs",
        vendorId: "10c4",
        productId: "ea60",
      },
    ]);
  });

  it("returns an empty array when no ports are present", async () => {
    const result = await listSerialPorts(fakeLister([]));
    expect(result).toEqual([]);
  });

  it("omits undefined optional fields cleanly", async () => {
    const result = await listSerialPorts(fakeLister([{ path: "/dev/ttyACM0" }]));
    expect(result).toEqual([{ path: "/dev/ttyACM0" }]);
  });

  it("preserves manufacturer, serialNumber, and pnpId as-is", async () => {
    const result = await listSerialPorts(
      fakeLister([
        {
          path: "/dev/ttyACM0",
          manufacturer: "dresden elektronik ingenieurtechnik GmbH",
          serialNumber: "DE2461616",
          pnpId: "usb-dresden_elektronik_ingenieurtechnik_GmbH_ConBee_II_DE2461616-if00",
          vendorId: "1cf1",
          productId: "0030",
        },
      ]),
    );
    expect(result[0]).toMatchObject({
      manufacturer: "dresden elektronik ingenieurtechnik GmbH",
      serialNumber: "DE2461616",
      pnpId: expect.stringContaining("ConBee_II"),
    });
  });
});
