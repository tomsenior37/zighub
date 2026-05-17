import { useAutomationRuns, type Automation } from "../../hooks/useAutomations";
import { relativeTime } from "../../lib/relativeTime";

interface RunHistoryDrawerProps {
  automation: Automation | null;
  onClose: () => void;
}

export function RunHistoryDrawer({ automation, onClose }: RunHistoryDrawerProps) {
  const runsQuery = useAutomationRuns(automation?.id ?? null);
  if (!automation) return null;
  return (
    <aside
      role="dialog"
      aria-label={`Run history for ${automation.name}`}
      className="fixed inset-y-0 right-0 z-30 w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white shadow-xl"
    >
      <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{automation.name}</h2>
          <p className="text-xs text-slate-500">Run count: {automation.run_count.toString()}</p>
        </div>
        <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-900">
          Close
        </button>
      </header>
      <section className="px-6 py-4">
        {runsQuery.isLoading && <p className="text-slate-500">Loading runs…</p>}
        {runsQuery.isSuccess && runsQuery.data.length === 0 && (
          <p className="text-slate-500">This automation has not run yet.</p>
        )}
        {runsQuery.isSuccess && runsQuery.data.length > 0 && (
          <ul className="space-y-2">
            {runsQuery.data.map((r) => (
              <li key={r.id} className="rounded border border-slate-200 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className={r.ok ? "text-emerald-700" : "text-rose-700"}>
                    {r.ok ? "OK" : "Failed"}
                  </span>
                  <span className="text-xs text-slate-500">{relativeTime(r.started_at)}</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">{r.duration_ms.toString()} ms</div>
                {r.error && <div className="mt-1 text-xs text-rose-600">{r.error}</div>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}
