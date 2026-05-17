import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  DEVICES_QUERY_KEY,
  useDevices,
  type Device,
  type DeviceGroup,
} from "../../hooks/useDevices";
import { usePermitJoinStatus, useStartPermitJoin } from "../../hooks/usePermitJoin";
import { useUpdateDevice } from "../../hooks/useUpdateDevice";
import type { UseWizardApi } from "../useWizard";

interface PairStepProps {
  wizard: UseWizardApi;
}

function formatRemaining(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString()}m ${s.toString().padStart(2, "0")}s`;
}

const DEFAULT_DURATION_SEC = 120;

export function PairStep({ wizard: _wizard }: PairStepProps) {
  const qc = useQueryClient();
  const startMutation = useStartPermitJoin();
  const status = usePermitJoinStatus({ enabled: true });
  const devicesQuery = useDevices();

  const [baselineIds] = useState<string[]>(() => {
    const cached = qc.getQueryData<DeviceGroup[]>([...DEVICES_QUERY_KEY]) ?? [];
    return cached.flatMap((g) => g.devices.map((d) => d.z2m_id));
  });

  useEffect(() => {
    startMutation.mutate(DEFAULT_DURATION_SEC);
    return () => {
      // Close the pairing window when navigating away. Swallow errors —
      // we're already unmounting, nothing useful we can do with a rejection.
      try {
        void fetch("/api/network/permit-join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ durationSec: 0 }),
        }).catch(() => undefined);
      } catch {
        /* unmounting */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount, mutating once is the intent
  }, []);

  useEffect(() => {
    const id = setInterval(() => void devicesQuery.refetch(), 1000);
    return () => clearInterval(id);
  }, [devicesQuery]);

  const newJoiners: Device[] = useMemo(() => {
    if (!devicesQuery.data) return [];
    const baseline = new Set(baselineIds);
    return devicesQuery.data.flatMap((g) => g.devices).filter((d) => !baseline.has(d.z2m_id));
  }, [devicesQuery.data, baselineIds]);

  const remainingSec = status.data?.remainingSec ?? DEFAULT_DURATION_SEC;
  const active = status.data?.active ?? false;

  return (
    <section>
      <h2 className="text-xl font-semibold text-slate-900">Pair your devices</h2>
      <p className="mt-2 text-slate-600">
        Put each device into pairing mode now. They&rsquo;ll show up below as soon as they join.
      </p>

      <div className="mt-4 flex items-center gap-3 rounded border border-slate-200 bg-white p-3">
        {active ? (
          <>
            <span className="text-sm text-slate-600">Pairing window open:</span>
            <span className="font-mono text-sm">{formatRemaining(remainingSec)}</span>
            <button
              type="button"
              onClick={() => startMutation.mutate(0)}
              className="ml-auto rounded border border-rose-200 px-3 py-1 text-sm text-rose-700 hover:bg-rose-50"
            >
              Stop window
            </button>
          </>
        ) : (
          <>
            <span className="text-sm text-slate-500">Pairing window is closed.</span>
            <button
              type="button"
              onClick={() => startMutation.mutate(DEFAULT_DURATION_SEC)}
              className="ml-auto rounded border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
            >
              Re-open window
            </button>
          </>
        )}
      </div>

      <section className="mt-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          New devices ({newJoiners.length.toString()})
        </h3>
        {newJoiners.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            Waiting for a device — put one in pairing mode now.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {newJoiners.map((d) => (
              <NewJoinerRow key={d.z2m_id} device={d} />
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}

function NewJoinerRow({ device }: { device: Device }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(device.friendly_name);
  const updateMutation = useUpdateDevice();

  const save = () => {
    if (name === device.friendly_name) {
      setEditing(false);
      return;
    }
    updateMutation.mutate(
      { ieeeAddress: device.z2m_id, friendly_name: name },
      { onSuccess: () => setEditing(false) },
    );
  };

  return (
    <li className="rounded border border-slate-200 p-3 text-sm">
      <div className="flex items-center justify-between">
        <div>
          {editing ? (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1 font-medium"
              maxLength={64}
            />
          ) : (
            <div className="font-medium text-slate-900">{device.friendly_name}</div>
          )}
          <div className="font-mono text-xs text-slate-500">{device.z2m_id}</div>
          {device.model && <div className="text-xs text-slate-500">{device.model}</div>}
        </div>
        {editing ? (
          <button
            type="button"
            onClick={save}
            disabled={updateMutation.isPending}
            className="rounded bg-sky-600 px-3 py-1 text-xs text-white hover:bg-sky-700 disabled:bg-slate-300"
          >
            {updateMutation.isPending ? "Saving…" : "Save"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
          >
            Rename
          </button>
        )}
      </div>
      {updateMutation.isError && (
        <p role="alert" className="mt-2 text-xs text-rose-600">
          {updateMutation.error.status === 409
            ? "Another device already uses that name"
            : "Could not save changes"}
        </p>
      )}
    </li>
  );
}
