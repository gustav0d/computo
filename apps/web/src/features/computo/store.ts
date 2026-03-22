import {
  buildComputationTree,
  createInitialAutomaton,
  createInitialTape,
  getBuiltInExampleById,
  normalizeAutomaton,
  parseAutomaton,
  parseAutomatonJson,
  stepDfa,
  stepNfa,
  stepPda,
  stepTm,
} from "@computo/automata-core";
import type {
  AutomatonDefinition,
  BranchTree,
  HistoryEntry,
  MachineType,
  PdaConfiguration,
  TmConfiguration,
  TransitionDefinition,
} from "@computo/automata-core";
import { create } from "zustand";

import { resolveCreatedTransitionHandles } from "./edge-routing";
import { createTransitionTemplate, snapValue } from "./helpers";

export type ToolMode = "state" | "transition" | "select" | "delete";

const STORAGE_KEY = "computo_automaton";
const GRID_SIZE = 20;

interface SimulationSnapshot {
  running: boolean;
  accepted: boolean | null;
  input: string;
  inputIndex: number;
  currentStates: string[];
  pdaConfigurations: PdaConfiguration[];
  tmConfiguration: TmConfiguration | null;
  history: HistoryEntry[];
  branchTree: BranchTree | null;
  lastTransitionIds: string[];
  speed: number;
}

interface ComputoStore {
  automaton: AutomatonDefinition;
  toolMode: ToolMode;
  selectedStateId: string | null;
  selectedTransitionId: string | null;
  editingStateId: string | null;
  editingTransitionId: string | null;
  showExamplesModal: boolean;
  showTransitionModal: boolean;
  showImportError: string | null;
  snapToGrid: boolean;
  zoom: number;
  simulation: SimulationSnapshot;
  setToolMode: (mode: ToolMode) => void;
  setSelectedState: (stateId: string | null) => void;
  setSelectedTransition: (transitionId: string | null) => void;
  setMachineType: (type: MachineType) => void;
  addState: (x: number, y: number) => void;
  moveState: (stateId: string, x: number, y: number) => void;
  updateState: (
    stateId: string,
    payload: { id: string; isInitial: boolean; isAccepting: boolean },
  ) => void;
  deleteState: (stateId: string) => void;
  addTransition: (
    from: string,
    to: string,
    sourceHandle?: string | null,
    targetHandle?: string | null,
  ) => void;
  updateTransition: (transitionId: string, payload: Record<string, string>) => void;
  deleteTransition: (transitionId: string) => void;
  openTransitionEditor: (transitionId: string) => void;
  closeTransitionEditor: () => void;
  openExamples: () => void;
  closeExamples: () => void;
  loadExample: (exampleId: string) => void;
  importAutomatonJson: (raw: string) => boolean;
  loadAutomaton: (automaton: unknown) => boolean;
  exportAutomatonJson: () => string;
  saveAutomaton: () => void;
  loadSavedAutomaton: () => void;
  setSnapToGrid: (enabled: boolean) => void;
  setZoom: (zoom: number) => void;
  setSimulationInput: (value: string) => void;
  setSimulationSpeed: (value: number) => void;
  clearImportError: () => void;
  resetSimulation: () => void;
  startSimulation: () => void;
  stepSimulation: () => void;
}

function nextStateId(automaton: AutomatonDefinition) {
  const max = automaton.states.reduce((acc, state) => {
    const match = /^q(\d+)$/.exec(state.id);
    if (match === null) {
      return acc;
    }
    return Math.max(acc, Number(match[1]));
  }, -1);

  return `q${max + 1}`;
}

function nextTransitionId(automaton: AutomatonDefinition) {
  const max = automaton.transitions.reduce((acc, transition) => {
    const match = /^t(\d+)$/.exec(transition.id);
    if (match === null) {
      return acc;
    }
    return Math.max(acc, Number(match[1]));
  }, -1);

  return `t${max + 1}`;
}

function withRecomputedAlphabet(automaton: AutomatonDefinition) {
  return normalizeAutomaton(automaton);
}

function buildHistoryEntry(
  automaton: AutomatonDefinition,
  step: number,
  stateLabel: string,
  transitionId: string | null,
  simulation: SimulationSnapshot,
): HistoryEntry {
  const transition = automaton.transitions.find((item) => item.id === transitionId);
  const transitionLabel = transition?.id ?? "-";

  const stack = simulation.pdaConfigurations[0]?.stack ?? [];
  const tape = simulation.tmConfiguration?.tape ?? [];
  const tapeHead = simulation.tmConfiguration?.head ?? 0;

  return {
    step,
    stateLabel,
    transitionLabel,
    transitionId,
    inputIndex: simulation.inputIndex,
    activeStates: simulation.currentStates,
    stack,
    tape,
    tapeHead,
  };
}

function freshSimulationState(): SimulationSnapshot {
  return {
    running: false,
    accepted: null,
    input: "",
    inputIndex: 0,
    currentStates: [],
    pdaConfigurations: [],
    tmConfiguration: null,
    history: [],
    branchTree: null,
    lastTransitionIds: [],
    speed: 5,
  };
}

function ensureSingleInitialState(automaton: AutomatonDefinition, initialId: string | null) {
  return {
    ...automaton,
    initialState: initialId,
    states: automaton.states.map((state) => ({
      ...state,
      isInitial: initialId !== null && state.id === initialId,
    })),
  };
}

export const useComputoStore = create<ComputoStore>((set, get) => ({
  automaton: createInitialAutomaton(),
  toolMode: "state",
  selectedStateId: null,
  selectedTransitionId: null,
  editingStateId: null,
  editingTransitionId: null,
  showExamplesModal: false,
  showTransitionModal: false,
  showImportError: null,
  snapToGrid: true,
  zoom: 1,
  simulation: freshSimulationState(),

  setToolMode: (mode) => set(() => ({ toolMode: mode })),

  setSelectedState: (stateId) =>
    set(() => ({
      selectedStateId: stateId,
      selectedTransitionId: null,
      editingStateId: stateId,
      editingTransitionId: null,
    })),

  setSelectedTransition: (transitionId) =>
    set(() => ({
      selectedStateId: null,
      selectedTransitionId: transitionId,
      editingStateId: null,
      editingTransitionId: transitionId,
      showTransitionModal: transitionId !== null,
    })),

  setMachineType: (type) =>
    set(() => ({
      automaton: createInitialAutomaton(type),
      selectedStateId: null,
      selectedTransitionId: null,
      editingStateId: null,
      editingTransitionId: null,
      simulation: freshSimulationState(),
    })),

  addState: (x, y) =>
    set((state) => {
      const id = nextStateId(state.automaton);
      const first = state.automaton.states.length === 0;
      const snappedX = snapValue(x, GRID_SIZE, state.snapToGrid);
      const snappedY = snapValue(y, GRID_SIZE, state.snapToGrid);

      const automaton = withRecomputedAlphabet({
        ...state.automaton,
        states: [
          ...state.automaton.states,
          {
            id,
            x: snappedX,
            y: snappedY,
            isInitial: first,
            isAccepting: false,
          },
        ],
        initialState: first ? id : state.automaton.initialState,
      });

      return {
        automaton,
        selectedStateId: id,
        editingStateId: id,
        selectedTransitionId: null,
      };
    }),

  moveState: (stateId, x, y) =>
    set((state) => ({
      automaton: {
        ...state.automaton,
        states: state.automaton.states.map((candidate) =>
          candidate.id === stateId
            ? {
                ...candidate,
                x: snapValue(x, GRID_SIZE, state.snapToGrid),
                y: snapValue(y, GRID_SIZE, state.snapToGrid),
              }
            : candidate,
        ),
      },
    })),

  updateState: (stateId, payload) =>
    set((state) => {
      const hasIdCollision =
        payload.id !== stateId &&
        state.automaton.states.some((candidate) => candidate.id === payload.id);

      if (hasIdCollision) {
        return {
          showImportError: "Já existe um estado com este identificador.",
        };
      }

      const updatedStates = state.automaton.states.map((candidate) => {
        if (candidate.id !== stateId) {
          return candidate;
        }

        return {
          ...candidate,
          id: payload.id,
          isInitial: payload.isInitial,
          isAccepting: payload.isAccepting,
        };
      });

      const renamedTransitions = state.automaton.transitions.map((transition) => ({
        ...transition,
        from: transition.from === stateId ? payload.id : transition.from,
        to: transition.to === stateId ? payload.id : transition.to,
      }));

      const initialState = payload.isInitial
        ? payload.id
        : state.automaton.initialState === stateId
          ? null
          : state.automaton.initialState;

      const automaton = withRecomputedAlphabet(
        ensureSingleInitialState(
          {
            ...state.automaton,
            states: updatedStates,
            transitions: renamedTransitions,
            initialState,
          },
          initialState,
        ),
      );

      return {
        automaton,
        selectedStateId: payload.id,
        editingStateId: payload.id,
        showImportError: null,
      };
    }),

  deleteState: (stateId) =>
    set((state) => {
      const states = state.automaton.states.filter((candidate) => candidate.id !== stateId);
      const transitions = state.automaton.transitions.filter(
        (transition) => transition.from !== stateId && transition.to !== stateId,
      );

      const nextInitial =
        state.automaton.initialState === stateId
          ? (states[0]?.id ?? null)
          : state.automaton.initialState;

      const automaton = withRecomputedAlphabet(
        ensureSingleInitialState(
          {
            ...state.automaton,
            states,
            transitions,
            initialState: nextInitial,
          },
          nextInitial,
        ),
      );

      return {
        automaton,
        selectedStateId: null,
        editingStateId: null,
        selectedTransitionId: null,
      };
    }),

  addTransition: (from, to, sourceHandle, targetHandle) =>
    set((state) => {
      if (state.automaton.type === "DFA") {
        const hasConnection = state.automaton.transitions.some(
          (transition) => transition.from === from && transition.to === to,
        );
        if (hasConnection) {
          return {
            showImportError: "DFA já possui transição entre esses estados.",
          };
        }
      }

      const transitionId = nextTransitionId(state.automaton);
      const handles = resolveCreatedTransitionHandles(state.automaton.transitions, from, to, {
        sourceHandle,
        targetHandle,
      });
      const transition = createTransitionTemplate(
        state.automaton.type,
        from,
        to,
        transitionId,
        handles,
      );

      const automaton = withRecomputedAlphabet({
        ...state.automaton,
        transitions: [...state.automaton.transitions, transition],
      });

      return {
        automaton,
        selectedTransitionId: transitionId,
        editingTransitionId: transitionId,
        showTransitionModal: true,
        showImportError: null,
      };
    }),

  updateTransition: (transitionId, payload) =>
    set((state) => {
      const transitions = state.automaton.transitions.map((transition) => {
        if (transition.id !== transitionId) {
          return transition;
        }

        if (transition.kind === "PDA") {
          return {
            ...transition,
            input: payload.input ?? transition.input,
            pop: payload.pop ?? transition.pop,
            push: payload.push ?? transition.push,
          };
        }

        if (transition.kind === "TM") {
          const move = payload.move;
          const safeMove = move === "L" || move === "R" || move === "S" ? move : transition.move;
          return {
            ...transition,
            input: payload.input ?? transition.input,
            write: payload.write ?? transition.write,
            move: safeMove,
          };
        }

        return {
          ...transition,
          input: payload.input ?? transition.input,
        };
      });

      return {
        automaton: withRecomputedAlphabet({
          ...state.automaton,
          transitions,
        }),
      };
    }),

  deleteTransition: (transitionId) =>
    set((state) => ({
      automaton: withRecomputedAlphabet({
        ...state.automaton,
        transitions: state.automaton.transitions.filter(
          (transition) => transition.id !== transitionId,
        ),
      }),
      selectedTransitionId: null,
      editingTransitionId: null,
      showTransitionModal: false,
    })),

  openTransitionEditor: (transitionId) =>
    set(() => ({
      showTransitionModal: true,
      editingTransitionId: transitionId,
      selectedTransitionId: transitionId,
    })),

  closeTransitionEditor: () =>
    set(() => ({
      showTransitionModal: false,
      editingTransitionId: null,
    })),

  openExamples: () => set(() => ({ showExamplesModal: true })),
  closeExamples: () => set(() => ({ showExamplesModal: false })),

  loadExample: (exampleId) =>
    set(() => {
      const example = getBuiltInExampleById(exampleId);
      if (example === null) {
        return {};
      }

      return {
        automaton: normalizeAutomaton(example.automaton),
        simulation: freshSimulationState(),
        selectedStateId: null,
        selectedTransitionId: null,
        showExamplesModal: false,
        showImportError: null,
      };
    }),

  importAutomatonJson: (raw) => {
    const parsed = parseAutomatonJson(raw);
    if (parsed.success === false) {
      set(() => ({ showImportError: "Falha ao carregar JSON de autômato." }));
      return false;
    }

    set(() => ({
      automaton: parsed.data,
      simulation: freshSimulationState(),
      selectedStateId: null,
      selectedTransitionId: null,
      showImportError: null,
    }));

    return true;
  },

  loadAutomaton: (automatonData) => {
    const parsed = parseAutomaton(automatonData);
    if (parsed.success === false) {
      set(() => ({ showImportError: "Formato de autômato inválido." }));
      return false;
    }

    set(() => ({
      automaton: parsed.data,
      simulation: freshSimulationState(),
      selectedStateId: null,
      selectedTransitionId: null,
      showImportError: null,
    }));

    return true;
  },

  exportAutomatonJson: () => JSON.stringify(get().automaton, null, 2),

  saveAutomaton: () => {
    const { automaton } = get();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(automaton));
  },

  loadSavedAutomaton: () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      get().loadAutomaton(parsed);
    } catch {
      set(() => ({ showImportError: "Não foi possível recuperar o autômato salvo." }));
    }
  },

  setSnapToGrid: (enabled) => set(() => ({ snapToGrid: enabled })),
  setZoom: (zoom) => set(() => ({ zoom })),

  setSimulationInput: (value) =>
    set((state) => ({
      simulation: {
        ...state.simulation,
        input: value,
      },
    })),

  setSimulationSpeed: (value) =>
    set((state) => ({
      simulation: {
        ...state.simulation,
        speed: value,
      },
    })),

  clearImportError: () => set(() => ({ showImportError: null })),

  resetSimulation: () =>
    set((state) => ({
      simulation: {
        ...freshSimulationState(),
        input: state.simulation.input,
        speed: state.simulation.speed,
      },
    })),

  startSimulation: () => {
    const state = get();

    if (state.automaton.initialState === null) {
      set(() => ({ showImportError: "Defina um estado inicial antes de simular." }));
      return;
    }

    const simulation = freshSimulationState();
    simulation.running = true;
    simulation.input = state.simulation.input;
    simulation.speed = state.simulation.speed;
    simulation.currentStates = [state.automaton.initialState];

    if (state.automaton.type === "PDA") {
      simulation.pdaConfigurations = [
        {
          id: "c0",
          state: state.automaton.initialState,
          inputIndex: 0,
          stack: [state.automaton.initialStackSymbol],
        },
      ];
    }

    if (state.automaton.type === "TM" || state.automaton.type === "LBA") {
      simulation.tmConfiguration = {
        state: state.automaton.initialState,
        tape: createInitialTape(simulation.input, state.automaton.blankSymbol),
        head: 0,
        inputIndex: 0,
      };
    }

    if (state.automaton.type === "NFA" || state.automaton.type === "PDA") {
      simulation.branchTree = buildComputationTree(state.automaton, simulation.input);
    }

    simulation.history = [
      buildHistoryEntry(state.automaton, 1, state.automaton.initialState, null, {
        ...simulation,
      }),
    ];

    set(() => ({
      simulation,
      showImportError: null,
    }));
  },

  stepSimulation: () => {
    const state = get();
    if (state.simulation.running === false) {
      get().startSimulation();
      return;
    }

    if (state.simulation.accepted !== null) {
      return;
    }

    const simulation = { ...state.simulation };

    if (state.automaton.type === "DFA") {
      const current = simulation.currentStates[0];
      if (current === undefined) {
        simulation.accepted = false;
        simulation.running = false;
      } else {
        const result = stepDfa(state.automaton, {
          state: current,
          input: simulation.input,
          inputIndex: simulation.inputIndex,
        });

        if (result.nextState === null) {
          simulation.accepted = false;
          simulation.running = false;
        } else {
          simulation.currentStates = [result.nextState];
          simulation.lastTransitionIds = result.transitionId ? [result.transitionId] : [];
          if (result.consumed) {
            simulation.inputIndex += 1;
          }

          if (simulation.inputIndex >= simulation.input.length) {
            const accepted = state.automaton.states.some(
              (candidate) => candidate.id === result.nextState && candidate.isAccepting,
            );
            simulation.accepted = accepted;
            simulation.running = false;
          }
        }
      }
    }

    if (state.automaton.type === "NFA") {
      const result = stepNfa(state.automaton, {
        states: simulation.currentStates,
        input: simulation.input,
        inputIndex: simulation.inputIndex,
      });

      simulation.currentStates = result.nextStates;
      simulation.lastTransitionIds = result.transitionIds;
      if (result.consumed) {
        simulation.inputIndex += 1;
      }

      if (result.accepted !== null) {
        simulation.accepted = result.accepted;
        simulation.running = false;
      }
    }

    if (state.automaton.type === "PDA") {
      const result = stepPda(state.automaton, {
        configurations: simulation.pdaConfigurations,
        input: simulation.input,
      });

      simulation.pdaConfigurations = result.nextConfigurations;
      simulation.currentStates = Array.from(
        new Set(result.nextConfigurations.map((config) => config.state)),
      );
      simulation.lastTransitionIds = result.transitionIds;

      const maxIndex = result.nextConfigurations.reduce(
        (acc, config) => Math.max(acc, config.inputIndex),
        simulation.inputIndex,
      );
      simulation.inputIndex = maxIndex;

      if (result.accepted !== null) {
        simulation.accepted = result.accepted;
        simulation.running = false;
      }
    }

    if (state.automaton.type === "TM" || state.automaton.type === "LBA") {
      const current = simulation.tmConfiguration;
      if (current === null) {
        simulation.accepted = false;
        simulation.running = false;
      } else {
        const result = stepTm(state.automaton, current, {
          machineType: state.automaton.type,
          inputLength: simulation.input.length,
          blankSymbol: state.automaton.blankSymbol,
        });

        simulation.lastTransitionIds = result.transitionId ? [result.transitionId] : [];

        if (result.nextConfiguration === null) {
          simulation.accepted = result.accepted === true;
          simulation.running = false;
        } else {
          simulation.tmConfiguration = result.nextConfiguration;
          simulation.currentStates = [result.nextConfiguration.state];
          simulation.inputIndex = result.nextConfiguration.inputIndex;

          if (result.accepted !== null) {
            simulation.accepted = result.accepted;
            simulation.running = false;
          }
        }
      }
    }

    const transitionId = simulation.lastTransitionIds[0] ?? null;
    const stateLabel = simulation.currentStates.join(", ") || "-";
    simulation.history = [
      ...simulation.history,
      buildHistoryEntry(
        state.automaton,
        simulation.history.length + 1,
        stateLabel,
        transitionId,
        simulation,
      ),
    ];

    set(() => ({ simulation }));
  },
}));

export function selectTransitionById(
  automaton: AutomatonDefinition,
  transitionId: string | null,
): TransitionDefinition | null {
  if (transitionId === null) {
    return null;
  }
  return automaton.transitions.find((transition) => transition.id === transitionId) ?? null;
}
