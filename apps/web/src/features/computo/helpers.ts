import type {
  AutomatonDefinition,
  MachineType,
  TransitionDefinition,
} from "@computo/automata-core";

export const MACHINE_TYPE_OPTIONS: Array<{ value: MachineType; label: string }> = [
  { value: "DFA", label: "DFA — Autômato Finito Determinístico" },
  { value: "NFA", label: "NFA — Autômato Finito Não-Determinístico" },
  { value: "PDA", label: "PDA — Autômato com Pilha" },
  { value: "LBA", label: "LBA — Autômato Linearmente Limitado" },
  { value: "TM", label: "TM — Máquina de Turing" },
];

export const MACHINE_ACCENT_CLASS: Record<MachineType, string> = {
  DFA: "text-emerald-400",
  NFA: "text-fuchsia-400",
  PDA: "text-orange-400",
  LBA: "text-sky-400",
  TM: "text-green-400",
};

export function getTransitionLabel(type: MachineType, transition: TransitionDefinition) {
  if (type === "DFA" || type === "NFA") {
    return transition.input.length > 0 ? transition.input : "ε";
  }

  if (type === "PDA" && transition.kind === "PDA") {
    return `${transition.input || "ε"}, ${transition.pop || "ε"}/${transition.push || "ε"}`;
  }

  if ((type === "TM" || type === "LBA") && transition.kind === "TM") {
    return `${transition.input || "□"} → ${transition.write || "□"}, ${transition.move}`;
  }

  return "";
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function snapValue(value: number, gridSize: number, enabled: boolean) {
  if (enabled === false) {
    return value;
  }
  return Math.round(value / gridSize) * gridSize;
}

export function createTransitionTemplate(type: MachineType, from: string, to: string, id: string) {
  if (type === "PDA") {
    return {
      id,
      kind: "PDA" as const,
      from,
      to,
      input: "",
      pop: "",
      push: "",
    };
  }

  if (type === "TM" || type === "LBA") {
    return {
      id,
      kind: "TM" as const,
      from,
      to,
      input: "",
      write: "",
      move: "R" as const,
    };
  }

  return {
    id,
    kind: "FA" as const,
    from,
    to,
    input: "",
  };
}

export function formatFormalDefinition(automaton: AutomatonDefinition) {
  const states = automaton.states.map((state) => state.id).join(", ");
  const alphabet = automaton.alphabet.join(", ");
  const accepting = automaton.states
    .filter((state) => state.isAccepting)
    .map((state) => state.id)
    .join(", ");

  const baseLines = [
    `M = (Q, Σ, δ, q₀, F)`,
    `Q = {${states || "∅"}}`,
    `Σ = {${alphabet || "∅"}}`,
    `q₀ = ${automaton.initialState ?? "-"}`,
    `F = {${accepting || "∅"}}`,
  ];

  if (automaton.type === "PDA") {
    baseLines.push(`Γ = {${automaton.stackAlphabet.join(", ") || "∅"}}`);
  }

  if (automaton.type === "TM" || automaton.type === "LBA") {
    baseLines.push(`Γ = {${automaton.tapeAlphabet.join(", ") || "∅"}}`);
    baseLines.push(`B = ${automaton.blankSymbol || "B"}`);
  }

  return baseLines;
}
