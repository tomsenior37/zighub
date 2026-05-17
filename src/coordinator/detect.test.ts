import { describe, expect, it } from "vitest";
import { detectCoordinatorsFromPorts } from "./detect.js";

describe("detectCoordinatorsFromPorts", () => {
  it("returns an empty array for an empty input", () => {
    expect(detectCoordinatorsFromPorts([])).toEqual([]);
  });

  it("marks a Sonoff ZBDongle-E (10c4/ea60) as high confidence", () => {
    const result = detectCoordinatorsFromPorts([
      {
        path: "/dev/ttyUSB0",
        manufacturer: "Silicon Labs",
        vendorId: "10c4",
        productId: "ea60",
      },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.confidence).toBe("high");
    expect(result[0]?.match?.family).toBe("silabs-cp210x");
  });

  it("marks a ConBee II (1cf1/0030) as high confidence", () => {
    const result = detectCoordinatorsFromPorts([
      {
        path: "/dev/ttyACM0",
        manufacturer: "dresden elektronik",
        vendorId: "1cf1",
        productId: "0030",
      },
    ]);
    expect(result[0]?.confidence).toBe("high");
    expect(result[0]?.match?.family).toBe("deconz-conbee2");
  });

  it("downgrades a known VID with unknown PID to medium confidence", () => {
    const result = detectCoordinatorsFromPorts([
      {
        path: "/dev/ttyACM1",
        vendorId: "1cf1",
        productId: "ffff",
      },
    ]);
    expect(result[0]?.confidence).toBe("medium");
    expect(result[0]?.match).toBeNull();
  });

  it("flags a manufacturer-heuristic match (no VID) as low confidence", () => {
    const result = detectCoordinatorsFromPorts([
      { path: "/dev/ttyACM2", manufacturer: "Sonoff Generic" },
    ]);
    expect(result[0]?.confidence).toBe("low");
  });

  it("filters out the bluetooth blocklist entry", () => {
    const result = detectCoordinatorsFromPorts([
      {
        path: "/dev/ttyBT0",
        vendorId: "0a12",
        productId: "0001",
        manufacturer: "Cambridge Silicon Radio",
      },
    ]);
    expect(result).toEqual([]);
  });

  it("drops devices with no VID and no manufacturer match", () => {
    const result = detectCoordinatorsFromPorts([
      { path: "/dev/ttyMouse0", manufacturer: "Generic USB Mouse" },
    ]);
    expect(result).toEqual([]);
  });

  it("sorts high before medium before low, then path ascending", () => {
    const result = detectCoordinatorsFromPorts([
      { path: "/dev/ttyACM2", manufacturer: "Sonoff Generic" }, // low
      { path: "/dev/ttyACM0", vendorId: "1cf1", productId: "0033" }, // high (ConBee III)
      { path: "/dev/ttyACM1", vendorId: "1cf1", productId: "ffff" }, // medium
      { path: "/dev/ttyUSB0", vendorId: "10c4", productId: "ea60" }, // high (Sonoff E)
    ]);
    expect(result.map((r) => r.path)).toEqual([
      "/dev/ttyACM0",
      "/dev/ttyUSB0",
      "/dev/ttyACM1",
      "/dev/ttyACM2",
    ]);
  });
});
