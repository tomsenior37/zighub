import { useState } from "react";
import { AutomationEditor } from "../components/automations/AutomationEditor";
import { RunHistoryDrawer } from "../components/automations/RunHistoryDrawer";
import {
  useAutomations,
  useDeleteAutomation,
  useDisable,
  useEnable,
  usePromote,
  type Automation,
} from "../hooks/useAutomations";
import { relativeTime } from "../lib/relativeTime";

export function AutomationsPage() {
  const query = useAutomations();
  const promote = usePromote();
  const disable = useDisable();
  const enable = useEnable();
  const deleteAutomation = useDeleteAutomation();

  const [editing, setEditing] = useState<Automation | "new" | null>(null);
  const [historyOf, setHistoryOf] = useState<Automation | null>(null);

  const all = query.data ?? [];
  const drafts = all.filter((a) => a.state === "draft");
  const active = all.filter((a) => a.state === "active");
  const disabled = all.filter((a) => a.state === "disabled");

  return (
    <section className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Automations</h1>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="rounded bg-sky-600 px-3 py-1 text-sm font-medium text-white hover:bg-sky-700"
        >
          + New automation
        </button>
      </header>

      {query.isLoading && <p className="text-slate-500">Loading automations…</p>}

      {query.isSuccess && all.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="text-lg font-semibold text-slate-800">No automations yet</h2>
          <p className="mt-2 text-sm text-slate-600">
            Click &ldquo;+ New automation&rdquo; to create your first one. Drafts must be promoted
            to active before they fire.
          </p>
        </div>
      )}

      <Section title="Drafts" automations={drafts}>
        {(a) => (
          <>
            <button
              type="button"
              onClick={() => setEditing(a)}
              className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-50"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => promote.mutate(a.id)}
              className="rounded bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-emerald-700"
            >
              Promote
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Delete "${a.name}"?`)) deleteAutomation.mutate(a.id);
              }}
              className="rounded border border-rose-300 px-2 py-0.5 text-xs text-rose-700 hover:bg-rose-50"
            >
              Delete
            </button>
          </>
        )}
      </Section>

      <Section title="Active" automations={active}>
        {(a) => (
          <>
            <button
              type="button"
              onClick={() => setHistoryOf(a)}
              className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-50"
            >
              History
            </button>
            <button
              type="button"
              onClick={() => setEditing(a)}
              className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-50"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => disable.mutate(a.id)}
              className="rounded border border-amber-300 px-2 py-0.5 text-xs text-amber-700 hover:bg-amber-50"
            >
              Disable
            </button>
          </>
        )}
      </Section>

      <Section title="Disabled" automations={disabled}>
        {(a) => (
          <>
            <button
              type="button"
              onClick={() => enable.mutate(a.id)}
              className="rounded border border-emerald-300 px-2 py-0.5 text-xs text-emerald-700 hover:bg-emerald-50"
            >
              Enable
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Delete "${a.name}"?`)) deleteAutomation.mutate(a.id);
              }}
              className="rounded border border-rose-300 px-2 py-0.5 text-xs text-rose-700 hover:bg-rose-50"
            >
              Delete
            </button>
          </>
        )}
      </Section>

      <AutomationEditor
        open={editing !== null}
        {...(editing && editing !== "new" ? { automation: editing } : {})}
        onClose={() => setEditing(null)}
      />
      <RunHistoryDrawer automation={historyOf} onClose={() => setHistoryOf(null)} />
    </section>
  );
}

interface SectionProps {
  title: string;
  automations: Automation[];
  children: (a: Automation) => React.ReactNode;
}

function Section({ title, automations, children }: SectionProps) {
  if (automations.length === 0) return null;
  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        {title} ({automations.length.toString()})
      </h2>
      <ul className="mt-3 space-y-2">
        {automations.map((a) => (
          <li key={a.id} className="rounded border border-slate-200 bg-white p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-slate-900">{a.name}</div>
                <div className="text-xs text-slate-500">
                  Runs: {a.run_count.toString()} · Last:{" "}
                  {a.last_triggered_at ? relativeTime(a.last_triggered_at) : "never"}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">{children(a)}</div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
