import { useCallback, useEffect, useMemo, useReducer } from "react";

export interface WizardStepDef {
  id: string;
  title: string;
  canSkip: boolean;
}

interface WizardState {
  stepIndex: number;
  completed: Set<string>;
}

type WizardAction =
  | { type: "next"; total: number }
  | { type: "back" }
  | { type: "skip"; total: number }
  | { type: "jumpTo"; index: number; total: number }
  | { type: "markComplete"; id: string };

function reducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "next":
      return { ...state, stepIndex: Math.min(state.stepIndex + 1, action.total - 1) };
    case "skip":
      return { ...state, stepIndex: Math.min(state.stepIndex + 1, action.total - 1) };
    case "back":
      return { ...state, stepIndex: Math.max(state.stepIndex - 1, 0) };
    case "jumpTo":
      return { ...state, stepIndex: Math.max(0, Math.min(action.index, action.total - 1)) };
    case "markComplete": {
      const completed = new Set(state.completed);
      completed.add(action.id);
      return { ...state, completed };
    }
  }
}

export interface UseWizardApi {
  stepIndex: number;
  steps: WizardStepDef[];
  current: WizardStepDef;
  next: () => void;
  back: () => void;
  skip: () => void;
  jumpTo: (index: number) => void;
  markComplete: (id: string) => void;
  isFirst: boolean;
  isLast: boolean;
  isCompleted: (id: string) => boolean;
}

export function useWizard(steps: WizardStepDef[]): UseWizardApi {
  const initialIndex = useMemo(() => {
    if (typeof window === "undefined") return 0;
    const hash = window.location.hash.replace(/^#/, "");
    const idx = steps.findIndex((s) => s.id === hash);
    return idx >= 0 ? idx : 0;
  }, [steps]);

  const [state, dispatch] = useReducer(reducer, {
    stepIndex: initialIndex,
    completed: new Set<string>(),
  });

  useEffect(() => {
    const next = `#${steps[state.stepIndex]?.id ?? ""}`;
    if (typeof window !== "undefined" && window.location.hash !== next) {
      window.history.replaceState(null, "", next);
    }
  }, [state.stepIndex, steps]);

  const total = steps.length;
  const next = useCallback(() => dispatch({ type: "next", total }), [total]);
  const back = useCallback(() => dispatch({ type: "back" }), []);
  const skip = useCallback(() => dispatch({ type: "skip", total }), [total]);
  const jumpTo = useCallback(
    (index: number) => dispatch({ type: "jumpTo", index, total }),
    [total],
  );
  const markComplete = useCallback((id: string) => dispatch({ type: "markComplete", id }), []);
  const isCompleted = useCallback((id: string) => state.completed.has(id), [state.completed]);

  const current = steps[state.stepIndex] ?? steps[0];
  if (!current) {
    throw new Error("wizard has no steps");
  }

  return {
    stepIndex: state.stepIndex,
    steps,
    current,
    next,
    back,
    skip,
    jumpTo,
    markComplete,
    isFirst: state.stepIndex === 0,
    isLast: state.stepIndex === steps.length - 1,
    isCompleted,
  };
}
