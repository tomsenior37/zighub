import { Controller } from "zigbee-herdsman";
import {
  PERMIT_JOIN_MAX_SEC,
  ZigbeeAdapterError,
  type CommandResult,
  type CreateNetworkOptions,
  type DeviceDefinition,
  type NetworkInfo,
  type PingResult,
  type ZigbeeAdapter,
  type ZigbeeEventHandler,
  type ZigbeeJoinStatus,
  type ZigbeeJoinedDevice,
  type ZigbeeStatus,
  type Unsubscribe,
} from "./adapter.js";
import { buildNetworkInfo } from "./network.js";

export interface HerdsmanAdapterOptions {
  coordinatorPath: string;
  databasePath: string;
  backupPath?: string;
  channel?: number;
  panId?: number;
  networkKey?: number[];
}

function notImplError(method: string): ZigbeeAdapterError {
  return new ZigbeeAdapterError(
    "NOT_IMPLEMENTED",
    `HerdsmanAdapter.${method}() is not implemented yet (skeleton — lands in a follow-up issue)`,
  );
}

function notImpl(method: string): never {
  throw notImplError(method);
}

export function createHerdsmanAdapter(opts: HerdsmanAdapterOptions): ZigbeeAdapter {
  let controller: Controller | null = null;
  let running = false;
  let cachedParams: { panId?: number; channel?: number } = {};
  let pendingNetwork: NetworkInfo | null = null;

  return {
    async start() {
      if (running) {
        throw new ZigbeeAdapterError("ALREADY_RUNNING", "adapter already started");
      }
      const controllerOptions = {
        network: {
          panID: opts.panId ?? 0x1a62,
          extendedPanID: [0xdd, 0xdd, 0xdd, 0xdd, 0xdd, 0xdd, 0xdd, 0xdd],
          channelList: [opts.channel ?? 11],
          networkKey: opts.networkKey ?? [
            0x01, 0x03, 0x05, 0x07, 0x09, 0x0b, 0x0d, 0x0f, 0x00, 0x02, 0x04, 0x06, 0x08, 0x0a,
            0x0c, 0x0d,
          ],
        },
        serialPort: { path: opts.coordinatorPath },
        databasePath: opts.databasePath,
        databaseBackupPath: `${opts.databasePath}.backup`,
        backupPath: opts.backupPath ?? `${opts.databasePath}.coordinator-backup.json`,
        acceptJoiningDeviceHandler: () => Promise.resolve(true),
      };

      controller = new Controller(
        controllerOptions as unknown as ConstructorParameters<typeof Controller>[0],
      );
      await controller.start();
      running = true;

      try {
        const params = await controller.getNetworkParameters();
        cachedParams = { panId: params.panID, channel: params.channel };
      } catch {
        cachedParams = {};
      }
    },

    async stop() {
      if (!running || !controller) {
        return;
      }
      try {
        await controller.stop();
      } finally {
        running = false;
        controller = null;
        cachedParams = {};
      }
    },

    getStatus(): ZigbeeStatus {
      if (!running || !controller) {
        return { running: false, coordinatorPath: opts.coordinatorPath };
      }
      return {
        running: true,
        coordinatorPath: opts.coordinatorPath,
        ...(cachedParams.panId !== undefined && { panId: cachedParams.panId }),
        ...(cachedParams.channel !== undefined && { channel: cachedParams.channel }),
      };
    },

    async permitJoin(durationSec: number): Promise<void> {
      if (!running || !controller) {
        throw new ZigbeeAdapterError("NOT_RUNNING", "adapter is not running");
      }
      if (!Number.isInteger(durationSec) || durationSec < 0 || durationSec > PERMIT_JOIN_MAX_SEC) {
        throw new ZigbeeAdapterError(
          "INVALID_DURATION",
          `durationSec must be integer in [0, ${PERMIT_JOIN_MAX_SEC.toString()}]; got ${durationSec.toString()}`,
        );
      }
      await controller.permitJoin(durationSec);
    },

    getJoinStatus(): ZigbeeJoinStatus {
      if (!running || !controller) {
        return { active: false, remainingSec: 0 };
      }
      try {
        const endsAt = controller.getPermitJoinEnd();
        if (typeof endsAt !== "number" || endsAt <= 0) {
          return { active: false, remainingSec: 0 };
        }
        const remainingMs = endsAt - Date.now();
        if (remainingMs <= 0) return { active: false, remainingSec: 0 };
        return { active: true, remainingSec: Math.ceil(remainingMs / 1000) };
      } catch {
        return { active: false, remainingSec: 0 };
      }
    },

    listJoinedDevices(): Promise<ZigbeeJoinedDevice[]> {
      return Promise.reject(notImplError("listJoinedDevices"));
    },

    onEvent(_handler: ZigbeeEventHandler): Unsubscribe {
      notImpl("onEvent");
    },

    createNetwork(networkOpts: CreateNetworkOptions = {}): Promise<NetworkInfo> {
      // herdsman drives real network creation from its Controller config on
      // start(); for now we validate, generate a deterministic descriptor,
      // and stash it for the next restart. Live re-keying is a follow-up.
      const info = buildNetworkInfo(networkOpts);
      pendingNetwork = info;
      return Promise.resolve(info);
    },

    getNetworkInfo(): NetworkInfo | null {
      return pendingNetwork;
    },

    async sendCommand(
      ieeeAddress: string,
      payload: Record<string, unknown>,
    ): Promise<CommandResult> {
      if (!running || !controller) {
        throw new ZigbeeAdapterError("NOT_RUNNING", "adapter is not running");
      }
      const device = controller.getDeviceByIeeeAddr(ieeeAddress) as
        | { endpoints?: Array<{ command: (...args: unknown[]) => Promise<unknown> }> }
        | undefined;
      if (!device) {
        throw new ZigbeeAdapterError("UNKNOWN_DEVICE", `device ${ieeeAddress} not paired`);
      }
      const endpoint = device.endpoints?.[0];
      if (!endpoint) {
        throw new ZigbeeAdapterError(
          "COMMAND_FAILED",
          `device ${ieeeAddress} has no endpoint to dispatch to`,
        );
      }

      try {
        if (payload.state === "ON" || payload.state === "OFF" || payload.state === "TOGGLE") {
          const cmd = payload.state === "ON" ? "on" : payload.state === "OFF" ? "off" : "toggle";
          await endpoint.command("genOnOff", cmd, {});
          return { accepted: true };
        }
        if (typeof payload.brightness === "number") {
          await endpoint.command("genLevelCtrl", "moveToLevel", {
            level: payload.brightness,
            transtime: 0,
          });
          return { accepted: true };
        }
        throw new ZigbeeAdapterError(
          "COMMAND_FAILED",
          `unsupported payload for v1 herdsman adapter; keys: ${Object.keys(payload).join(",")}`,
        );
      } catch (err) {
        if (err instanceof ZigbeeAdapterError) throw err;
        throw new ZigbeeAdapterError(
          "COMMAND_FAILED",
          err instanceof Error ? err.message : String(err),
        );
      }
    },

    async pingDevice(ieeeAddress: string): Promise<PingResult> {
      if (!running || !controller) return { ok: false };
      const device = controller.getDeviceByIeeeAddr(ieeeAddress) as
        | { ping?: () => Promise<unknown> }
        | undefined;
      if (!device || typeof device.ping !== "function") return { ok: false };
      const start = Date.now();
      try {
        await device.ping();
        return { ok: true, latencyMs: Date.now() - start };
      } catch {
        return { ok: false };
      }
    },

    async unpairDevice(ieeeAddress: string): Promise<void> {
      if (!running || !controller) {
        throw new ZigbeeAdapterError("NOT_RUNNING", "adapter is not running");
      }
      const device = controller.getDeviceByIeeeAddr(ieeeAddress) as
        | { removeFromNetwork?: () => Promise<void> }
        | undefined;
      if (!device || typeof device.removeFromNetwork !== "function") {
        throw new ZigbeeAdapterError("UNKNOWN_DEVICE", `device ${ieeeAddress} not paired`);
      }
      try {
        await device.removeFromNetwork();
      } catch (err) {
        throw new ZigbeeAdapterError(
          "UNPAIR_FAILED",
          err instanceof Error ? err.message : String(err),
        );
      }
    },

    getDeviceDefinition(ieeeAddress: string): Promise<DeviceDefinition | null> {
      if (!running || !controller) return Promise.resolve(null);
      try {
        const device = controller.getDeviceByIeeeAddr(ieeeAddress) as
          | {
              modelID?: string;
              manufacturerName?: string;
              definition?: { exposes?: Record<string, unknown>[] } | null;
            }
          | undefined;
        if (!device?.definition) return Promise.resolve(null);
        const result: DeviceDefinition = {
          exposes: device.definition.exposes ?? [],
        };
        if (device.modelID !== undefined) result.modelId = device.modelID;
        if (device.manufacturerName !== undefined)
          result.manufacturerName = device.manufacturerName;
        return Promise.resolve(result);
      } catch {
        return Promise.resolve(null);
      }
    },
  };
}
