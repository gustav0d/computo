import type { AutomatonDefinition, DfaStepInput, DfaStepResult } from "../types";

function isAccepting(automaton: AutomatonDefinition, stateId: string) {
  return automaton.states.some((state) => state.id === stateId && state.isAccepting);
}

export function stepDfa(automaton: AutomatonDefinition, input: DfaStepInput): DfaStepResult {
  if (input.inputIndex >= input.input.length) {
    return {
      nextState: input.state,
      consumed: false,
      transitionId: null,
      accepted: isAccepting(automaton, input.state),
    };
  }

  const symbol = input.input[input.inputIndex] ?? "";
  const transition = automaton.transitions.find(
    (candidate) => candidate.from === input.state && candidate.input === symbol,
  );

  if (!transition) {
    return {
      nextState: null,
      consumed: false,
      transitionId: null,
      accepted: false,
    };
  }

  return {
    nextState: transition.to,
    consumed: true,
    transitionId: transition.id,
    accepted: null,
  };
}
