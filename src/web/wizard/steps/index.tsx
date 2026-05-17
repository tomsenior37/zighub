import type { ComponentType } from "react";
import type { UseWizardApi, WizardStepDef } from "../useWizard";
import { CoordinatorStep } from "./CoordinatorStep";
import { NetworkStep } from "./NetworkStep";
import { WelcomeStep } from "./WelcomeStep";

export interface WizardStepProps {
  wizard: UseWizardApi;
}

interface WizardStepEntry extends WizardStepDef {
  Component: ComponentType<WizardStepProps>;
}

function PlaceholderStep(title: string, description: string) {
  return function PlaceholderStepInner() {
    return (
      <section>
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        <p className="mt-2 text-slate-600">{description}</p>
      </section>
    );
  };
}

export const WIZARD_STEPS: WizardStepEntry[] = [
  { id: "welcome", title: "Welcome", canSkip: false, Component: WelcomeStep },
  { id: "coordinator", title: "Coordinator", canSkip: false, Component: CoordinatorStep },
  { id: "network", title: "Network", canSkip: false, Component: NetworkStep },
  {
    id: "devices",
    title: "Pair devices",
    canSkip: true,
    Component: PlaceholderStep(
      "Pair your devices",
      "Open the pairing window and walk through each new device. This step lands in a follow-up — for now you can skip and use the Devices page later.",
    ),
  },
  {
    id: "complete",
    title: "All done",
    canSkip: false,
    Component: PlaceholderStep(
      "You're all set",
      "zighub is ready. Head to the Devices page to manage what you've paired.",
    ),
  },
];
