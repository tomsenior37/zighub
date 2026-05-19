import { LocationManager } from "../components/settings/LocationManager";

export function SettingsPage() {
  return (
    <section className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
      <p className="mt-3 text-slate-600">
        Coordinator configuration, backup schedule, cloud provider connections, audit log viewer,
        and factory reset live here. Location management is available now; the rest is still ahead.
      </p>
      <LocationManager />
    </section>
  );
}
