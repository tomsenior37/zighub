import { useState } from "react";
import type { Device } from "../../hooks/useDevices";
import { useLocations } from "../../hooks/useLocations";
import { useUpdateDevice } from "../../hooks/useUpdateDevice";
import { relativeTime } from "../../lib/relativeTime";
import { DeviceControls } from "./DeviceControls";

interface DeviceCardProps {
  device: Device;
}

export function DeviceCard({ device }: DeviceCardProps) {
  const [editing, setEditing] = useState(false);

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-900">{device.friendly_name}</h3>
        <div className="flex items-center gap-2">
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
          {!editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50"
            >
              Edit
            </button>
          )}
        </div>
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
      <DeviceControls device={device} />
      {editing && <DeviceEditForm device={device} onDone={() => setEditing(false)} />}
    </article>
  );
}

interface DeviceEditFormProps {
  device: Device;
  onDone: () => void;
}

function DeviceEditForm({ device, onDone }: DeviceEditFormProps) {
  const [name, setName] = useState(device.friendly_name);
  const [locationId, setLocationId] = useState<number | "" | "none">(device.location_id ?? "none");
  const locations = useLocations();
  const updateDevice = useUpdateDevice();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const patch: { friendly_name?: string; location_id?: number | null } = {};
    if (name !== device.friendly_name) patch.friendly_name = name;
    const newLocationId = locationId === "none" ? null : locationId === "" ? null : locationId;
    if (newLocationId !== device.location_id) patch.location_id = newLocationId;
    if (Object.keys(patch).length === 0) {
      onDone();
      return;
    }
    updateDevice.mutate({ ieeeAddress: device.z2m_id, ...patch }, { onSuccess: () => onDone() });
  };

  return (
    <form onSubmit={submit} className="mt-4 space-y-2 border-t border-slate-200 pt-3">
      <label className="block text-sm">
        <span className="block text-slate-500">Friendly name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
          maxLength={64}
        />
      </label>
      <label className="block text-sm">
        <span className="block text-slate-500">Location</span>
        <select
          value={locationId === "none" ? "none" : String(locationId)}
          onChange={(e) =>
            setLocationId(e.target.value === "none" ? "none" : Number(e.target.value))
          }
          className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
        >
          <option value="none">Unassigned</option>
          {locations.data?.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </label>
      {updateDevice.isError && (
        <p role="alert" className="text-sm text-rose-600">
          {updateDevice.error.status === 409
            ? "Another device already uses that name"
            : "Could not save changes"}
        </p>
      )}
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={updateDevice.isPending}
          className="rounded bg-sky-600 px-3 py-1 text-sm font-medium text-white hover:bg-sky-700 disabled:bg-slate-300"
        >
          {updateDevice.isPending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded border border-slate-300 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
