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

const VISIBLE_HANDLE_STYLE = {
  width: 10,
  height: 10,
  borderRadius: "999px",
  border: "1px solid rgba(148, 163, 184, 0.55)",
  background: "rgba(15, 23, 42, 0.95)",
  boxShadow: "0 0 0 3px rgba(15, 23, 42, 0.5)",
} as const;

/** Matches `size-14` state circle: handles sit on the rim, not on the box top edge. */
const STATE_NODE_BOX_PX = 56;

function rimTopPxForHandleLeft(left: string): number {
  const pct = Number.parseFloat(left) / 100;
  const cx = STATE_NODE_BOX_PX / 2;
  const r = STATE_NODE_BOX_PX / 2;
  const x = pct * STATE_NODE_BOX_PX;
  const inner = r * r - (x - cx) ** 2;
  if (inner <= 0) {
    return 0;
  }
  return cx - Math.sqrt(inner);
}

function rimBottomPxForHandleLeft(left: string): number {
  const pct = Number.parseFloat(left) / 100;
  const cx = STATE_NODE_BOX_PX / 2;
  const r = STATE_NODE_BOX_PX / 2;
  const x = pct * STATE_NODE_BOX_PX;
  const inner = r * r - (x - cx) ** 2;
  if (inner <= 0) {
    return STATE_NODE_BOX_PX;
  }
  return cx + Math.sqrt(inner);
}

function rimRightPxForHandleTop(top: string): number {
  const pct = Number.parseFloat(top) / 100;
  const cy = STATE_NODE_BOX_PX / 2;
  const r = STATE_NODE_BOX_PX / 2;
  const y = pct * STATE_NODE_BOX_PX;
  const inner = r * r - (y - cy) ** 2;
  if (inner <= 0) {
    return STATE_NODE_BOX_PX;
  }
  return cy + Math.sqrt(inner);
}

function topHandleStyle(left: string, show: boolean) {
  return {
    ...(show ? VISIBLE_HANDLE_STYLE : HIDDEN_HANDLE_STYLE),
    left,
    top: rimTopPxForHandleLeft(left),
    transform: "translate(-50%, -50%)",
  } as const;
}

function rightHandleStyle(top: string, show: boolean) {
  return {
    ...(show ? VISIBLE_HANDLE_STYLE : HIDDEN_HANDLE_STYLE),
    top,
    left: rimRightPxForHandleTop(top),
    transform: "translate(-50%, -50%)",
  } as const;
}

function bottomHandleStyle(left: string, show: boolean) {
  return {
    ...(show ? VISIBLE_HANDLE_STYLE : HIDDEN_HANDLE_STYLE),
    left,
    top: rimBottomPxForHandleLeft(left),
    transform: "translate(-50%, -50%)",
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
      <Handle
        id={HANDLE_IDS.targetRight}
        type="target"
        position={Position.Right}
        style={rightHandleStyle("62%", data.showTransitionHandles)}
      />
      <Handle
        id={HANDLE_IDS.targetBottom}
        type="target"
        position={Position.Bottom}
        style={bottomHandleStyle("38%", data.showTransitionHandles)}
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
        style={rightHandleStyle("38%", data.showTransitionHandles)}
      />
      <Handle
        id={HANDLE_IDS.sourceBottom}
        type="source"
        position={Position.Bottom}
        style={bottomHandleStyle("62%", data.showTransitionHandles)}
      />
    </div>
  );
}
