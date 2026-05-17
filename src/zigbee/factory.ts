import { createHerdsmanAdapter, type HerdsmanAdapterOptions } from "./herdsmanAdapter.js";
import { createMockAdapter, type MockAdapterOptions } from "./mockAdapter.js";
import type { ZigbeeAdapter } from "./adapter.js";
import { SETTINGS_KEYS, type SettingsRepo } from "../domain/settings.js";

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
  settings?: SettingsRepo;
}

interface CoordinatorSelection {
  path: string;
  selectedAt: number;
}

function resolveCoordinatorPath(
  config: ZigbeeFactoryConfig,
  settings: SettingsRepo | undefined,
): string | undefined {
  if (config.coordinatorPath) return config.coordinatorPath;
  if (!settings) return undefined;
  const stored = settings.get<CoordinatorSelection>(SETTINGS_KEYS.COORDINATOR_PATH);
  return stored?.path;
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

  const coordinatorPath = resolveCoordinatorPath(config, deps.settings);
  if (!coordinatorPath || !config.databasePath) {
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
    coordinatorPath,
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
