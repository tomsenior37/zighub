import type { UseWizardApi } from "./useWizard";

interface WizardStepperProps {
  wizard: UseWizardApi;
}

export function WizardStepper({ wizard }: WizardStepperProps) {
  return (
    <ol className="mb-8 flex items-center gap-2" aria-label="Wizard progress">
      {wizard.steps.map((step, idx) => {
        const isCurrent = idx === wizard.stepIndex;
        const isComplete = wizard.isCompleted(step.id);
        const isPast = idx < wizard.stepIndex;
        const status = isCurrent ? "current" : isComplete || isPast ? "complete" : "pending";
        return (
          <li
            key={step.id}
            className="flex items-center gap-2"
            aria-current={isCurrent ? "step" : undefined}
          >
            <span
              className={
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold " +
                (status === "complete"
                  ? "bg-emerald-600 text-white"
                  : status === "current"
                    ? "bg-sky-600 text-white"
                    : "bg-slate-200 text-slate-500")
              }
              aria-label={`Step ${(idx + 1).toString()}: ${step.title} (${status})`}
            >
              {idx + 1}
            </span>
            <span
              className={
                "text-sm " + (isCurrent ? "font-semibold text-slate-900" : "text-slate-500")
              }
            >
              {step.title}
            </span>
            {idx < wizard.steps.length - 1 && (
              <span className="mx-1 h-px w-6 bg-slate-300" aria-hidden="true" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
