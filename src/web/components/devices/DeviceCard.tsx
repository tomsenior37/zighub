import type { Device } from "../../hooks/useDevices";
import { relativeTime } from "../../lib/relativeTime";

interface DeviceCardProps {
  device: Device;
}

export function DeviceCard({ device }: DeviceCardProps) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-900">{device.friendly_name}</h3>
        <span
          className={
            device.online
              ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700"
              : "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500"
          }
          aria-label={device.online ? "online" : "offline"}
        >
          {device.online ? "Online" : "Offline"}
        </span>
      </header>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm text-slate-600">
        {device.model && (
          <>
            <dt className="text-slate-400">Model</dt>
            <dd>{device.model}</dd>
          </>
        )}
        {device.manufacturer && (
          <>
            <dt className="text-slate-400">Make</dt>
            <dd>{device.manufacturer}</dd>
          </>
        )}
        <dt className="text-slate-400">IEEE</dt>
        <dd className="font-mono text-xs">{device.z2m_id}</dd>
        <dt className="text-slate-400">Last seen</dt>
        <dd>{relativeTime(device.last_seen_at)}</dd>
      </dl>
    </article>
  );
}
