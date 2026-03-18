import type {
  AutomatonDefinition,
  BranchTree,
  BranchTreeEdge,
  BranchTreeNode,
  PdaTransition,
  SimulationLimits,
} from "../types";

const DEFAULT_LIMITS: SimulationLimits = {
  maxSteps: 64,
  maxConfigurations: 1024,
};

function isAccepting(automaton: AutomatonDefinition, stateId: string) {
  return automaton.states.some((state) => state.id === stateId && state.isAccepting);
}

function createNode(
  id: string,
  parentId: string | null,
  depth: number,
  state: string,
  inputIndex: number,
): BranchTreeNode {
  return {
    id,
    parentId,
    depth,
    state,
    inputIndex,
    label: `${state} | i=${inputIndex}`,
    status: "running",
    transitionId: null,
    stack: [],
    tape: [],
    tapeHead: 0,
  };
}

function treeFromEmpty() {
  const root = createNode("root", null, 0, "-", 0);
  root.status = "rejected";
  root.label = "Sem estado inicial";

  return {
    rootId: root.id,
    nodes: [root],
    edges: [],
    acceptingNodeIds: [],
    rejectedNodeIds: [root.id],
    truncated: false,
  } satisfies BranchTree;
}

export function buildComputationTree(
  automaton: AutomatonDefinition,
  input: string,
  limits: Partial<SimulationLimits> = {},
): BranchTree {
  const mergedLimits: SimulationLimits = {
    ...DEFAULT_LIMITS,
    ...limits,
  };

  if (automaton.initialState === null) {
    return treeFromEmpty();
  }

  if (automaton.type === "NFA") {
    return buildNfaTree(automaton, input, mergedLimits);
  }

  if (automaton.type === "PDA") {
    return buildPdaTree(automaton, input, mergedLimits);
  }

  return treeFromEmpty();
}

function buildNfaTree(automaton: AutomatonDefinition, input: string, limits: SimulationLimits): BranchTree {
  const root = createNode("n0", null, 0, automaton.initialState ?? "", 0);
  const nodes: BranchTreeNode[] = [root];
  const edges: BranchTreeEdge[] = [];
  const acceptingNodeIds = new Set<string>();
  const rejectedNodeIds = new Set<string>();

  const queue: Array<{ nodeId: string; state: string; inputIndex: number; depth: number }> = [
    { nodeId: root.id, state: root.state, inputIndex: 0, depth: 0 },
  ];

  const seen = new Set<string>();
  let nodeCounter = 1;
  let edgeCounter = 1;
  let truncated = false;

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) {
      continue;
    }

    const node = nodes.find((candidate) => candidate.id === current.nodeId);
    if (node === undefined) {
      continue;
    }

    const seenKey = `${current.state}|${current.inputIndex}|${current.depth}`;
    if (seen.has(seenKey)) {
      continue;
    }
    seen.add(seenKey);

    if (current.depth >= limits.maxSteps) {
      node.status = "halted";
      node.label = `${current.state} | limite de passos`;
      truncated = true;
      continue;
    }

    if (current.inputIndex >= input.length && isAccepting(automaton, current.state)) {
      node.status = "accepted";
      acceptingNodeIds.add(node.id);
      continue;
    }

    const symbol = input[current.inputIndex] ?? "";
    const transitions = automaton.transitions.filter((transition) => {
      if (transition.from !== current.state) {
        return false;
      }
      if (transition.input.length === 0) {
        return true;
      }
      return transition.input === symbol;
    });

    if (transitions.length === 0) {
      node.status = "rejected";
      rejectedNodeIds.add(node.id);
      continue;
    }

    for (const transition of transitions) {
      if (nodes.length >= limits.maxConfigurations) {
        truncated = true;
        node.status = "halted";
        node.label = `${current.state} | limite de configurações`;
        break;
      }

      const childId = `n${nodeCounter}`;
      nodeCounter += 1;

      const consumed = transition.input.length === 0 ? 0 : 1;
      const child = createNode(
        childId,
        node.id,
        current.depth + 1,
        transition.to,
        current.inputIndex + consumed,
      );
      child.transitionId = transition.id;

      nodes.push(child);
      edges.push({
        id: `e${edgeCounter}`,
        source: node.id,
        target: child.id,
        label: transition.input.length === 0 ? "ε" : transition.input,
      });
      edgeCounter += 1;

      queue.push({
        nodeId: child.id,
        state: child.state,
        inputIndex: child.inputIndex,
        depth: child.depth,
      });
    }
  }

  return {
    rootId: root.id,
    nodes,
    edges,
    acceptingNodeIds: [...acceptingNodeIds],
    rejectedNodeIds: [...rejectedNodeIds],
    truncated,
  };
}

interface PdaQueueItem {
  nodeId: string;
  state: string;
  inputIndex: number;
  depth: number;
  stack: string[];
}

function pdaTransitionApplies(transition: PdaTransition, queueItem: PdaQueueItem, input: string) {
  const stackTop = queueItem.stack[queueItem.stack.length - 1] ?? "";
  const popMatches = transition.pop.length === 0 ? true : transition.pop === stackTop;
  const symbol = input[queueItem.inputIndex] ?? "";
  const inputMatches = transition.input.length === 0 ? true : transition.input === symbol;
  return transition.from === queueItem.state && popMatches && inputMatches;
}

function pdaApplyTransition(queueItem: PdaQueueItem, transition: PdaTransition) {
  const stack = [...queueItem.stack];

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
    state: transition.to,
    inputIndex: queueItem.inputIndex + consumed,
    stack,
  };
}

function buildPdaTree(automaton: AutomatonDefinition, input: string, limits: SimulationLimits): BranchTree {
  const root = createNode("p0", null, 0, automaton.initialState ?? "", 0);
  root.stack = [automaton.initialStackSymbol];

  const nodes: BranchTreeNode[] = [root];
  const edges: BranchTreeEdge[] = [];
  const acceptingNodeIds = new Set<string>();
  const rejectedNodeIds = new Set<string>();

  const queue: PdaQueueItem[] = [
    {
      nodeId: root.id,
      state: root.state,
      inputIndex: 0,
      depth: 0,
      stack: [automaton.initialStackSymbol],
    },
  ];

  const seen = new Set<string>();
  let nodeCounter = 1;
  let edgeCounter = 1;
  let truncated = false;

  const transitions = automaton.transitions.filter(
    (transition): transition is PdaTransition => transition.kind === "PDA",
  );

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) {
      continue;
    }

    const node = nodes.find((candidate) => candidate.id === current.nodeId);
    if (node === undefined) {
      continue;
    }

    const seenKey = `${current.state}|${current.inputIndex}|${current.stack.join("")}|${current.depth}`;
    if (seen.has(seenKey)) {
      continue;
    }
    seen.add(seenKey);

    if (current.depth >= limits.maxSteps) {
      node.status = "halted";
      node.label = `${current.state} | limite de passos`;
      truncated = true;
      continue;
    }

    if (current.inputIndex >= input.length && isAccepting(automaton, current.state)) {
      node.status = "accepted";
      acceptingNodeIds.add(node.id);
      continue;
    }

    const applicable = transitions.filter((transition) => pdaTransitionApplies(transition, current, input));

    if (applicable.length === 0) {
      node.status = "rejected";
      rejectedNodeIds.add(node.id);
      continue;
    }

    for (const transition of applicable) {
      if (nodes.length >= limits.maxConfigurations) {
        truncated = true;
        node.status = "halted";
        node.label = `${current.state} | limite de configurações`;
        break;
      }

      const next = pdaApplyTransition(current, transition);
      const childId = `p${nodeCounter}`;
      nodeCounter += 1;

      const child = createNode(childId, current.nodeId, current.depth + 1, next.state, next.inputIndex);
      child.stack = next.stack;
      child.transitionId = transition.id;

      nodes.push(child);
      edges.push({
        id: `pe${edgeCounter}`,
        source: node.id,
        target: child.id,
        label: `${transition.input || "ε"}, ${transition.pop || "ε"}/${transition.push || "ε"}`,
      });
      edgeCounter += 1;

      queue.push({
        nodeId: child.id,
        state: next.state,
        inputIndex: next.inputIndex,
        depth: child.depth,
        stack: next.stack,
      });
    }
  }

  return {
    rootId: root.id,
    nodes,
    edges,
    acceptingNodeIds: [...acceptingNodeIds],
    rejectedNodeIds: [...rejectedNodeIds],
    truncated,
  };
}
