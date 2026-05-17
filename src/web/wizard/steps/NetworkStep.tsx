import { useState } from "react";
import {
  useCreateNetwork,
  useNetworkInfo,
  type CreateNetworkInput,
  type NetworkInfo,
} from "../../hooks/useNetwork";
import { relativeTime } from "../../lib/relativeTime";
import type { UseWizardApi } from "../useWizard";

interface NetworkStepProps {
  wizard: UseWizardApi;
}

export function NetworkStep({ wizard }: NetworkStepProps) {
  const networkQuery = useNetworkInfo();
  const createMutation = useCreateNetwork();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [channel, setChannel] = useState<string>("");
  const [panIdHex, setPanIdHex] = useState<string>("");
  const [confirmWipe, setConfirmWipe] = useState(false);

  const advance = () => {
    wizard.markComplete("network");
    wizard.next();
  };

  const submit = (event?: React.FormEvent) => {
    event?.preventDefault();
    const input: CreateNetworkInput = {};
    if (channel !== "") input.channel = Number.parseInt(channel, 10);
    if (panIdHex !== "") input.panId = Number.parseInt(panIdHex, 16);
    createMutation.mutate(input, {
      onSuccess: () => {
        setConfirmWipe(false);
        advance();
      },
    });
  };

  return (
    <section>
      <h2 className="text-xl font-semibold text-slate-900">Set up the Zigbee network</h2>

      {networkQuery.isLoading && (
        <p className="mt-3 text-slate-500">Checking for an existing network…</p>
      )}

      {networkQuery.isSuccess && networkQuery.data && (
        <ExistingNetwork
          info={networkQuery.data}
          onKeep={advance}
          onWipe={() => setConfirmWipe(true)}
        />
      )}

      {networkQuery.isSuccess && !networkQuery.data && (
        <p className="mt-3 text-slate-600">
          No network on this coordinator yet. We&rsquo;ll create one with a random PAN ID and a
          fresh 16-byte network key.
        </p>
      )}

      {(networkQuery.data === null || confirmWipe) && (
        <form onSubmit={submit} className="mt-4 space-y-3">
          <details
            open={showAdvanced}
            onToggle={(e) => setShowAdvanced(e.currentTarget.open)}
            className="rounded border border-slate-200 bg-white p-3"
          >
            <summary className="cursor-pointer text-sm text-sky-700 hover:underline">
              Advanced — pick channel or PAN ID
            </summary>
            <div className="mt-3 space-y-2">
              <label className="block text-sm">
                <span className="block text-slate-500">
                  Channel (11-26, blank = random default 15)
                </span>
                <input
                  type="number"
                  min={11}
                  max={26}
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="mt-1 w-32 rounded border border-slate-300 px-2 py-1 font-mono"
                />
              </label>
              <label className="block text-sm">
                <span className="block text-slate-500">PAN ID hex (e.g. 1a62, blank = random)</span>
                <input
                  type="text"
                  pattern="[0-9a-fA-F]{1,4}"
                  value={panIdHex}
                  onChange={(e) => setPanIdHex(e.target.value)}
                  className="mt-1 w-32 rounded border border-slate-300 px-2 py-1 font-mono"
                />
              </label>
            </div>
          </details>

          {createMutation.isError && (
            <p role="alert" className="text-sm text-rose-600">
              Could not create network: {createMutation.error.message}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded bg-sky-600 px-3 py-1 text-sm font-medium text-white hover:bg-sky-700 disabled:bg-slate-300"
            >
              {createMutation.isPending
                ? "Creating…"
                : confirmWipe
                  ? "Wipe & create new"
                  : "Create network"}
            </button>
            {confirmWipe && (
              <button
                type="button"
                onClick={() => setConfirmWipe(false)}
                className="rounded border border-slate-300 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel wipe
              </button>
            )}
          </div>
        </form>
      )}
    </section>
  );
}

function ExistingNetwork({
  info,
  onKeep,
  onWipe,
}: {
  info: NetworkInfo;
  onKeep: () => void;
  onWipe: () => void;
}) {
  return (
    <div className="mt-3 rounded border border-emerald-200 bg-emerald-50 p-4">
      <p className="text-sm font-medium text-emerald-800">A network already exists.</p>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
        <dt className="text-slate-500">PAN ID</dt>
        <dd className="font-mono">0x{info.panId.toString(16).padStart(4, "0")}</dd>
        <dt className="text-slate-500">Channel</dt>
        <dd>{info.channel}</dd>
        <dt className="text-slate-500">Created</dt>
        <dd>
          {relativeTime(new Date(info.createdAt).toISOString().replace("T", " ").replace("Z", ""))}
        </dd>
      </dl>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onKeep}
          className="rounded bg-sky-600 px-3 py-1 text-sm font-medium text-white hover:bg-sky-700"
        >
          Keep this network
        </button>
        <button
          type="button"
          onClick={onWipe}
          className="rounded border border-rose-300 px-3 py-1 text-sm text-rose-700 hover:bg-rose-50"
        >
          Wipe &amp; create a new one
        </button>
      </div>
    </div>
  );
}
