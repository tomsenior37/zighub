import { useState } from "react";
import { EmptyDevices } from "../components/devices/EmptyDevices";
import { LocationGroup } from "../components/devices/LocationGroup";
import { NeedsSetupTray } from "../components/devices/NeedsSetupTray";
import { PairDrawer } from "../components/pair/PairDrawer";
import { useDevices, type DeviceGroup } from "../hooks/useDevices";

function splitDeviceGroups(groups: DeviceGroup[]): {
  needsSetup: DeviceGroup | undefined;
  locationGroups: DeviceGroup[];
} {
  return {
    needsSetup: groups.find((group) => group.location === null),
    locationGroups: groups.filter((group) => group.location !== null),
  };
}

export function DevicesPage() {
  const query = useDevices();
  const [pairOpen, setPairOpen] = useState(false);
  const groups = query.isSuccess ? splitDeviceGroups(query.data) : null;

  return (
    <section className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Devices</h1>
        <div className="flex items-center gap-3">
          {query.isFetching && !query.isLoading && (
            <span className="text-xs text-slate-400">refreshing…</span>
          )}
          <button
            type="button"
            onClick={() => setPairOpen(true)}
            className="rounded bg-sky-600 px-3 py-1 text-sm font-medium text-white hover:bg-sky-700"
          >
            Pair new device
          </button>
        </div>
      </header>
      <PairDrawer open={pairOpen} onClose={() => setPairOpen(false)} />

      {query.isLoading && <p className="text-slate-500">Loading devices…</p>}

      {query.isError && (
        <div
          role="alert"
          className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
        >
          <p className="font-medium">Could not load devices.</p>
          <button
            type="button"
            onClick={() => void query.refetch()}
            className="mt-2 inline-block rounded bg-rose-600 px-3 py-1 text-white hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
      )}

      {query.isSuccess && query.data.length === 0 && <EmptyDevices />}

      {groups && <NeedsSetupTray devices={groups.needsSetup?.devices ?? []} />}

      {groups &&
        groups.locationGroups.map((group) => (
          <LocationGroup key={group.location!.id} group={group} />
        ))}
    </section>
  );
}
