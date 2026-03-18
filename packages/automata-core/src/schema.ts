import { z } from "zod";

import type {
  AutomatonDefinition,
  FallbackTransition,
  MachineType,
  PdaTransition,
  TmTransition,
  TransitionDefinition,
} from "./types";

const stateSchema = z.object({
  id: z.string().min(1),
  x: z.number().optional(),
  y: z.number().optional(),
  isInitial: z.boolean().default(false),
  isAccepting: z.boolean().default(false),
});

const rawTransitionSchema = z.object({
  id: z.string().optional(),
  from: z.string().min(1),
  to: z.string().min(1),
  input: z.string().default(""),
  pop: z.string().optional(),
  push: z.string().optional(),
  write: z.string().optional(),
  move: z.enum(["L", "R", "S"]).optional(),
  kind: z.enum(["FA", "PDA", "TM"]).optional(),
});

const automatonSchema = z.object({
  type: z.enum(["DFA", "NFA", "PDA", "LBA", "TM"]),
  states: z.array(stateSchema).default([]),
  transitions: z.array(rawTransitionSchema).default([]),
  alphabet: z.array(z.string()).default([]),
  tapeAlphabet: z.array(z.string()).default([]),
  stackAlphabet: z.array(z.string()).default([]),
  initialState: z.string().nullable().optional(),
  initialStackSymbol: z.string().default("Z0"),
  blankSymbol: z.string().default("B"),
});

function toTransition(type: MachineType, raw: z.infer<typeof rawTransitionSchema>, idx: number) {
  const id = raw.id ?? `t${idx + 1}`;

  if (type === "PDA") {
    const transition: PdaTransition = {
      id,
      kind: "PDA",
      from: raw.from,
      to: raw.to,
      input: raw.input ?? "",
      pop: raw.pop ?? "",
      push: raw.push ?? "",
    };
    return transition;
  }

  if (type === "TM" || type === "LBA") {
    const transition: TmTransition = {
      id,
      kind: "TM",
      from: raw.from,
      to: raw.to,
      input: raw.input ?? "",
      write: raw.write ?? "",
      move: raw.move ?? "R",
    };
    return transition;
  }

  const transition: FallbackTransition = {
    id,
    kind: "FA",
    from: raw.from,
    to: raw.to,
    input: raw.input ?? "",
  };
  return transition;
}

function dedupe(values: string[]) {
  return Array.from(new Set(values.filter((value) => value.length > 0)));
}

function inferInitialState(states: { id: string; isInitial: boolean }[]) {
  const flagged = states.find((state) => state.isInitial);
  if (flagged) {
    return flagged.id;
  }
  return states[0]?.id ?? null;
}

function normalizeStateInitialFlags(
  states: z.infer<typeof stateSchema>[],
  initialState: string | null,
): z.infer<typeof stateSchema>[] {
  let initialAssigned = false;
  return states.map((state) => {
    const isInitial = initialState !== null && state.id === initialState;
    if (isInitial) {
      initialAssigned = true;
    }
    return {
      ...state,
      isInitial,
    };
  }).map((state, index) => {
    if (initialAssigned || index !== 0 || state.id.length === 0) {
      return state;
    }

    initialAssigned = true;
    return {
      ...state,
      isInitial: true,
    };
  });
}

function inferAlphabets(type: MachineType, transitions: TransitionDefinition[]) {
  const inputSymbols = transitions
    .map((transition) => transition.input)
    .filter((symbol) => symbol !== "");

  if (type === "PDA") {
    const stackSymbols = transitions
      .flatMap((transition) => {
        if (transition.kind !== "PDA") {
          return [];
        }
        return [transition.pop, ...transition.push.split("")];
      })
      .filter((symbol) => symbol !== "");

    return {
      alphabet: dedupe(inputSymbols),
      stackAlphabet: dedupe(stackSymbols),
      tapeAlphabet: [] as string[],
    };
  }

  if (type === "TM" || type === "LBA") {
    const tapeSymbols = transitions
      .flatMap((transition) => {
        if (transition.kind !== "TM") {
          return [];
        }
        return [transition.input, transition.write];
      })
      .filter((symbol) => symbol !== "");

    return {
      alphabet: dedupe(inputSymbols),
      stackAlphabet: [] as string[],
      tapeAlphabet: dedupe(tapeSymbols),
    };
  }

  return {
    alphabet: dedupe(inputSymbols),
    stackAlphabet: [] as string[],
    tapeAlphabet: [] as string[],
  };
}

export function createInitialAutomaton(type: MachineType = "DFA"): AutomatonDefinition {
  return {
    type,
    states: [],
    transitions: [],
    alphabet: [],
    tapeAlphabet: [],
    stackAlphabet: [],
    initialState: null,
    initialStackSymbol: "Z0",
    blankSymbol: "B",
  };
}

export function normalizeAutomaton(rawData: unknown): AutomatonDefinition {
  const parsed = automatonSchema.parse(rawData);
  const transitions = parsed.transitions.map((transition, index) => toTransition(parsed.type, transition, index));

  const inferred = inferAlphabets(parsed.type, transitions);
  const initialState = parsed.initialState ?? inferInitialState(parsed.states);

  const states = normalizeStateInitialFlags(parsed.states, initialState);

  return {
    type: parsed.type,
    states,
    transitions,
    alphabet: dedupe(parsed.alphabet.length > 0 ? parsed.alphabet : inferred.alphabet),
    tapeAlphabet: dedupe(parsed.tapeAlphabet.length > 0 ? parsed.tapeAlphabet : inferred.tapeAlphabet),
    stackAlphabet: dedupe(parsed.stackAlphabet.length > 0 ? parsed.stackAlphabet : inferred.stackAlphabet),
    initialState,
    initialStackSymbol: parsed.initialStackSymbol,
    blankSymbol: parsed.blankSymbol,
  };
}

export function parseAutomaton(rawData: unknown) {
  const parsed = automatonSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false as const,
      errors: z.treeifyError(parsed.error),
      data: null,
    };
  }

  return {
    success: true as const,
    errors: null,
    data: normalizeAutomaton(parsed.data),
  };
}

export function parseAutomatonJson(rawJson: string) {
  try {
    const data = JSON.parse(rawJson);
    return parseAutomaton(data);
  } catch {
    return {
      success: false as const,
      errors: {
        message: "JSON inválido",
      },
      data: null,
    };
  }
}

export function serializeAutomaton(automaton: AutomatonDefinition) {
  return JSON.stringify(automaton, null, 2);
}
