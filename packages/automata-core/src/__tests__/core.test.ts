import { describe, expect, test } from "bun:test";

import {
  buildComputationTree,
  createInitialTape,
  normalizeAutomaton,
  parseAutomatonJson,
  stepDfa,
  stepNfa,
  stepPda,
  stepTm,
} from "../index";

const dfa = normalizeAutomaton({
  type: "DFA",
  states: [
    { id: "q0", isInitial: true, isAccepting: true },
    { id: "q1", isInitial: false, isAccepting: false },
  ],
  transitions: [
    { from: "q0", to: "q1", input: "a" },
    { from: "q1", to: "q0", input: "a" },
  ],
  alphabet: ["a"],
  initialState: "q0",
});

describe("schema", () => {
  test("rejects invalid json", () => {
    const result = parseAutomatonJson("{");
    expect(result.success).toBe(false);
  });
});

describe("dfa", () => {
  test("accepts even number of a", () => {
    const first = stepDfa(dfa, { state: "q0", input: "aa", inputIndex: 0 });
    expect(first.nextState).toBe("q1");
    const second = stepDfa(dfa, { state: first.nextState ?? "", input: "aa", inputIndex: 1 });
    expect(second.nextState).toBe("q0");
    const terminal = stepDfa(dfa, { state: second.nextState ?? "", input: "aa", inputIndex: 2 });
    expect(terminal.accepted).toBe(true);
  });
});

describe("nfa", () => {
  test("handles epsilon branching", () => {
    const nfa = normalizeAutomaton({
      type: "NFA",
      states: [
        { id: "q0", isInitial: true, isAccepting: false },
        { id: "q1", isInitial: false, isAccepting: true },
      ],
      transitions: [{ from: "q0", to: "q1", input: "" }],
      initialState: "q0",
    });

    const step = stepNfa(nfa, { states: ["q0"], input: "", inputIndex: 0 });
    expect(step.accepted).toBe(true);
  });
});

describe("pda", () => {
  test("pushes and pops stack symbols", () => {
    const pda = normalizeAutomaton({
      type: "PDA",
      states: [
        { id: "q0", isInitial: true, isAccepting: false },
        { id: "q1", isInitial: false, isAccepting: true },
      ],
      transitions: [
        { from: "q0", to: "q0", input: "a", pop: "Z0", push: "AZ0" },
        { from: "q0", to: "q1", input: "", pop: "A", push: "" },
      ],
      initialState: "q0",
      initialStackSymbol: "Z0",
    });

    const first = stepPda(pda, {
      configurations: [{ id: "c0", state: "q0", inputIndex: 0, stack: ["Z0"] }],
      input: "a",
    });

    expect(first.nextConfigurations.length).toBeGreaterThan(0);
    expect(first.nextConfigurations[0]?.stack.includes("A")).toBe(true);
  });
});

describe("tm/lba", () => {
  test("writes on tape and moves head", () => {
    const tm = normalizeAutomaton({
      type: "TM",
      states: [
        { id: "q0", isInitial: true, isAccepting: false },
        { id: "q1", isInitial: false, isAccepting: true },
      ],
      transitions: [{ from: "q0", to: "q1", input: "a", write: "b", move: "R" }],
      initialState: "q0",
      blankSymbol: "B",
    });

    const result = stepTm(
      tm,
      { state: "q0", tape: createInitialTape("a", "B"), head: 0, inputIndex: 0 },
      { machineType: "TM", inputLength: 1, blankSymbol: "B" },
    );

    expect(result.nextConfiguration?.tape[0]).toBe("b");
    expect(result.accepted).toBe(true);
  });
});

describe("branch tree", () => {
  test("builds a non-empty tree", () => {
    const tree = buildComputationTree(dfa, "a");
    expect(tree.nodes.length).toBeGreaterThan(0);
  });
});
