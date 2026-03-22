import { Handle, type Node, type NodeProps, Position } from "@xyflow/react";

import { HANDLE_IDS } from "../edge-routing";
import { InitialStateArrow } from "./initial-state-arrow";

export type StateNodeData = {
  id: string;
  isInitial: boolean;
  isAccepting: boolean;
  active: boolean;
  showTransitionHandles: boolean;
};

const HIDDEN_HANDLE_STYLE = {
  opacity: 0,
  width: 12,
  height: 12,
  background: "transparent",
  border: "none",
} as const;

const TOP_HANDLE_VISIBLE_STYLE = {
  width: 10,
  height: 10,
  borderRadius: "999px",
  border: "1px solid rgba(148, 163, 184, 0.55)",
  background: "rgba(15, 23, 42, 0.95)",
  boxShadow: "0 0 0 3px rgba(15, 23, 42, 0.5)",
} as const;

function topHandleStyle(left: string, show: boolean) {
  return {
    ...(show ? TOP_HANDLE_VISIBLE_STYLE : HIDDEN_HANDLE_STYLE),
    left,
    top: -5,
    transform: "translateX(-50%)",
  } as const;
}

export function StateNode({ data, selected }: NodeProps<Node<StateNodeData>>) {
  const ringClass = data.active ? "ring-2 ring-emerald-400/70" : "";
  const borderClass = selected ? "border-emerald-400" : "border-slate-500/60";

  return (
    <div className="relative">
      <Handle
        id={HANDLE_IDS.targetLeft}
        type="target"
        position={Position.Left}
        style={HIDDEN_HANDLE_STYLE}
      />
      <Handle
        id={HANDLE_IDS.targetTopLeft}
        type="target"
        position={Position.Top}
        style={topHandleStyle("24%", data.showTransitionHandles)}
      />
      <Handle
        id={HANDLE_IDS.targetTopCenter}
        type="target"
        position={Position.Top}
        style={topHandleStyle("50%", data.showTransitionHandles)}
      />
      <Handle
        id={HANDLE_IDS.targetTopRight}
        type="target"
        position={Position.Top}
        style={topHandleStyle("76%", data.showTransitionHandles)}
      />
      {data.isInitial ? (
        <InitialStateArrow
          className="pointer-events-none absolute -left-[13px] top-1/2 -translate-y-1/2 text-computo-muted"
          width="12"
          height="12"
        />
      ) : null}
      <div
        className={`grid size-14 place-items-center rounded-full border-2 bg-slate-900 text-sm font-semibold text-slate-100 ${borderClass} ${ringClass}`}
      >
        <span>{data.id}</span>
      </div>
      {data.isAccepting ? (
        <div className="pointer-events-none absolute left-1/2 top-1/2 size-11 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-200/80" />
      ) : null}
      <Handle
        id={HANDLE_IDS.sourceTopLeft}
        type="source"
        position={Position.Top}
        style={topHandleStyle("24%", data.showTransitionHandles)}
      />
      <Handle
        id={HANDLE_IDS.sourceTopCenter}
        type="source"
        position={Position.Top}
        style={topHandleStyle("50%", data.showTransitionHandles)}
      />
      <Handle
        id={HANDLE_IDS.sourceTopRight}
        type="source"
        position={Position.Top}
        style={topHandleStyle("76%", data.showTransitionHandles)}
      />
      <Handle
        id={HANDLE_IDS.sourceRight}
        type="source"
        position={Position.Right}
        style={HIDDEN_HANDLE_STYLE}
      />
    </div>
  );
}
