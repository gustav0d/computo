import type { AutomatonDefinition, NfaStepInput, NfaStepResult } from "../types";

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function isAccepting(automaton: AutomatonDefinition, stateId: string) {
  return automaton.states.some((state) => state.id === stateId && state.isAccepting);
}

export function epsilonClosure(automaton: AutomatonDefinition, seedStates: string[]) {
  const closure = new Set(seedStates);
  const queue = [...seedStates];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) {
      continue;
    }

    const epsilonTransitions = automaton.transitions.filter(
      (transition) => transition.from === current && transition.input === "",
    );

    for (const transition of epsilonTransitions) {
      if (closure.has(transition.to) === false) {
        closure.add(transition.to);
        queue.push(transition.to);
      }
    }
  }

  return [...closure];
}

export function stepNfa(automaton: AutomatonDefinition, input: NfaStepInput): NfaStepResult {
  const closure = epsilonClosure(automaton, input.states);

  if (input.inputIndex >= input.input.length) {
    const accepted = closure.some((state) => isAccepting(automaton, state));
    return {
      nextStates: closure,
      consumed: false,
      transitionIds: [],
      accepted,
    };
  }

  const symbol = input.input[input.inputIndex] ?? "";
  const transitions = closure.flatMap((state) =>
    automaton.transitions.filter((transition) => transition.from === state && transition.input === symbol),
  );

  if (transitions.length === 0) {
    return {
      nextStates: closure,
      consumed: false,
      transitionIds: [],
      accepted: false,
    };
  }

  const targets = unique(transitions.map((transition) => transition.to));
  const nextClosure = epsilonClosure(automaton, targets);
  const reachedEnd = input.inputIndex + 1 >= input.input.length;
  const accepted = reachedEnd ? nextClosure.some((state) => isAccepting(automaton, state)) : null;

  return {
    nextStates: nextClosure,
    consumed: true,
    transitionIds: unique(transitions.map((transition) => transition.id)),
    accepted,
  };
}
