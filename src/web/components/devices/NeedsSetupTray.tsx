import type { Device } from "../../hooks/useDevices";
import { DeviceCard } from "./DeviceCard";

interface NeedsSetupTrayProps {
  devices: Device[];
}

export function NeedsSetupTray({ devices }: NeedsSetupTrayProps) {
  if (devices.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="needs-setup-heading"
      className="mb-8 rounded border border-amber-200 bg-amber-50 p-4"
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 id="needs-setup-heading" className="text-lg font-semibold text-amber-950">
            Needs setup
          </h2>
          <p className="mt-1 text-sm text-amber-800">
            Name and place newly joined devices before using them in automations.
          </p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-amber-800">
          {devices.length.toString()} {devices.length === 1 ? "device" : "devices"}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {devices.map((device) => (
          <DeviceCard key={device.z2m_id} device={device} />
        ))}
      </div>
    </section>
  );
}
