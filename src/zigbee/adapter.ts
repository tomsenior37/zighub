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

export interface ZigbeeAdapter {
  start(): Promise<void>;
  stop(): Promise<void>;
  getStatus(): ZigbeeStatus;
  permitJoin(durationSec: number): Promise<void>;
  getJoinStatus(): ZigbeeJoinStatus;
  listJoinedDevices(): Promise<ZigbeeJoinedDevice[]>;
  onEvent(handler: ZigbeeEventHandler): Unsubscribe;
}

export class ZigbeeAdapterError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ZigbeeAdapterError";
    this.code = code;
  }
}

export const PERMIT_JOIN_MAX_SEC = 255;
