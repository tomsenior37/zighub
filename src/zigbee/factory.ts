import { createHerdsmanAdapter, type HerdsmanAdapterOptions } from "./herdsmanAdapter.js";
import { createMockAdapter, type MockAdapterOptions } from "./mockAdapter.js";
import type { ZigbeeAdapter } from "./adapter.js";

export interface ZigbeeFactoryConfig {
  coordinatorPath?: string;
  databasePath?: string;
  backupPath?: string;
  channel?: number;
  panId?: number;
  mockOptions?: MockAdapterOptions;
}

export interface ZigbeeFactoryEnv {
  ZIGBEE_ENABLED?: string;
}

export interface ZigbeeFactoryResult {
  adapter: ZigbeeAdapter;
  kind: "mock" | "herdsman";
  reason: string;
}

export interface CreateZigbeeAdapterDeps {
  env?: ZigbeeFactoryEnv;
  logger?: { warn: (msg: string) => void };
}

export function createZigbeeAdapter(
  config: ZigbeeFactoryConfig = {},
  deps: CreateZigbeeAdapterDeps = {},
): ZigbeeFactoryResult {
  const env = deps.env ?? process.env;
  const enabled = env.ZIGBEE_ENABLED === "1";

  if (!enabled) {
    return {
      adapter: createMockAdapter(config.mockOptions ?? {}),
      kind: "mock",
      reason: "ZIGBEE_ENABLED is not '1'",
    };
  }

  if (!config.coordinatorPath || !config.databasePath) {
    deps.logger?.warn(
      "ZIGBEE_ENABLED=1 but coordinatorPath or databasePath is unset; falling back to the mock adapter",
    );
    return {
      adapter: createMockAdapter(config.mockOptions ?? {}),
      kind: "mock",
      reason: "missing coordinatorPath or databasePath",
    };
  }

  const herdsmanOpts: HerdsmanAdapterOptions = {
    coordinatorPath: config.coordinatorPath,
    databasePath: config.databasePath,
    ...(config.backupPath !== undefined && { backupPath: config.backupPath }),
    ...(config.channel !== undefined && { channel: config.channel }),
    ...(config.panId !== undefined && { panId: config.panId }),
  };

  return {
    adapter: createHerdsmanAdapter(herdsmanOpts),
    kind: "herdsman",
    reason: "ZIGBEE_ENABLED=1 with coordinator + database paths configured",
  };
}
