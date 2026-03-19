import { getBuiltInExamples } from "@computo/automata-core";
import type { BranchTree, MachineType, TransitionDefinition } from "@computo/automata-core";
import { Button } from "@computo/ui/components/button";
import { Input } from "@computo/ui/components/input";
import {
  type Connection,
  Controls,
  type Edge,
  MarkerType,
  MiniMap,
  type Node,
  type NodeProps,
  type OnEdgesChange,
  type OnNodesChange,
  type ReactFlowInstance,
  ReactFlow,
  ReactFlowProvider,
  applyEdgeChanges,
  applyNodeChanges,
} from "@xyflow/react";
import {
  BookOpen,
  Bot,
  Clock3,
  Download,
  GitBranch,
  Move,
  MousePointer2,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Upload,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { ModeToggle } from "@/components/mode-toggle";

import {
  MACHINE_ACCENT_CLASS,
  MACHINE_TYPE_OPTIONS,
  formatFormalDefinition,
  getTransitionLabel,
} from "../helpers";
import { selectTransitionById, useComputoStore } from "../store";

import "@xyflow/react/dist/style.css";

type StateNodeData = {
  id: string;
  isInitial: boolean;
  isAccepting: boolean;
  active: boolean;
};

type BranchNodeData = {
  label: string;
  status: "running" | "accepted" | "rejected" | "halted";
  stack: string[];
};

const nodeTypes = {
  stateNode: function StateNode({ data, selected }: NodeProps<Node<StateNodeData>>) {
    const ringClass = data.active ? "ring-2 ring-emerald-400/70" : "";
    const borderClass = selected ? "border-emerald-400" : "border-slate-500/60";

    return (
      <div className="relative">
        {data.isInitial ? (
          <svg
            className="pointer-events-none absolute -left-8 top-1/2 -translate-y-1/2"
            width="32"
            height="16"
            viewBox="0 0 32 16"
            fill="none"
          >
            <line x1="0" y1="8" x2="22" y2="8" stroke="#64748b" strokeWidth="2" />
            <polyline points="14,3 24,8 14,13" stroke="#64748b" strokeWidth="2" strokeLinejoin="round" fill="none" />
          </svg>
        ) : null}
        <div
          className={`grid size-14 place-items-center rounded-full border-2 bg-slate-900 text-sm font-semibold text-slate-100 ${borderClass} ${ringClass}`}
        >
          <span>{data.id}</span>
        </div>
        {data.isAccepting ? (
          <div className="pointer-events-none absolute left-1/2 top-1/2 size-11 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-200/80" />
        ) : null}
      </div>
    );
  },
  branchNode: function BranchNode({ data }: NodeProps<Node<BranchNodeData>>) {
    const statusClass =
      data.status === "accepted"
        ? "border-green-500/70 bg-green-500/15 text-green-300"
        : data.status === "rejected"
          ? "border-red-500/70 bg-red-500/15 text-red-300"
          : data.status === "halted"
            ? "border-yellow-500/70 bg-yellow-500/15 text-yellow-200"
            : "border-slate-500/70 bg-slate-800/70 text-slate-100";

    return (
      <div className={`min-w-40 rounded-md border px-2 py-1 text-xs ${statusClass}`}>
        <div className="font-semibold">{data.label}</div>
        {data.stack.length > 0 ? (
          <div className="mt-1 text-[10px]">Pilha: {data.stack.join(" ")}</div>
        ) : null}
      </div>
    );
  },
};

function buildTransitionTable(type: MachineType, symbols: string[]) {
  if (type === "DFA" || type === "NFA") {
    const tableSymbols = symbols.length > 0 ? symbols : ["a", "b"];
    if (type === "NFA") {
      tableSymbols.push("ε");
    }
    return tableSymbols;
  }

  return [];
}

function useBranchFlow(branchTree: BranchTree | null) {
  return useMemo(() => {
    if (branchTree === null) {
      return {
        nodes: [] as Array<Node<BranchNodeData>>,
        edges: [] as Edge[],
      };
    }

    const depthGroups = new Map<number, typeof branchTree.nodes>();
    for (const node of branchTree.nodes) {
      const group = depthGroups.get(node.depth) ?? [];
      group.push(node);
      depthGroups.set(node.depth, group);
    }

    const nodes = branchTree.nodes.map((node) => {
      const siblings = depthGroups.get(node.depth) ?? [];
      const row = siblings.findIndex((candidate) => candidate.id === node.id);

      return {
        id: node.id,
        type: "branchNode",
        position: {
          x: node.depth * 220,
          y: row * 96,
        },
        data: {
          label: node.label,
          status: node.status,
          stack: node.stack,
        },
        draggable: false,
      } satisfies Node<BranchNodeData>;
    });

    const edges = branchTree.edges.map(
      (edge) =>
        ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: edge.label,
          animated: false,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "#94a3b8",
          },
          style: {
            stroke: "#64748b",
          },
          labelStyle: {
            fontSize: 10,
          },
        }) satisfies Edge,
    );

    return { nodes, edges };
  }, [branchTree]);
}

function ComputoAppInner() {
  const automaton = useComputoStore((state) => state.automaton);
  const toolMode = useComputoStore((state) => state.toolMode);
  const selectedStateId = useComputoStore((state) => state.selectedStateId);
  const selectedTransitionId = useComputoStore((state) => state.selectedTransitionId);
  const editingStateId = useComputoStore((state) => state.editingStateId);
  const editingTransitionId = useComputoStore((state) => state.editingTransitionId);
  const showExamplesModal = useComputoStore((state) => state.showExamplesModal);
  const showTransitionModal = useComputoStore((state) => state.showTransitionModal);
  const showImportError = useComputoStore((state) => state.showImportError);
  const snapToGrid = useComputoStore((state) => state.snapToGrid);
  const zoom = useComputoStore((state) => state.zoom);
  const simulation = useComputoStore((state) => state.simulation);

  const setToolMode = useComputoStore((state) => state.setToolMode);
  const setSelectedState = useComputoStore((state) => state.setSelectedState);
  const setSelectedTransition = useComputoStore((state) => state.setSelectedTransition);
  const setMachineType = useComputoStore((state) => state.setMachineType);
  const addState = useComputoStore((state) => state.addState);
  const moveState = useComputoStore((state) => state.moveState);
  const updateState = useComputoStore((state) => state.updateState);
  const deleteState = useComputoStore((state) => state.deleteState);
  const addTransition = useComputoStore((state) => state.addTransition);
  const updateTransition = useComputoStore((state) => state.updateTransition);
  const deleteTransition = useComputoStore((state) => state.deleteTransition);
  const openTransitionEditor = useComputoStore((state) => state.openTransitionEditor);
  const closeTransitionEditor = useComputoStore((state) => state.closeTransitionEditor);
  const openExamples = useComputoStore((state) => state.openExamples);
  const closeExamples = useComputoStore((state) => state.closeExamples);
  const loadExample = useComputoStore((state) => state.loadExample);
  const importAutomatonJson = useComputoStore((state) => state.importAutomatonJson);
  const exportAutomatonJson = useComputoStore((state) => state.exportAutomatonJson);
  const saveAutomaton = useComputoStore((state) => state.saveAutomaton);
  const loadSavedAutomaton = useComputoStore((state) => state.loadSavedAutomaton);
  const setSnapToGrid = useComputoStore((state) => state.setSnapToGrid);
  const setZoom = useComputoStore((state) => state.setZoom);
  const setSimulationInput = useComputoStore((state) => state.setSimulationInput);
  const setSimulationSpeed = useComputoStore((state) => state.setSimulationSpeed);
  const clearImportError = useComputoStore((state) => state.clearImportError);
  const resetSimulation = useComputoStore((state) => state.resetSimulation);
  const startSimulation = useComputoStore((state) => state.startSimulation);
  const stepSimulation = useComputoStore((state) => state.stepSimulation);

  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance<any, any> | null>(
    null,
  );
  const [stateEditor, setStateEditor] = useState({ id: "", isInitial: false, isAccepting: false });
  const [transitionEditor, setTransitionEditor] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }
    loadSavedAutomaton();
    initializedRef.current = true;
  }, [loadSavedAutomaton]);

  useEffect(() => {
    if (showImportError === null) {
      return;
    }
    toast.error(showImportError);
    clearImportError();
  }, [showImportError, clearImportError]);

  useEffect(() => {
    if (simulation.running === false || simulation.accepted !== null) {
      return;
    }

    const delay = (11 - simulation.speed) * 200;
    const timeout = setTimeout(() => {
      stepSimulation();
    }, delay);

    return () => {
      clearTimeout(timeout);
    };
  }, [
    simulation.accepted,
    simulation.history.length,
    simulation.running,
    simulation.speed,
    stepSimulation,
  ]);

  const selectedState = useMemo(
    () => automaton.states.find((state) => state.id === editingStateId) ?? null,
    [automaton.states, editingStateId],
  );

  const selectedTransition = useMemo(
    () => selectTransitionById(automaton, editingTransitionId),
    [automaton, editingTransitionId],
  );

  useEffect(() => {
    if (selectedState === null) {
      return;
    }

    setStateEditor({
      id: selectedState.id,
      isInitial: selectedState.isInitial,
      isAccepting: selectedState.isAccepting,
    });
  }, [selectedState]);

  useEffect(() => {
    if (selectedTransition === null) {
      return;
    }

    if (selectedTransition.kind === "PDA") {
      setTransitionEditor({
        input: selectedTransition.input,
        pop: selectedTransition.pop,
        push: selectedTransition.push,
      });
      return;
    }

    if (selectedTransition.kind === "TM") {
      setTransitionEditor({
        input: selectedTransition.input,
        write: selectedTransition.write,
        move: selectedTransition.move,
      });
      return;
    }

    setTransitionEditor({
      input: selectedTransition.input,
    });
  }, [selectedTransition]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        return;
      }

      if (event.key === "1") {
        setToolMode("state");
      }
      if (event.key === "2") {
        setToolMode("transition");
      }
      if (event.key === "3") {
        setToolMode("select");
      }
      if (event.key === "4") {
        setToolMode("delete");
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        if (selectedStateId !== null) {
          deleteState(selectedStateId);
        } else if (selectedTransitionId !== null) {
          deleteTransition(selectedTransitionId);
        }
      }

      if (event.key === "Escape") {
        setSelectedState(null);
        setSelectedTransition(null);
        closeTransitionEditor();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    closeTransitionEditor,
    deleteState,
    deleteTransition,
    selectedStateId,
    selectedTransitionId,
    setSelectedState,
    setSelectedTransition,
    setToolMode,
  ]);

  const graphNodes = useMemo(() => {
    return automaton.states.map((state) => {
      return {
        id: state.id,
        type: "stateNode",
        position: {
          x: state.x ?? 160,
          y: state.y ?? 160,
        },
        data: {
          id: state.id,
          isInitial: state.isInitial,
          isAccepting: state.isAccepting,
          active: simulation.currentStates.includes(state.id),
        },
        draggable: toolMode !== "delete",
        selected: selectedStateId === state.id,
      } satisfies Node<StateNodeData>;
    });
  }, [automaton.states, selectedStateId, simulation.currentStates, toolMode]);

  const graphEdges = useMemo(() => {
    const grouped = new Map<string, TransitionDefinition[]>();
    for (const transition of automaton.transitions) {
      const key = `${transition.from}-${transition.to}`;
      const bucket = grouped.get(key) ?? [];
      bucket.push(transition);
      grouped.set(key, bucket);
    }

    const edges: Edge[] = [];

    for (const bucket of grouped.values()) {
      for (const transition of bucket) {
        const active = simulation.lastTransitionIds.includes(transition.id);

        edges.push({
          id: transition.id,
          source: transition.from,
          target: transition.to,
          type: "smoothstep",
          animated: active,
          label: getTransitionLabel(automaton.type, transition),
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: active ? "#10b981" : "#94a3b8",
          },
          style: {
            stroke: active ? "#10b981" : "#94a3b8",
            strokeWidth: active ? 2.5 : 1.6,
          },
          labelStyle: {
            fontSize: 11,
            fill: "#e2e8f0",
          },
          labelBgStyle: {
            fill: "#0f172a",
            fillOpacity: 0.85,
          },
          selected: selectedTransitionId === transition.id,
        });
      }
    }

    return edges;
  }, [automaton.transitions, automaton.type, selectedTransitionId, simulation.lastTransitionIds]);

  const branchFlow = useBranchFlow(simulation.branchTree);

  const transitionTableSymbols = useMemo(
    () => buildTransitionTable(automaton.type, [...automaton.alphabet]),
    [automaton.alphabet, automaton.type],
  );

  const onNodesChange = useCallback<OnNodesChange<Node<StateNodeData>>>(
    (changes) => {
      const next = applyNodeChanges(changes, graphNodes);
      for (const node of next) {
        const original = graphNodes.find((candidate) => candidate.id === node.id);
        if (original === undefined) {
          continue;
        }
        if (original.position.x !== node.position.x || original.position.y !== node.position.y) {
          moveState(node.id, node.position.x, node.position.y);
        }
      }
    },
    [graphNodes, moveState],
  );

  const onEdgesChange = useCallback<OnEdgesChange<Edge>>(
    (changes) => {
      const removed = applyEdgeChanges(changes, graphEdges);
      const removedIds = graphEdges
        .filter((edge) => removed.find((candidate) => candidate.id === edge.id) === undefined)
        .map((edge) => edge.id);

      for (const id of removedIds) {
        deleteTransition(id);
      }
    },
    [deleteTransition, graphEdges],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (toolMode !== "transition") {
        return;
      }
      if (connection.source === null || connection.target === null) {
        return;
      }
      addTransition(connection.source, connection.target);
    },
    [addTransition, toolMode],
  );

  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (toolMode !== "state") {
        setSelectedState(null);
        setSelectedTransition(null);
        return;
      }
      if (reactFlowInstance === null) {
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      addState(position.x, position.y);
    },
    [addState, reactFlowInstance, setSelectedState, setSelectedTransition, toolMode],
  );

  const tapeWindow = useMemo(() => {
    const config = simulation.tmConfiguration;
    if (config === null) {
      return [];
    }

    const start = Math.max(0, config.head - 6);
    const end = Math.min(config.tape.length, config.head + 7);

    return config.tape.slice(start, end).map((cell, index) => ({
      absoluteIndex: start + index,
      value: cell,
      head: start + index === config.head,
    }));
  }, [simulation.tmConfiguration]);

  const formalLines = useMemo(() => formatFormalDefinition(automaton), [automaton]);

  return (
    <div className="computo-shell h-full">
      <header className="computo-header flex h-14 items-center justify-between border-b px-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Bot className="size-5 text-emerald-400" />
            <span className="text-lg font-semibold tracking-tight">Computo</span>
          </div>
          <div className="h-6 w-px bg-computo-border" />
          <select
            className="computo-input h-9 min-w-80 rounded-md px-2 text-xs"
            value={automaton.type}
            onChange={(event) => {
              setMachineType(event.target.value as MachineType);
            }}
            aria-label="Tipo de máquina"
          >
            {MACHINE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={openExamples}>
            <BookOpen data-icon="inline-start" />
            Exemplos
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fileInputRef.current?.click();
            }}
          >
            <Upload data-icon="inline-start" />
            Importar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const data = exportAutomatonJson();
              const blob = new Blob([data], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const anchor = document.createElement("a");
              anchor.href = url;
              anchor.download = `computo_${automaton.type}_${Date.now()}.json`;
              anchor.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download data-icon="inline-start" />
            Exportar
          </Button>
          <Button
            size="sm"
            onClick={() => {
              saveAutomaton();
              toast.success("Autômato salvo localmente.");
            }}
          >
            <Save data-icon="inline-start" />
            Salvar
          </Button>
          <ModeToggle />
        </div>
      </header>

      <main className="grid h-[calc(100%-56px)] grid-cols-[18rem_1fr_22rem]">
        <aside className="computo-panel border-r p-3">
          <section className="mb-4 rounded-md border border-computo-border bg-computo-card p-3">
            <h3 className="mb-3 text-[11px] font-semibold tracking-[0.08em] text-computo-muted uppercase">
              Ferramentas
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={toolMode === "state" ? "default" : "outline"}
                size="sm"
                onClick={() => setToolMode("state")}
                className="justify-start"
              >
                <Plus data-icon="inline-start" />
                Estado
              </Button>
              <Button
                variant={toolMode === "transition" ? "default" : "outline"}
                size="sm"
                onClick={() => setToolMode("transition")}
                className="justify-start"
              >
                <GitBranch data-icon="inline-start" />
                Transição
              </Button>
              <Button
                variant={toolMode === "select" ? "default" : "outline"}
                size="sm"
                onClick={() => setToolMode("select")}
                className="justify-start"
              >
                <MousePointer2 data-icon="inline-start" />
                Selecionar
              </Button>
              <Button
                variant={toolMode === "delete" ? "destructive" : "outline"}
                size="sm"
                onClick={() => setToolMode("delete")}
                className="justify-start"
              >
                <Trash2 data-icon="inline-start" />
                Deletar
              </Button>
            </div>
            <p className="mt-3 text-[11px] text-computo-muted">Atalhos: 1/2/3/4, Delete e Esc.</p>
          </section>

          <section className="mb-4 rounded-md border border-computo-border bg-computo-card p-3">
            <h3 className="mb-2 text-[11px] font-semibold tracking-[0.08em] text-computo-muted uppercase">
              Definição Formal
            </h3>
            <div className="space-y-1 font-mono text-xs text-computo-text">
              {formalLines.map((line) => (
                <div key={line}>{line}</div>
              ))}
            </div>
          </section>

          <section className="mb-4 overflow-auto rounded-md border border-computo-border bg-computo-card p-3">
            <h3 className="mb-2 text-[11px] font-semibold tracking-[0.08em] text-computo-muted uppercase">
              Tabela de Transições
            </h3>
            {automaton.transitions.length === 0 ? (
              <p className="text-xs text-computo-muted">Nenhuma transição definida.</p>
            ) : automaton.type === "DFA" || automaton.type === "NFA" ? (
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="border border-computo-border px-2 py-1 text-left">δ</th>
                    {transitionTableSymbols.map((symbol) => (
                      <th key={symbol} className="border border-computo-border px-2 py-1 text-center">
                        {symbol}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {automaton.states.map((state) => (
                    <tr key={state.id}>
                      <td className="border border-computo-border px-2 py-1 font-semibold">
                        {state.id}
                      </td>
                      {transitionTableSymbols.map((symbol) => {
                        const search = symbol === "ε" ? "" : symbol;
                        const targets = automaton.transitions
                          .filter(
                            (transition) =>
                              transition.from === state.id && transition.input === search,
                          )
                          .map((transition) => transition.to)
                          .join(", ");
                        return (
                          <td
                            key={`${state.id}:${symbol}`}
                            className="border border-computo-border px-2 py-1 text-center"
                          >
                            {targets || "-"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="space-y-2 text-xs">
                {automaton.transitions.map((transition) => (
                  <div
                    key={transition.id}
                    className="rounded border border-computo-border bg-slate-950/80 px-2 py-1"
                  >
                    <div className="font-semibold">
                      {transition.from} → {transition.to}
                    </div>
                    <div className="font-mono text-computo-text">
                      {getTransitionLabel(automaton.type, transition)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-md border border-computo-border bg-computo-card p-3 text-xs">
            <h3 className="mb-2 text-[11px] font-semibold tracking-[0.08em] text-computo-muted uppercase">
              Propriedades
            </h3>
            <div className="flex items-center justify-between">
              <span className="text-computo-muted">Estados</span>
              <span className="font-mono">{automaton.states.length}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-computo-muted">Transições</span>
              <span className="font-mono">{automaton.transitions.length}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-computo-muted">Alfabeto</span>
              <span className="font-mono">{`{${automaton.alphabet.join(", ")}}`}</span>
            </div>
          </section>
        </aside>

        <section className="computo-canvas flex min-h-0 flex-col">
          <div className="flex h-12 items-center justify-between border-b border-computo-border px-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => {
                  reactFlowInstance?.zoomIn({ duration: 120 });
                }}
              >
                <ZoomIn />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => {
                  reactFlowInstance?.zoomOut({ duration: 120 });
                }}
              >
                <ZoomOut />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => {
                  reactFlowInstance?.setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 180 });
                  setZoom(1);
                }}
              >
                <RotateCcw />
              </Button>
              <span className="pl-1 font-mono text-xs text-computo-muted">
                {Math.round(zoom * 100)}%
              </span>
            </div>
            <label className="flex items-center gap-2 text-xs text-computo-text">
              <input
                type="checkbox"
                checked={snapToGrid}
                onChange={(event) => setSnapToGrid(event.target.checked)}
              />
              Snap to Grid
            </label>
          </div>

          <div className="relative flex-1">
            <ReactFlow
              nodes={graphNodes}
              edges={graphEdges}
              nodeTypes={nodeTypes}
              colorMode="dark"
              onInit={(instance) => {
                setReactFlowInstance(instance);
              }}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onPaneClick={onPaneClick}
              onNodeClick={(_, node) => {
                if (toolMode === "delete") {
                  deleteState(node.id);
                  return;
                }
                setSelectedState(node.id);
              }}
              onEdgeClick={(_, edge) => {
                if (toolMode === "delete") {
                  deleteTransition(edge.id);
                  return;
                }
                setSelectedTransition(edge.id);
                openTransitionEditor(edge.id);
              }}
              onMoveEnd={(_, viewport) => {
                setZoom(viewport.zoom);
              }}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              nodesConnectable={toolMode === "transition"}
              nodesDraggable={toolMode !== "delete"}
              snapToGrid={snapToGrid}
              snapGrid={[20, 20]}
              attributionPosition="top-right"
            >
              <MiniMap zoomable pannable />
              <Controls />
            </ReactFlow>
            {automaton.states.length === 0 ? (
              <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-md border border-computo-border bg-computo-card px-3 py-2 text-xs text-computo-text">
                Clique no canvas para adicionar estados.
              </div>
            ) : null}
          </div>

          {(automaton.type === "TM" || automaton.type === "LBA" || automaton.type === "PDA") && (
            <div className="border-t border-computo-border p-3">
              {automaton.type === "PDA" ? (
                <div>
                  <div className="mb-2 text-[11px] font-semibold tracking-[0.08em] text-computo-muted uppercase">
                    Pilha
                  </div>
                  {simulation.pdaConfigurations[0]?.stack.length ? (
                    <div className="flex flex-wrap gap-1">
                      {[...simulation.pdaConfigurations[0].stack].reverse().map((symbol, index) => (
                        <span
                          key={`${symbol}:${index}`}
                          className="rounded border border-computo-border bg-slate-900 px-2 py-1 font-mono text-xs"
                        >
                          {symbol}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-computo-muted">
                      Pilha será exibida durante a simulação.
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-[0.08em] text-computo-muted uppercase">
                    <span>Fita</span>
                    {automaton.type === "LBA" ? (
                      <span className="text-emerald-400">(limitada)</span>
                    ) : null}
                  </div>
                  {tapeWindow.length > 0 ? (
                    <div className="flex items-center gap-1 overflow-x-auto pb-1">
                      {automaton.type === "LBA" ? (
                        <span className="rounded border border-computo-border bg-slate-900 px-2 py-1 text-xs text-computo-muted">
                          ⊢
                        </span>
                      ) : null}
                      {tapeWindow.map((cell) => (
                        <div
                          key={cell.absoluteIndex}
                          className={`grid min-w-10 place-items-center rounded border px-2 py-2 font-mono text-xs ${cell.head
                              ? "border-emerald-400 bg-emerald-500/15 text-emerald-200"
                              : "border-computo-border bg-slate-900 text-computo-text"
                            }`}
                        >
                          {cell.value || automaton.blankSymbol}
                        </div>
                      ))}
                      {automaton.type === "LBA" ? (
                        <span className="rounded border border-computo-border bg-slate-900 px-2 py-1 text-xs text-computo-muted">
                          ⊣
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-xs text-computo-muted">Fita será exibida durante a simulação.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        <aside className="computo-panel border-l p-3">
          <section className="mb-3 rounded-md border border-computo-border bg-computo-card p-3">
            <h3 className="mb-2 text-[11px] font-semibold tracking-[0.08em] text-computo-muted uppercase">
              Simulação
            </h3>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={simulation.input}
                  onChange={(event) => setSimulationInput(event.target.value)}
                  placeholder="ex: aabb"
                  className="h-9"
                />
                <Button size="sm" onClick={startSimulation}>
                  Simular
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Button size="sm" variant="outline" onClick={stepSimulation}>
                  <Move data-icon="inline-start" />
                  Passo
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (simulation.running && simulation.accepted === null) {
                      useComputoStore.setState((state) => ({
                        simulation: {
                          ...state.simulation,
                          running: false,
                        },
                      }));
                    } else {
                      startSimulation();
                    }
                  }}
                >
                  {simulation.running && simulation.accepted === null ? (
                    <Pause data-icon="inline-start" />
                  ) : (
                    <Play data-icon="inline-start" />
                  )}
                  {simulation.running && simulation.accepted === null ? "Pausar" : "Executar"}
                </Button>
                <Button size="sm" variant="outline" onClick={resetSimulation}>
                  <RotateCcw data-icon="inline-start" />
                  Resetar
                </Button>
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1 text-xs text-computo-muted">
                  <Clock3 className="size-3" />
                  Velocidade
                </label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={simulation.speed}
                  onChange={(event) => setSimulationSpeed(Number(event.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>
            </div>
          </section>

          {simulation.accepted !== null ? (
            <section className="mb-3 rounded-md border border-computo-border bg-computo-card p-3">
              <div
                className={`rounded-md border px-3 py-2 text-center text-sm font-semibold ${simulation.accepted
                    ? "border-green-500/60 bg-green-500/15 text-green-300"
                    : "border-red-500/60 bg-red-500/15 text-red-300"
                  }`}
              >
                {simulation.accepted ? "ACEITO" : "REJEITADO"}
              </div>
            </section>
          ) : null}

          <section className="mb-3 min-h-0 rounded-md border border-computo-border bg-computo-card p-3">
            <h3 className="mb-2 text-[11px] font-semibold tracking-[0.08em] text-computo-muted uppercase">
              Histórico de Computação
            </h3>
            <div className="max-h-44 space-y-1 overflow-auto pr-1 text-xs">
              {simulation.history.length === 0 ? (
                <p className="text-computo-muted">Nenhuma simulação executada.</p>
              ) : (
                simulation.history.map((entry) => (
                  <div
                    key={`history-${entry.step}`}
                    className="rounded border border-computo-border bg-computo-bg/70 p-2"
                  >
                    <div className="flex items-center justify-between text-[10px] text-computo-muted">
                      <span>Passo {entry.step}</span>
                      <span>{entry.transitionLabel}</span>
                    </div>
                    <div className="mt-1 text-computo-text">Estado: {entry.stateLabel}</div>
                    {automaton.type === "PDA" ? (
                      <div className="mt-1 text-[10px] text-computo-muted">
                        Pilha: {entry.stack.join(" ") || "∅"}
                      </div>
                    ) : null}
                    {automaton.type === "TM" || automaton.type === "LBA" ? (
                      <div className="mt-1 text-[10px] text-computo-muted">
                        Cabeça: {entry.tapeHead} | {entry.tape.slice(0, 12).join(" ")}
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </section>

          {(automaton.type === "NFA" || automaton.type === "PDA") &&
            simulation.branchTree !== null ? (
            <section className="mb-3 rounded-md border border-computo-border bg-computo-card p-3">
              <h3 className="mb-2 text-[11px] font-semibold tracking-[0.08em] text-computo-muted uppercase">
                Árvore de Computação
              </h3>
              <div className="h-52 overflow-hidden rounded border border-computo-border">
                <ReactFlow
                  nodes={branchFlow.nodes}
                  edges={branchFlow.edges}
                  nodeTypes={nodeTypes}
                  colorMode="dark"
                  nodesConnectable={false}
                  nodesDraggable={false}
                  elementsSelectable={false}
                  panOnDrag
                  zoomOnScroll
                  fitView
                  fitViewOptions={{ padding: 0.2 }}
                  proOptions={{ hideAttribution: true }}
                />
              </div>
              {simulation.branchTree.truncated ? (
                <p className="mt-2 text-[10px] text-yellow-300">
                  Árvore truncada pelo limite de expansão.
                </p>
              ) : null}
            </section>
          ) : null}

          {selectedState ? (
            <section className="rounded-md border border-computo-border bg-computo-card p-3">
              <h3 className="mb-2 text-[11px] font-semibold tracking-[0.08em] text-computo-muted uppercase">
                Editor de Estado
              </h3>
              <div className="space-y-2 text-xs">
                <label className="space-y-1">
                  <span className="text-computo-muted">Identificador</span>
                  <Input
                    value={stateEditor.id}
                    onChange={(event) =>
                      setStateEditor((prev) => ({ ...prev, id: event.target.value }))
                    }
                    className="h-8"
                  />
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={stateEditor.isInitial}
                    onChange={(event) =>
                      setStateEditor((prev) => ({
                        ...prev,
                        isInitial: event.target.checked,
                      }))
                    }
                  />
                  Estado inicial
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={stateEditor.isAccepting}
                    onChange={(event) =>
                      setStateEditor((prev) => ({
                        ...prev,
                        isAccepting: event.target.checked,
                      }))
                    }
                  />
                  Estado de aceitação
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      updateState(selectedState.id, stateEditor);
                    }}
                  >
                    Salvar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      deleteState(selectedState.id);
                    }}
                  >
                    Deletar
                  </Button>
                </div>
              </div>
            </section>
          ) : (
            <section className="rounded-md border border-computo-border bg-computo-card p-3 text-xs text-computo-muted">
              Selecione um estado para editar.
            </section>
          )}
        </aside>
      </main>

      {showExamplesModal ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-lg border border-computo-border bg-computo-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Biblioteca de Exemplos</h2>
              <Button size="icon-sm" variant="outline" onClick={closeExamples}>
                ✕
              </Button>
            </div>
            <div className="grid max-h-[60vh] grid-cols-2 gap-2 overflow-auto pr-1">
              {getBuiltInExamples().map((example) => (
                <button
                  key={example.id}
                  type="button"
                  className="rounded-md border border-computo-border bg-slate-950/80 p-3 text-left transition-colors hover:border-emerald-400/70"
                  onClick={() => loadExample(example.id)}
                >
                  <div
                    className={`text-[11px] font-semibold uppercase ${MACHINE_ACCENT_CLASS[example.type]}`}
                  >
                    {example.type}
                  </div>
                  <div className="mt-1 font-semibold text-slate-100">{example.name}</div>
                  <p className="mt-1 text-xs text-computo-muted">{example.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {showTransitionModal && selectedTransition ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-computo-border bg-computo-card p-4">
            <h2 className="mb-2 text-lg font-semibold">Editar Transição</h2>
            <p className="mb-3 text-xs text-computo-muted">
              {selectedTransition.from} → {selectedTransition.to}
            </p>

            <div className="space-y-2 text-xs">
              <label className="space-y-1">
                <span className="text-computo-muted">Símbolo de entrada</span>
                <Input
                  value={transitionEditor.input ?? ""}
                  onChange={(event) =>
                    setTransitionEditor((prev) => ({ ...prev, input: event.target.value }))
                  }
                  className="h-8"
                />
              </label>

              {selectedTransition.kind === "PDA" ? (
                <>
                  <label className="space-y-1">
                    <span className="text-computo-muted">Pop</span>
                    <Input
                      value={transitionEditor.pop ?? ""}
                      onChange={(event) =>
                        setTransitionEditor((prev) => ({
                          ...prev,
                          pop: event.target.value,
                        }))
                      }
                      className="h-8"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-computo-muted">Push</span>
                    <Input
                      value={transitionEditor.push ?? ""}
                      onChange={(event) =>
                        setTransitionEditor((prev) => ({
                          ...prev,
                          push: event.target.value,
                        }))
                      }
                      className="h-8"
                    />
                  </label>
                </>
              ) : null}

              {selectedTransition.kind === "TM" ? (
                <>
                  <label className="space-y-1">
                    <span className="text-computo-muted">Símbolo escrito</span>
                    <Input
                      value={transitionEditor.write ?? ""}
                      onChange={(event) =>
                        setTransitionEditor((prev) => ({
                          ...prev,
                          write: event.target.value,
                        }))
                      }
                      className="h-8"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-computo-muted">Direção</span>
                    <select
                      className="computo-input h-8 w-full rounded-md px-2"
                      value={transitionEditor.move ?? "R"}
                      onChange={(event) =>
                        setTransitionEditor((prev) => ({
                          ...prev,
                          move: event.target.value,
                        }))
                      }
                    >
                      <option value="R">R (direita)</option>
                      <option value="L">L (esquerda)</option>
                      <option value="S">S (parado)</option>
                    </select>
                  </label>
                </>
              ) : null}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <Button variant="outline" size="sm" onClick={closeTransitionEditor}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  updateTransition(selectedTransition.id, transitionEditor);
                  closeTransitionEditor();
                }}
              >
                Salvar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  deleteTransition(selectedTransition.id);
                  closeTransitionEditor();
                }}
              >
                Deletar
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="application/json,.json"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file === undefined) {
            return;
          }

          const reader = new FileReader();
          reader.onload = () => {
            const value = typeof reader.result === "string" ? reader.result : "";
            if (value.length === 0) {
              toast.error("Arquivo inválido.");
              return;
            }

            const success = importAutomatonJson(value);
            if (success) {
              toast.success("Autômato importado com sucesso.");
            }
          };
          reader.readAsText(file);
          event.currentTarget.value = "";
        }}
      />
    </div>
  );
}

export default function ComputoApp() {
  return (
    <ReactFlowProvider>
      <ComputoAppInner />
    </ReactFlowProvider>
  );
}
