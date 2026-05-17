import { describe, expect, it } from "vitest";
import {
  NETWORK_CHANNEL_MAX,
  NETWORK_CHANNEL_MIN,
  NETWORK_DEFAULT_CHANNEL,
  NETWORK_PAN_ID_MAX,
  NETWORK_PAN_ID_MIN,
  ZigbeeAdapterError,
} from "./adapter.js";
import { buildNetworkInfo, hashNetworkKey, validateChannel, validatePanId } from "./network.js";

describe("validateChannel", () => {
  it.each([NETWORK_CHANNEL_MIN, NETWORK_CHANNEL_MAX, 15])("accepts channel %s", (c) => {
    expect(validateChannel(c)).toBe(c);
  });

  it.each([0, 10, 27, -1, 1.5])("rejects channel %s", (c) => {
    expect(() => validateChannel(c)).toThrow(ZigbeeAdapterError);
  });
});

describe("validatePanId", () => {
  it("accepts the valid range bounds", () => {
    expect(validatePanId(NETWORK_PAN_ID_MIN)).toBe(NETWORK_PAN_ID_MIN);
    expect(validatePanId(NETWORK_PAN_ID_MAX)).toBe(NETWORK_PAN_ID_MAX);
  });

  it.each([0, 0xffff, -1, 1.5])("rejects panId %s", (p) => {
    expect(() => validatePanId(p)).toThrow(ZigbeeAdapterError);
  });
});

describe("hashNetworkKey", () => {
  it("returns a 64-char lowercase hex digest", () => {
    const hash = hashNetworkKey(Buffer.alloc(16, 0));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("buildNetworkInfo", () => {
  it("uses defaults when no opts are passed", () => {
    const info = buildNetworkInfo();
    expect(info.channel).toBe(NETWORK_DEFAULT_CHANNEL);
    expect(info.panId).toBeGreaterThanOrEqual(NETWORK_PAN_ID_MIN);
    expect(info.panId).toBeLessThanOrEqual(NETWORK_PAN_ID_MAX);
    expect(info.extendedPanId).toMatch(/^[0-9a-f]{16}$/);
    expect(info.networkKeyHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("uses the provided channel and panId when specified", () => {
    const info = buildNetworkInfo({ channel: 25, panId: 0x1234 });
    expect(info.channel).toBe(25);
    expect(info.panId).toBe(0x1234);
  });

  it("uses the provided timestamp", () => {
    const info = buildNetworkInfo({}, 1_700_000_000_000);
    expect(info.createdAt).toBe(1_700_000_000_000);
  });
});
