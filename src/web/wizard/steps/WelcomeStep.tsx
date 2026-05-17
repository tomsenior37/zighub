import { useState } from "react";
import type { UseWizardApi } from "../useWizard";

interface WelcomeStepProps {
  wizard: UseWizardApi;
}

type Choice = "fresh" | "restore-local" | "restore-cloud" | null;

export function WelcomeStep({ wizard }: WelcomeStepProps) {
  const [showRestore, setShowRestore] = useState<Choice>(null);

  if (showRestore === "restore-local" || showRestore === "restore-cloud") {
    const label =
      showRestore === "restore-local" ? "Restore from local backup" : "Restore from a cloud backup";
    return (
      <section role="region" aria-label="Restore not available">
        <h2 className="text-xl font-semibold text-slate-900">{label}</h2>
        <p className="mt-2 text-slate-600">
          Restore is coming soon — the backup pipeline lands in a later phase. For now, choose
          &ldquo;Set up a new network&rdquo; to continue.
        </p>
        <button
          type="button"
          onClick={() => setShowRestore(null)}
          className="mt-4 rounded border border-slate-300 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50"
        >
          Back to options
        </button>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-xl font-semibold text-slate-900">Welcome to zighub</h2>
      <p className="mt-2 text-slate-600">
        Let&rsquo;s get your Zigbee network up and running. How would you like to start?
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <PathCard
          title="Set up a new network"
          description="Detect a coordinator, create a fresh network, and pair devices."
          onClick={() => {
            wizard.markComplete("welcome");
            wizard.next();
          }}
        />
        <PathCard
          title="Restore from local backup"
          description="Pick a .zbk file from your computer."
          onClick={() => setShowRestore("restore-local")}
        />
        <PathCard
          title="Restore from a cloud backup"
          description="Sign in to a cloud provider and pick a backup."
          onClick={() => setShowRestore("restore-cloud")}
        />
      </div>

      <p className="mt-6 text-xs text-slate-400">
        Need a hand? See{" "}
        <a
          href="/help/setup"
          aria-disabled="true"
          title="Coming soon"
          className="cursor-not-allowed underline"
        >
          setup help
        </a>{" "}
        or{" "}
        <a
          href="/help/restore"
          aria-disabled="true"
          title="Coming soon"
          className="cursor-not-allowed underline"
        >
          restore help
        </a>
        .
      </p>
    </section>
  );
}

interface PathCardProps {
  title: string;
  description: string;
  onClick: () => void;
}

function PathCard({ title, description, onClick }: PathCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-sky-300 hover:shadow-md"
    >
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
    </button>
  );
}
