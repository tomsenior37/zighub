import { useWizard } from "./useWizard";
import { WizardStepper } from "./WizardStepper";
import { WIZARD_STEPS } from "./steps";

export function WizardShell() {
  const wizard = useWizard(WIZARD_STEPS);
  const stepDef = WIZARD_STEPS[wizard.stepIndex];
  const Step = stepDef?.Component;

  return (
    <section className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Setup wizard</h1>
      <WizardStepper wizard={wizard} />
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        {Step && <Step wizard={wizard} />}
      </div>
      <footer className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={wizard.back}
          disabled={wizard.isFirst}
          className="rounded border border-slate-300 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          Back
        </button>
        <div className="flex gap-2">
          {wizard.current.canSkip && (
            <button
              type="button"
              onClick={wizard.skip}
              className="rounded border border-slate-300 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50"
            >
              Skip for now
            </button>
          )}
          {!wizard.isLast && (
            <button
              type="button"
              onClick={wizard.next}
              className="rounded bg-sky-600 px-3 py-1 text-sm font-medium text-white hover:bg-sky-700"
            >
              Next
            </button>
          )}
        </div>
      </footer>
    </section>
  );
}
