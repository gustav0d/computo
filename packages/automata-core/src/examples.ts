import { normalizeAutomaton } from "./schema";
import type { AutomatonDefinition, MachineType } from "./types";

export interface AutomataExample {
  id: string;
  type: MachineType;
  name: string;
  description: string;
  automaton: AutomatonDefinition;
}

const examplesSeed: Array<Omit<AutomataExample, "automaton"> & { automaton: unknown }> = [
  {
    id: "dfa-even-a",
    type: "DFA",
    name: "Par de 'a's",
    description: "Aceita strings com número par de a's.",
    automaton: {
      type: "DFA",
      states: [
        { id: "q0", x: 200, y: 220, isInitial: true, isAccepting: true },
        { id: "q1", x: 420, y: 220, isInitial: false, isAccepting: false },
      ],
      transitions: [
        { id: "t1", from: "q0", to: "q1", input: "a" },
        { id: "t2", from: "q1", to: "q0", input: "a" },
        { id: "t3", from: "q0", to: "q0", input: "b" },
        { id: "t4", from: "q1", to: "q1", input: "b" },
      ],
      alphabet: ["a", "b"],
      initialState: "q0",
    },
  },
  {
    id: "nfa-contains-ab",
    type: "NFA",
    name: "Contém 'ab'",
    description: "Aceita strings que contêm a substring 'ab'.",
    automaton: {
      type: "NFA",
      states: [
        { id: "q0", x: 160, y: 220, isInitial: true, isAccepting: false },
        { id: "q1", x: 360, y: 220, isInitial: false, isAccepting: false },
        { id: "q2", x: 560, y: 220, isInitial: false, isAccepting: true },
      ],
      transitions: [
        { id: "t1", from: "q0", to: "q0", input: "a" },
        { id: "t2", from: "q0", to: "q0", input: "b" },
        { id: "t3", from: "q0", to: "q1", input: "a" },
        { id: "t4", from: "q1", to: "q2", input: "b" },
        { id: "t5", from: "q2", to: "q2", input: "a" },
        { id: "t6", from: "q2", to: "q2", input: "b" },
      ],
      alphabet: ["a", "b"],
      initialState: "q0",
    },
  },
  {
    id: "pda-anbn",
    type: "PDA",
    name: "aⁿbⁿ",
    description: "Aceita strings da forma aⁿbⁿ (n ≥ 1).",
    automaton: {
      type: "PDA",
      states: [
        { id: "q0", x: 180, y: 220, isInitial: true, isAccepting: false },
        { id: "q1", x: 390, y: 220, isInitial: false, isAccepting: false },
        { id: "q2", x: 600, y: 220, isInitial: false, isAccepting: true },
      ],
      transitions: [
        { id: "t1", from: "q0", to: "q0", input: "a", pop: "Z0", push: "AZ0" },
        { id: "t2", from: "q0", to: "q0", input: "a", pop: "A", push: "AA" },
        { id: "t3", from: "q0", to: "q1", input: "b", pop: "A", push: "" },
        { id: "t4", from: "q1", to: "q1", input: "b", pop: "A", push: "" },
        { id: "t5", from: "q1", to: "q2", input: "", pop: "Z0", push: "Z0" },
      ],
      alphabet: ["a", "b"],
      stackAlphabet: ["A", "Z0"],
      initialState: "q0",
      initialStackSymbol: "Z0",
    },
  },
  {
    id: "tm-copiador",
    type: "TM",
    name: "Copiador de String",
    description: "Modelo de cópia parcial para visualização de escrita em fita.",
    automaton: {
      type: "TM",
      states: [
        { id: "q0", x: 180, y: 170, isInitial: true, isAccepting: false },
        { id: "q1", x: 390, y: 170, isInitial: false, isAccepting: false },
        { id: "q2", x: 600, y: 170, isInitial: false, isAccepting: true },
      ],
      transitions: [
        { id: "t1", from: "q0", to: "q1", input: "a", write: "a", move: "R" },
        { id: "t2", from: "q1", to: "q1", input: "a", write: "a", move: "R" },
        { id: "t3", from: "q1", to: "q2", input: "B", write: "B", move: "S" },
      ],
      alphabet: ["a"],
      tapeAlphabet: ["a", "B"],
      initialState: "q0",
      blankSymbol: "B",
    },
  },
  {
    id: "tm-unary-add",
    type: "TM",
    name: "Somador Unário",
    description: "Aceita formato 1+1 e produz 11 na fita.",
    automaton: {
      type: "TM",
      states: [
        { id: "q0", x: 180, y: 220, isInitial: true, isAccepting: false },
        { id: "q1", x: 390, y: 220, isInitial: false, isAccepting: false },
        { id: "q2", x: 600, y: 220, isInitial: false, isAccepting: true },
      ],
      transitions: [
        { id: "t1", from: "q0", to: "q0", input: "1", write: "1", move: "R" },
        { id: "t2", from: "q0", to: "q1", input: "+", write: "1", move: "R" },
        { id: "t3", from: "q1", to: "q1", input: "1", write: "1", move: "R" },
        { id: "t4", from: "q1", to: "q2", input: "B", write: "B", move: "S" },
      ],
      alphabet: ["1", "+"],
      tapeAlphabet: ["1", "+", "B"],
      initialState: "q0",
      blankSymbol: "B",
    },
  },
  {
    id: "lba-anbncn",
    type: "LBA",
    name: "aⁿbⁿcⁿ (esqueleto)",
    description: "Exemplo de configuração inicial para LBA.",
    automaton: {
      type: "LBA",
      states: [
        { id: "q0", x: 240, y: 220, isInitial: true, isAccepting: false },
        { id: "q_accept", x: 520, y: 220, isInitial: false, isAccepting: true },
      ],
      transitions: [
        { id: "t1", from: "q0", to: "q_accept", input: "B", write: "B", move: "S" },
      ],
      alphabet: ["a", "b", "c"],
      tapeAlphabet: ["a", "b", "c", "X", "Y", "Z", "B"],
      initialState: "q0",
      blankSymbol: "B",
    },
  },
];

const examples = examplesSeed.map((seed) => ({
  ...seed,
  automaton: normalizeAutomaton(seed.automaton),
}));

export function getBuiltInExamples(type?: MachineType) {
  if (!type) {
    return examples;
  }
  return examples.filter((example) => example.type === type);
}

export function getBuiltInExampleById(id: string) {
  return examples.find((example) => example.id === id) ?? null;
}
