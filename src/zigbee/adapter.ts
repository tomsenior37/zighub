export interface ZigbeeJoinedDevice {
  ieeeAddress: string;
  networkAddress: number;
  modelId?: string;
  manufacturerName?: string;
  lastSeen?: number;
}

export interface ZigbeeStatus {
  running: boolean;
  coordinatorPath?: string;
  panId?: number;
  channel?: number;
}

export interface ZigbeeJoinStatus {
  active: boolean;
  remainingSec: number;
}

export type ZigbeeEvent =
  | { type: "deviceJoined"; device: ZigbeeJoinedDevice }
  | { type: "deviceLeft"; ieeeAddress: string }
  | { type: "deviceMessage"; ieeeAddress: string; payload: Record<string, unknown> };

export type ZigbeeEventHandler = (event: ZigbeeEvent) => void;

export type Unsubscribe = () => void;

export interface NetworkInfo {
  panId: number;
  channel: number;
  extendedPanId: string;
  networkKeyHash: string;
  createdAt: number;
}

export interface CreateNetworkOptions {
  channel?: number;
  panId?: number;
}

export interface DeviceDefinition {
  modelId?: string;
  manufacturerName?: string;
  exposes: Record<string, unknown>[];
}

export interface ZigbeeAdapter {
  start(): Promise<void>;
  stop(): Promise<void>;
  getStatus(): ZigbeeStatus;
  permitJoin(durationSec: number): Promise<void>;
  getJoinStatus(): ZigbeeJoinStatus;
  listJoinedDevices(): Promise<ZigbeeJoinedDevice[]>;
  onEvent(handler: ZigbeeEventHandler): Unsubscribe;
  createNetwork(opts?: CreateNetworkOptions): Promise<NetworkInfo>;
  getNetworkInfo(): NetworkInfo | null;
  getDeviceDefinition(ieeeAddress: string): Promise<DeviceDefinition | null>;
}

export const NETWORK_CHANNEL_MIN = 11;
export const NETWORK_CHANNEL_MAX = 26;
export const NETWORK_PAN_ID_MIN = 0x0001;
export const NETWORK_PAN_ID_MAX = 0xfffe;
export const NETWORK_DEFAULT_CHANNEL = 15;

export class ZigbeeAdapterError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ZigbeeAdapterError";
    this.code = code;
  }
}

export const PERMIT_JOIN_MAX_SEC = 255;
