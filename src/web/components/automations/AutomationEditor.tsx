import { useState } from "react";
import { ApiError } from "../../api/fetcher";
import {
  useCreateAutomation,
  useUpdateAutomation,
  type Automation,
  type CreateAutomationInput,
} from "../../hooks/useAutomations";

interface AutomationEditorProps {
  open: boolean;
  automation?: Automation;
  onClose: () => void;
}

interface IssuesBody {
  issues?: Array<{ path: string; message: string }>;
  error?: string;
  message?: string;
}

function getIssues(body: unknown): Array<{ path: string; message: string }> {
  if (body && typeof body === "object" && Array.isArray((body as IssuesBody).issues)) {
    return (body as IssuesBody).issues ?? [];
  }
  return [];
}

const DEFAULT_YAML = `version: 1
name: My automation
trigger:
  type: device_event
  device: "REPLACE_WITH_IEEE_ADDRESS"
  event: state
  payload:
    state: ON
actions:
  - type: toggle
    device: "REPLACE_WITH_TARGET_IEEE_ADDRESS"
`;

export function AutomationEditor({ open, automation, onClose }: AutomationEditorProps) {
  const [name, setName] = useState(automation?.name ?? "");
  const [yaml, setYaml] = useState(automation?.source_yaml ?? DEFAULT_YAML);
  const createMutation = useCreateAutomation();
  const updateMutation = useUpdateAutomation();

  if (!open) return null;

  const isUpdate = automation !== undefined;
  const activeError = (isUpdate ? updateMutation.error : createMutation.error) as
    | ApiError
    | null
    | undefined;
  const issues = activeError ? getIssues(activeError.body) : [];
  const isPending = isUpdate ? updateMutation.isPending : createMutation.isPending;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isUpdate && automation) {
      updateMutation.mutate(
        { id: automation.id, source_yaml: yaml },
        { onSuccess: () => onClose() },
      );
    } else {
      const input: CreateAutomationInput = { name, source_yaml: yaml };
      createMutation.mutate(input, { onSuccess: () => onClose() });
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <form
        onSubmit={submit}
        className="flex max-h-full w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl"
      >
        <header className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            {isUpdate ? `Edit "${automation.name}"` : "New automation"}
          </h2>
        </header>
        <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
          {!isUpdate && (
            <label className="block text-sm">
              <span className="block text-slate-500">Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={200}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
              />
            </label>
          )}
          <label className="block text-sm">
            <span className="block text-slate-500">YAML</span>
            <textarea
              value={yaml}
              onChange={(e) => setYaml(e.target.value)}
              required
              rows={18}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1 font-mono text-xs"
            />
          </label>
          {issues.length > 0 && (
            <div role="alert" className="rounded border border-rose-200 bg-rose-50 p-3 text-sm">
              <p className="font-medium text-rose-700">Validation errors:</p>
              <ul className="mt-1 list-disc pl-5 text-rose-700">
                {issues.map((iss, idx) => (
                  <li key={`${iss.path}-${idx.toString()}`}>
                    <span className="font-mono">{iss.path || "(root)"}:</span> {iss.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {activeError && issues.length === 0 && (
            <p role="alert" className="text-sm text-rose-600">
              {activeError.message}
            </p>
          )}
        </div>
        <footer className="flex justify-end gap-2 border-t border-slate-200 px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded bg-sky-600 px-3 py-1 text-sm font-medium text-white hover:bg-sky-700 disabled:bg-slate-300"
          >
            {isPending ? "Saving…" : isUpdate ? "Save changes" : "Save as draft"}
          </button>
        </footer>
      </form>
    </div>
  );
}
