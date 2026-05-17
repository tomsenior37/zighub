import { createHash, randomBytes, randomInt } from "node:crypto";
import {
  NETWORK_CHANNEL_MAX,
  NETWORK_CHANNEL_MIN,
  NETWORK_DEFAULT_CHANNEL,
  NETWORK_PAN_ID_MAX,
  NETWORK_PAN_ID_MIN,
  ZigbeeAdapterError,
  type CreateNetworkOptions,
  type NetworkInfo,
} from "./adapter.js";

export function validateChannel(channel: number): number {
  if (
    !Number.isInteger(channel) ||
    channel < NETWORK_CHANNEL_MIN ||
    channel > NETWORK_CHANNEL_MAX
  ) {
    throw new ZigbeeAdapterError(
      "INVALID_CHANNEL",
      `channel must be integer in [${NETWORK_CHANNEL_MIN.toString()}, ${NETWORK_CHANNEL_MAX.toString()}]; got ${channel.toString()}`,
    );
  }
  return channel;
}

export function validatePanId(panId: number): number {
  if (!Number.isInteger(panId) || panId < NETWORK_PAN_ID_MIN || panId > NETWORK_PAN_ID_MAX) {
    throw new ZigbeeAdapterError(
      "INVALID_PAN_ID",
      `panId must be integer in [${NETWORK_PAN_ID_MIN.toString()}, ${NETWORK_PAN_ID_MAX.toString()}]; got ${panId.toString()}`,
    );
  }
  return panId;
}

export function hashNetworkKey(key: Buffer): string {
  return createHash("sha256").update(key).digest("hex");
}

export function buildNetworkInfo(
  opts: CreateNetworkOptions = {},
  now: number = Date.now(),
): NetworkInfo {
  const channel =
    opts.channel !== undefined ? validateChannel(opts.channel) : NETWORK_DEFAULT_CHANNEL;
  const panId =
    opts.panId !== undefined
      ? validatePanId(opts.panId)
      : randomInt(NETWORK_PAN_ID_MIN, NETWORK_PAN_ID_MAX + 1);
  const key = randomBytes(16);
  const extendedPanIdBytes = randomBytes(8);
  return {
    panId,
    channel,
    extendedPanId: extendedPanIdBytes.toString("hex"),
    networkKeyHash: hashNetworkKey(key),
    createdAt: now,
  };
}
