import { useState } from "react";
import type { Device } from "../../hooks/useDevices";
import { useDeviceCommand } from "../../hooks/useDeviceCommand";

interface DeviceControlsProps {
  device: Device;
}

function hasCapability(device: Device, property: string): boolean {
  return device.capabilities?.some((cap) => cap.property === property) ?? false;
}

export function DeviceControls({ device }: DeviceControlsProps) {
  const command = useDeviceCommand();
  const [brightness, setBrightness] = useState(127);
  const supportsState = hasCapability(device, "state");
  const supportsBrightness = hasCapability(device, "brightness");

  if (!supportsState && !supportsBrightness) {
    return null;
  }

  const send = (payload: Record<string, unknown>) => {
    command.mutate({ ieeeAddress: device.z2m_id, payload });
  };

  return (
    <section className="mt-4 border-t border-slate-200 pt-3" aria-label="Device controls">
      <h4 className="text-sm font-medium text-slate-700">Controls</h4>
      {supportsState && (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            disabled={command.isPending}
            onClick={() => send({ state: "ON" })}
            className="rounded bg-emerald-600 px-3 py-1 text-sm font-medium text-white hover:bg-emerald-700 disabled:bg-slate-300"
          >
            On
          </button>
          <button
            type="button"
            disabled={command.isPending}
            onClick={() => send({ state: "OFF" })}
            className="rounded border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Off
          </button>
        </div>
      )}
      {supportsBrightness && (
        <div className="mt-3">
          <label className="block text-sm text-slate-600">
            <span className="flex items-center justify-between gap-3">
              <span>Brightness</span>
              <span className="font-mono text-xs">{brightness.toString()}</span>
            </span>
            <input
              type="range"
              min={0}
              max={254}
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              className="mt-1 w-full"
            />
          </label>
          <button
            type="button"
            disabled={command.isPending}
            onClick={() => send({ brightness })}
            className="mt-2 rounded border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Set brightness
          </button>
        </div>
      )}
      {command.isError && (
        <p role="alert" className="mt-2 text-sm text-rose-600">
          Could not send command.
        </p>
      )}
      {command.isSuccess && (
        <p role="status" className="mt-2 text-sm text-emerald-700">
          Command sent.
        </p>
      )}
    </section>
  );
}
