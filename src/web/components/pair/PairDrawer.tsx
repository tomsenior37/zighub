import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  DEVICES_QUERY_KEY,
  useDevices,
  type Device,
  type DeviceGroup,
} from "../../hooks/useDevices";
import { usePermitJoinStatus, useStartPermitJoin } from "../../hooks/usePermitJoin";

interface PairDrawerProps {
  open: boolean;
  onClose: () => void;
  defaultDurationSec?: number;
}

function formatRemaining(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString()}m ${s.toString().padStart(2, "0")}s`;
}

export function PairDrawer({ open, onClose, defaultDurationSec = 120 }: PairDrawerProps) {
  if (!open) return null;
  return <PairDrawerInner onClose={onClose} defaultDurationSec={defaultDurationSec} />;
}

interface PairDrawerInnerProps {
  onClose: () => void;
  defaultDurationSec: number;
}

function PairDrawerInner({ onClose, defaultDurationSec }: PairDrawerInnerProps) {
  const qc = useQueryClient();
  const startMutation = useStartPermitJoin();
  const status = usePermitJoinStatus({ enabled: true });
  const devicesQuery = useDevices();

  const [baselineIds] = useState<string[]>(() => {
    const cached = qc.getQueryData<DeviceGroup[]>([...DEVICES_QUERY_KEY]) ?? [];
    return cached.flatMap((g) => g.devices.map((d) => d.z2m_id));
  });

  useEffect(() => {
    startMutation.mutate(defaultDurationSec);
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

  const remainingSec = status.data?.remainingSec ?? defaultDurationSec;
  const active = status.data?.active ?? false;

  const stopAndClose = async () => {
    try {
      await fetch("/api/network/permit-join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationSec: 0 }),
      });
    } finally {
      onClose();
    }
  };

  return (
    <aside
      role="dialog"
      aria-label="Pair new device"
      className="fixed inset-y-0 right-0 z-30 w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white shadow-xl"
    >
      <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-slate-900">Pair a new device</h2>
        <button
          type="button"
          onClick={() => void stopAndClose()}
          className="text-slate-500 hover:text-slate-900"
        >
          Close
        </button>
      </header>

      <section className="px-6 py-4">
        <p className="text-sm text-slate-600">
          {active ? (
            <>
              Pairing window open. Time remaining:{" "}
              <span className="font-mono">{formatRemaining(remainingSec)}</span>
            </>
          ) : (
            <>Pairing window is closed.</>
          )}
        </p>
        <button
          type="button"
          onClick={() => void stopAndClose()}
          className="mt-2 rounded border border-rose-200 px-3 py-1 text-sm text-rose-700 hover:bg-rose-50"
        >
          Stop
        </button>
      </section>

      <section className="px-6 py-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          New devices
        </h3>
        {newJoiners.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            Waiting for a device — put it in pairing mode now.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {newJoiners.map((d) => (
              <li key={d.z2m_id} className="rounded border border-slate-200 px-3 py-2 text-sm">
                <div className="font-medium text-slate-900">{d.friendly_name}</div>
                <div className="font-mono text-xs text-slate-500">{d.z2m_id}</div>
                {d.model && <div className="text-xs text-slate-500">{d.model}</div>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="border-t border-slate-200 px-6 py-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded bg-sky-600 px-3 py-1 text-sm font-medium text-white hover:bg-sky-700"
        >
          Done
        </button>
      </footer>
    </aside>
  );
}
