import { useNavigate } from "react-router-dom";
import { useCompleteSetup } from "../../hooks/useCompleteSetup";
import { useDevices } from "../../hooks/useDevices";
import { useLocations } from "../../hooks/useLocations";
import { useNetworkInfo } from "../../hooks/useNetwork";
import { useSelectedCoordinator } from "../../hooks/useSelectedCoordinator";
import type { UseWizardApi } from "../useWizard";

interface CompleteStepProps {
  wizard: UseWizardApi;
}

export function CompleteStep({ wizard: _wizard }: CompleteStepProps) {
  const selected = useSelectedCoordinator();
  const network = useNetworkInfo();
  const devices = useDevices();
  const locations = useLocations();
  const completeMutation = useCompleteSetup();
  const navigate = useNavigate();

  const deviceCount = devices.data?.flatMap((g) => g.devices).length ?? 0;
  const locationCount = locations.data?.length ?? 0;

  const finish = (target: "/devices" | "/automations") => {
    completeMutation.mutate(undefined, {
      onSuccess: () => {
        void navigate(target);
      },
    });
  };

  return (
    <section>
      <h2 className="text-xl font-semibold text-slate-900">You&#39;re all set</h2>
      <p className="mt-2 text-slate-600">Here&#39;s what you set up:</p>

      <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 rounded border border-slate-200 bg-white p-4 text-sm">
        <dt className="text-slate-500">Coordinator</dt>
        <dd className="font-mono">{selected.data?.path ?? "(not set)"}</dd>

        <dt className="text-slate-500">Network PAN ID</dt>
        <dd className="font-mono">
          {network.data ? `0x${network.data.panId.toString(16).padStart(4, "0")}` : "(not created)"}
        </dd>

        <dt className="text-slate-500">Channel</dt>
        <dd>{network.data?.channel ?? "—"}</dd>

        <dt className="text-slate-500">Devices paired</dt>
        <dd>
          {deviceCount.toString()}{" "}
          {deviceCount === 0 && (
            <span className="text-xs text-slate-400">(you can pair devices any time)</span>
          )}
        </dd>

        <dt className="text-slate-500">Locations</dt>
        <dd>{locationCount.toString()}</dd>
      </dl>

      {completeMutation.isError && (
        <p role="alert" className="mt-3 text-sm text-rose-600">
          Could not save setup state: {completeMutation.error.message}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={completeMutation.isPending}
          onClick={() => finish("/automations")}
          className="rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:bg-slate-300"
        >
          Create your first automation
        </button>
        <button
          type="button"
          disabled={completeMutation.isPending}
          onClick={() => finish("/devices")}
          className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Go to dashboard
        </button>
      </div>
    </section>
  );
}
