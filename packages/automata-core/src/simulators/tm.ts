import type { AutomatonDefinition, TmConfiguration, TmStepResult, TmTransition } from "../types";

export function createInitialTape(input: string, blankSymbol: string) {
  return input.length > 0 ? [...input.split(""), blankSymbol] : [blankSymbol];
}

function isAccepting(automaton: AutomatonDefinition, stateId: string) {
  return automaton.states.some((state) => state.id === stateId && state.isAccepting);
}

interface StepOptions {
  machineType: "TM" | "LBA";
  inputLength: number;
  blankSymbol: string;
}

export function stepTm(
  automaton: AutomatonDefinition,
  configuration: TmConfiguration,
  options: StepOptions,
): TmStepResult {
  const symbol = configuration.tape[configuration.head] ?? options.blankSymbol;
  const transitions = automaton.transitions.filter(
    (transition): transition is TmTransition =>
      transition.kind === "TM" && transition.from === configuration.state && transition.input === symbol,
  );

  const transition = transitions[0];

  if (transition === undefined) {
    const accepted = isAccepting(automaton, configuration.state);
    return {
      nextConfiguration: null,
      transitionId: null,
      accepted: accepted ? true : false,
      rejected: accepted === false,
    };
  }

  const tape = [...configuration.tape];
  tape[configuration.head] = transition.write;

  let head = configuration.head;

  if (transition.move === "R") {
    head += 1;

    if (options.machineType === "LBA" && head > options.inputLength) {
      return {
        nextConfiguration: null,
        transitionId: transition.id,
        accepted: false,
        rejected: true,
      };
    }

    if (head >= tape.length) {
      tape.push(options.blankSymbol);
    }
  }

  if (transition.move === "L") {
    if (head === 0) {
      if (options.machineType === "LBA") {
        return {
          nextConfiguration: null,
          transitionId: transition.id,
          accepted: false,
          rejected: true,
        };
      }
      head = 0;
    } else {
      head -= 1;
    }
  }

  const nextConfiguration: TmConfiguration = {
    state: transition.to,
    tape,
    head,
    inputIndex: Math.min(head, options.inputLength),
  };

  const accepted = isAccepting(automaton, transition.to);

  return {
    nextConfiguration,
    transitionId: transition.id,
    accepted: accepted ? true : null,
    rejected: false,
  };
}
