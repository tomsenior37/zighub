import { Controller } from "zigbee-herdsman";
import {
  ZigbeeAdapterError,
  type ZigbeeAdapter,
  type ZigbeeEventHandler,
  type ZigbeeJoinStatus,
  type ZigbeeJoinedDevice,
  type ZigbeeStatus,
  type Unsubscribe,
} from "./adapter.js";

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

    permitJoin(): Promise<void> {
      return Promise.reject(notImplError("permitJoin"));
    },

    getJoinStatus(): ZigbeeJoinStatus {
      notImpl("getJoinStatus");
    },

    listJoinedDevices(): Promise<ZigbeeJoinedDevice[]> {
      return Promise.reject(notImplError("listJoinedDevices"));
    },

    onEvent(_handler: ZigbeeEventHandler): Unsubscribe {
      notImpl("onEvent");
    },
  };
}
