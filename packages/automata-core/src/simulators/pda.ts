import type {
  AutomatonDefinition,
  PdaConfiguration,
  PdaStepInput,
  PdaStepResult,
  PdaTransition,
} from "../types";

function transitionApplies(transition: PdaTransition, config: PdaConfiguration, input: string) {
  if (transition.from !== config.state) {
    return false;
  }

  const stackTop = config.stack[config.stack.length - 1] ?? "";
  const popMatches = transition.pop.length === 0 ? true : transition.pop === stackTop;
  const symbol = input[config.inputIndex] ?? "";
  const inputMatches = transition.input.length === 0 ? true : transition.input === symbol;

  return popMatches && inputMatches;
}

function applyTransition(config: PdaConfiguration, transition: PdaTransition): PdaConfiguration {
  const stack = [...config.stack];

  if (transition.pop.length > 0) {
    stack.pop();
  }

  if (transition.push.length > 0) {
    for (let index = transition.push.length - 1; index >= 0; index -= 1) {
      stack.push(transition.push[index] ?? "");
    }
  }

  const consumed = transition.input.length > 0 ? 1 : 0;

  return {
    id: `${config.id}:${transition.id}:${config.inputIndex}`,
    state: transition.to,
    inputIndex: config.inputIndex + consumed,
    stack,
  };
}

function configurationKey(configuration: PdaConfiguration) {
  return `${configuration.state}|${configuration.inputIndex}|${configuration.stack.join("")}`;
}

function isAccepting(automaton: AutomatonDefinition, config: PdaConfiguration, input: string) {
  if (config.inputIndex < input.length) {
    return false;
  }

  return automaton.states.some((state) => state.id === config.state && state.isAccepting);
}

export function stepPda(automaton: AutomatonDefinition, input: PdaStepInput): PdaStepResult {
  const pdaTransitions = automaton.transitions.filter(
    (transition): transition is PdaTransition => transition.kind === "PDA",
  );

  const allNext: PdaConfiguration[] = [];
  const transitionIds = new Set<string>();
  let consumed = false;

  for (const config of input.configurations) {
    for (const transition of pdaTransitions) {
      if (transitionApplies(transition, config, input.input) === false) {
        continue;
      }

      if (transition.input.length > 0) {
        consumed = true;
      }

      transitionIds.add(transition.id);
      allNext.push(applyTransition(config, transition));
    }
  }

  if (allNext.length === 0) {
    const accepted = input.configurations.some((config) =>
      isAccepting(automaton, config, input.input),
    );
    return {
      nextConfigurations: input.configurations,
      transitionIds: [],
      consumed: false,
      accepted,
    };
  }

  const deduped = Array.from(
    allNext
      .reduce((map, config) => {
        map.set(configurationKey(config), config);
        return map;
      }, new Map<string, PdaConfiguration>())
      .values(),
  );

  const accepted = deduped.some((config) => isAccepting(automaton, config, input.input));

  return {
    nextConfigurations: deduped,
    transitionIds: [...transitionIds],
    consumed,
    accepted: accepted ? true : null,
  };
}
