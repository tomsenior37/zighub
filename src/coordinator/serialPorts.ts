import { SerialPort } from "serialport";

export interface SerialPortInfo {
  path: string;
  manufacturer?: string;
  serialNumber?: string;
  vendorId?: string;
  productId?: string;
  pnpId?: string;
}

function normaliseHexId(raw: string | undefined): string | undefined {
  if (raw === undefined || raw === null) return undefined;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return undefined;
  const withoutPrefix = trimmed.toLowerCase().startsWith("0x") ? trimmed.slice(2) : trimmed;
  return withoutPrefix.toLowerCase();
}

export interface RawSerialPortEntry {
  path: string;
  manufacturer?: string;
  serialNumber?: string;
  vendorId?: string;
  productId?: string;
  pnpId?: string;
}

export interface SerialPortLister {
  list(): Promise<RawSerialPortEntry[]>;
}

const defaultLister: SerialPortLister = {
  list: async () => {
    const raw = await SerialPort.list();
    return raw.map((entry) => {
      const out: RawSerialPortEntry = { path: entry.path };
      if (entry.manufacturer !== undefined) out.manufacturer = entry.manufacturer;
      if (entry.serialNumber !== undefined) out.serialNumber = entry.serialNumber;
      if (entry.vendorId !== undefined) out.vendorId = entry.vendorId;
      if (entry.productId !== undefined) out.productId = entry.productId;
      if (entry.pnpId !== undefined) out.pnpId = entry.pnpId;
      return out;
    });
  },
};

export async function listSerialPorts(
  lister: SerialPortLister = defaultLister,
): Promise<SerialPortInfo[]> {
  const raw = await lister.list();
  return raw.map((entry) => {
    const result: SerialPortInfo = { path: entry.path };
    if (entry.manufacturer !== undefined) result.manufacturer = entry.manufacturer;
    if (entry.serialNumber !== undefined) result.serialNumber = entry.serialNumber;
    if (entry.pnpId !== undefined) result.pnpId = entry.pnpId;
    const vid = normaliseHexId(entry.vendorId);
    if (vid !== undefined) result.vendorId = vid;
    const pid = normaliseHexId(entry.productId);
    if (pid !== undefined) result.productId = pid;
    return result;
  });
}

export const __testing = { normaliseHexId };
