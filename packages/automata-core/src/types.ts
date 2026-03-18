export type MachineType = "DFA" | "NFA" | "PDA" | "LBA" | "TM";

export type MoveDirection = "L" | "R" | "S";

export type SimulationStatus = "running" | "accepted" | "rejected" | "halted";

export interface StateDefinition {
  id: string;
  x?: number;
  y?: number;
  isInitial: boolean;
  isAccepting: boolean;
}

export interface BaseTransition {
  id: string;
  from: string;
  to: string;
  input: string;
}

export interface FallbackTransition extends BaseTransition {
  kind: "FA";
}

export interface PdaTransition extends BaseTransition {
  kind: "PDA";
  pop: string;
  push: string;
}

export interface TmTransition extends BaseTransition {
  kind: "TM";
  write: string;
  move: MoveDirection;
}

export type TransitionDefinition = FallbackTransition | PdaTransition | TmTransition;

export interface AutomatonDefinition {
  type: MachineType;
  states: StateDefinition[];
  transitions: TransitionDefinition[];
  alphabet: string[];
  tapeAlphabet: string[];
  stackAlphabet: string[];
  initialState: string | null;
  initialStackSymbol: string;
  blankSymbol: string;
}

export interface DfaStepInput {
  state: string;
  input: string;
  inputIndex: number;
}

export interface DfaStepResult {
  nextState: string | null;
  consumed: boolean;
  transitionId: string | null;
  accepted: boolean | null;
}

export interface NfaStepInput {
  states: string[];
  input: string;
  inputIndex: number;
}

export interface NfaStepResult {
  nextStates: string[];
  consumed: boolean;
  transitionIds: string[];
  accepted: boolean | null;
}

export interface PdaConfiguration {
  id: string;
  state: string;
  inputIndex: number;
  stack: string[];
}

export interface PdaStepInput {
  configurations: PdaConfiguration[];
  input: string;
}

export interface PdaStepResult {
  nextConfigurations: PdaConfiguration[];
  transitionIds: string[];
  consumed: boolean;
  accepted: boolean | null;
}

export interface TmConfiguration {
  state: string;
  tape: string[];
  head: number;
  inputIndex: number;
}

export interface TmStepResult {
  nextConfiguration: TmConfiguration | null;
  transitionId: string | null;
  accepted: boolean | null;
  rejected: boolean;
}

export interface BranchTreeNode {
  id: string;
  parentId: string | null;
  depth: number;
  state: string;
  inputIndex: number;
  label: string;
  status: SimulationStatus;
  transitionId: string | null;
  stack: string[];
  tape: string[];
  tapeHead: number;
}

export interface BranchTreeEdge {
  id: string;
  source: string;
  target: string;
  label: string;
}

export interface BranchTree {
  rootId: string;
  nodes: BranchTreeNode[];
  edges: BranchTreeEdge[];
  acceptingNodeIds: string[];
  rejectedNodeIds: string[];
  truncated: boolean;
}

export interface HistoryEntry {
  step: number;
  stateLabel: string;
  transitionLabel: string;
  transitionId: string | null;
  inputIndex: number;
  activeStates: string[];
  stack: string[];
  tape: string[];
  tapeHead: number;
}

export interface SimulationLimits {
  maxSteps: number;
  maxConfigurations: number;
}
