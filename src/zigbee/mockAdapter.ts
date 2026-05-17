import {
  PERMIT_JOIN_MAX_SEC,
  ZigbeeAdapterError,
  type CreateNetworkOptions,
  type NetworkInfo,
  type ZigbeeAdapter,
  type ZigbeeEvent,
  type ZigbeeEventHandler,
  type ZigbeeJoinStatus,
  type ZigbeeJoinedDevice,
  type ZigbeeStatus,
  type Unsubscribe,
} from "./adapter.js";
import { buildNetworkInfo } from "./network.js";

export interface MockAdapterOptions {
  now?: () => number;
  coordinatorPath?: string;
  panId?: number;
  channel?: number;
}

export interface MockZigbeeAdapter extends ZigbeeAdapter {
  simulateDeviceJoin(device: ZigbeeJoinedDevice): void;
  simulateDeviceLeave(ieeeAddress: string): void;
  simulateMessage(ieeeAddress: string, payload: Record<string, unknown>): void;
}

export function createMockAdapter(opts: MockAdapterOptions = {}): MockZigbeeAdapter {
  const now = opts.now ?? (() => Date.now());

  const state = {
    running: false,
    devices: new Map<string, ZigbeeJoinedDevice>(),
    handlers: new Set<ZigbeeEventHandler>(),
    permitJoinEndsAt: 0,
    network: null as NetworkInfo | null,
  };

  function ensureRunning(): void {
    if (!state.running) {
      throw new ZigbeeAdapterError("NOT_RUNNING", "adapter is not running");
    }
  }

  function emit(event: ZigbeeEvent): void {
    for (const handler of state.handlers) {
      handler(event);
    }
  }

  function joinStatus(): ZigbeeJoinStatus {
    const remainingMs = state.permitJoinEndsAt - now();
    if (remainingMs <= 0) {
      return { active: false, remainingSec: 0 };
    }
    return { active: true, remainingSec: Math.ceil(remainingMs / 1000) };
  }

  return {
    async start() {
      if (state.running) {
        throw new ZigbeeAdapterError("ALREADY_RUNNING", "adapter already started");
      }
      state.running = true;
      return Promise.resolve();
    },

    async stop() {
      if (!state.running) {
        return Promise.resolve();
      }
      state.running = false;
      state.permitJoinEndsAt = 0;
      state.handlers.clear();
      return Promise.resolve();
    },

    getStatus(): ZigbeeStatus {
      return {
        running: state.running,
        ...(opts.coordinatorPath !== undefined && { coordinatorPath: opts.coordinatorPath }),
        ...(opts.panId !== undefined && { panId: opts.panId }),
        ...(opts.channel !== undefined && { channel: opts.channel }),
      };
    },

    async permitJoin(durationSec: number) {
      ensureRunning();
      if (!Number.isInteger(durationSec) || durationSec < 0 || durationSec > PERMIT_JOIN_MAX_SEC) {
        throw new ZigbeeAdapterError(
          "INVALID_DURATION",
          `durationSec must be integer in [0, ${PERMIT_JOIN_MAX_SEC.toString()}]; got ${durationSec.toString()}`,
        );
      }
      state.permitJoinEndsAt = durationSec === 0 ? 0 : now() + durationSec * 1000;
      return Promise.resolve();
    },

    getJoinStatus(): ZigbeeJoinStatus {
      return joinStatus();
    },

    async listJoinedDevices(): Promise<ZigbeeJoinedDevice[]> {
      ensureRunning();
      return Promise.resolve([...state.devices.values()]);
    },

    onEvent(handler: ZigbeeEventHandler): Unsubscribe {
      state.handlers.add(handler);
      return () => state.handlers.delete(handler);
    },

    simulateDeviceJoin(device: ZigbeeJoinedDevice): void {
      ensureRunning();
      state.devices.set(device.ieeeAddress, device);
      emit({ type: "deviceJoined", device });
    },

    simulateDeviceLeave(ieeeAddress: string): void {
      ensureRunning();
      const existed = state.devices.delete(ieeeAddress);
      if (existed) {
        emit({ type: "deviceLeft", ieeeAddress });
      }
    },

    simulateMessage(ieeeAddress: string, payload: Record<string, unknown>): void {
      ensureRunning();
      emit({ type: "deviceMessage", ieeeAddress, payload });
    },

    async createNetwork(opts: CreateNetworkOptions = {}): Promise<NetworkInfo> {
      const info = buildNetworkInfo(opts, now());
      state.network = info;
      return Promise.resolve(info);
    },

    getNetworkInfo(): NetworkInfo | null {
      return state.network;
    },
  };
}
