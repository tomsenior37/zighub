import { NavLink, Outlet } from "react-router-dom";
import { useFirstRun } from "./hooks/useFirstRun";
import { useZigbeeStatus, type ZigbeeStatus } from "./hooks/useZigbeeStatus";

interface NavItem {
  to: string;
  label: string;
}

const BASE_NAV: NavItem[] = [
  { to: "/devices", label: "Devices" },
  { to: "/automations", label: "Automations" },
  { to: "/settings", label: "Settings" },
];

export function Layout() {
  const firstRun = useFirstRun();
  const zigbee = useZigbeeStatus();
  const items: NavItem[] = firstRun
    ? [{ to: "/wizard", label: "Setup wizard" }, ...BASE_NAV]
    : BASE_NAV;

  return (
    <div className="min-h-full bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <nav
          aria-label="Primary"
          className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-6 py-4 sm:gap-6"
        >
          <span className="text-lg font-semibold tracking-tight">zighub</span>
          <ul className="flex items-center gap-4">
            {items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    isActive
                      ? "border-b-2 border-sky-600 pb-1 text-sm font-medium text-slate-900"
                      : "border-b-2 border-transparent pb-1 text-sm font-medium text-slate-500 hover:text-slate-900"
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <AdapterModeBadge status={zigbee.data} />
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}

function AdapterModeBadge({ status }: { status: ZigbeeStatus | undefined }) {
  if (!status) {
    return null;
  }

  const isMock = status.adapterMode === "mock";
  const label = isMock ? "Mock adapter" : "Herdsman adapter";
  const statusLabel = status.running ? "running" : "stopped";
  const classes = isMock
    ? "border-amber-300 bg-amber-50 text-amber-800"
    : "border-emerald-300 bg-emerald-50 text-emerald-800";
  const title = isMock
    ? `Using mock Zigbee mode: ${status.adapterReason}`
    : `Using real zigbee-herdsman mode: ${status.adapterReason}`;

  return (
    <div
      aria-label="Zigbee adapter mode"
      title={title}
      className={`ml-auto rounded border px-2.5 py-1 text-xs font-medium ${classes}`}
    >
      {label} - {statusLabel}
    </div>
  );
}
