import { NavLink, Outlet } from "react-router-dom";
import { useFirstRun } from "./hooks/useFirstRun";

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
  const items: NavItem[] = firstRun
    ? [{ to: "/wizard", label: "Setup wizard" }, ...BASE_NAV]
    : BASE_NAV;

  return (
    <div className="min-h-full bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <nav aria-label="Primary" className="mx-auto flex max-w-5xl items-center gap-6 px-6 py-4">
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
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
