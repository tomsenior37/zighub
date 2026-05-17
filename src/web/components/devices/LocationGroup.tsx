import type { DeviceGroup } from "../../hooks/useDevices";
import { DeviceCard } from "./DeviceCard";

interface LocationGroupProps {
  group: DeviceGroup;
}

export function LocationGroup({ group }: LocationGroupProps) {
  const title = group.location?.name ?? "Unassigned";
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-semibold text-slate-800">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {group.devices.map((d) => (
          <DeviceCard key={d.z2m_id} device={d} />
        ))}
      </div>
    </section>
  );
}
