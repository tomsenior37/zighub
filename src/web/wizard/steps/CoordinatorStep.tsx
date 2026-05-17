import { useState } from "react";
import {
  useDetectedCoordinators,
  usePorts,
  useSelectCoordinator,
  type DetectedCoordinator,
  type SerialPortInfo,
} from "../../hooks/useCoordinators";
import type { UseWizardApi } from "../useWizard";

interface CoordinatorStepProps {
  wizard: UseWizardApi;
}

function confidenceLabel(c: "high" | "medium" | "low"): string {
  switch (c) {
    case "high":
      return "Recommended";
    case "medium":
      return "Best guess";
    case "low":
      return "Manufacturer match only";
  }
}

function confidenceBadge(c: "high" | "medium" | "low"): string {
  const base = "rounded-full px-2 py-0.5 text-xs font-medium";
  switch (c) {
    case "high":
      return `${base} bg-emerald-100 text-emerald-700`;
    case "medium":
      return `${base} bg-amber-100 text-amber-700`;
    case "low":
      return `${base} bg-slate-200 text-slate-600`;
  }
}

export function CoordinatorStep({ wizard }: CoordinatorStepProps) {
  const detected = useDetectedCoordinators();
  const ports = usePorts();
  const selectMutation = useSelectCoordinator();
  const [showAllPorts, setShowAllPorts] = useState(false);

  const refresh = () => {
    void detected.refetch();
    void ports.refetch();
  };

  const onSelect = (path: string) => {
    selectMutation.mutate(path, {
      onSuccess: () => {
        wizard.markComplete("coordinator");
        wizard.next();
      },
    });
  };

  return (
    <section>
      <h2 className="text-xl font-semibold text-slate-900">Pick a coordinator</h2>
      <p className="mt-2 text-slate-600">
        Plug your Zigbee dongle in. We&rsquo;ll detect known coordinators automatically.
      </p>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={refresh}
          className="rounded border border-slate-300 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50"
        >
          Refresh
        </button>
        {(detected.isFetching || ports.isFetching) && (
          <span className="text-xs text-slate-400">scanning…</span>
        )}
      </div>

      {detected.isLoading && <p className="mt-4 text-slate-500">Scanning USB ports…</p>}

      {detected.isError && (
        <p role="alert" className="mt-4 text-rose-600">
          Could not scan for coordinators.
        </p>
      )}

      {detected.isSuccess && detected.data.length === 0 && (
        <div className="mt-4 rounded border border-dashed border-slate-300 bg-white p-6 text-center">
          <p className="text-slate-600">No coordinators found.</p>
          <p className="mt-1 text-sm text-slate-500">
            Make sure your dongle is plugged in and try Refresh.
          </p>
        </div>
      )}

      {detected.isSuccess && detected.data.length > 0 && (
        <ul className="mt-4 space-y-2">
          {detected.data.map((d) => (
            <CandidateRow
              key={d.path}
              candidate={d}
              disabled={selectMutation.isPending}
              onSelect={() => onSelect(d.path)}
            />
          ))}
        </ul>
      )}

      <details
        className="mt-6"
        open={showAllPorts}
        onToggle={(e) => setShowAllPorts(e.currentTarget.open)}
      >
        <summary className="cursor-pointer text-sm text-sky-700 hover:underline">
          Don&rsquo;t see your coordinator?
        </summary>
        <div className="mt-3 rounded border border-slate-200 bg-white p-4">
          {ports.isLoading && <p className="text-slate-500">Loading ports…</p>}
          {ports.isSuccess && ports.data.length === 0 && (
            <p className="text-slate-500">No serial ports detected.</p>
          )}
          {ports.isSuccess && ports.data.length > 0 && (
            <ul className="space-y-2">
              {ports.data.map((p) => (
                <PortRow
                  key={p.path}
                  port={p}
                  disabled={selectMutation.isPending}
                  onSelect={() => onSelect(p.path)}
                />
              ))}
            </ul>
          )}
        </div>
      </details>

      {selectMutation.isError && (
        <p role="alert" className="mt-3 text-sm text-rose-600">
          Could not select that coordinator: {selectMutation.error.message}
        </p>
      )}
    </section>
  );
}

function CandidateRow({
  candidate,
  disabled,
  onSelect,
}: {
  candidate: DetectedCoordinator;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <li className="flex items-center justify-between rounded border border-slate-200 bg-white p-3">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-900">
            {candidate.match?.displayName ?? candidate.manufacturer ?? "Unknown coordinator"}
          </span>
          <span className={confidenceBadge(candidate.confidence)}>
            {confidenceLabel(candidate.confidence)}
          </span>
        </div>
        <div className="font-mono text-xs text-slate-500">{candidate.path}</div>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={onSelect}
        className="rounded bg-sky-600 px-3 py-1 text-sm font-medium text-white hover:bg-sky-700 disabled:bg-slate-300"
      >
        Use this one
      </button>
    </li>
  );
}

function PortRow({
  port,
  disabled,
  onSelect,
}: {
  port: SerialPortInfo;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <li className="flex items-center justify-between rounded border border-slate-200 p-2">
      <div>
        <div className="text-sm font-medium text-slate-900">
          {port.manufacturer ?? "Unknown manufacturer"}
        </div>
        <div className="font-mono text-xs text-slate-500">{port.path}</div>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={onSelect}
        className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
      >
        Use
      </button>
    </li>
  );
}
