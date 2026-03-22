import { type Node, type NodeProps } from "@xyflow/react";

export type BranchNodeData = {
  label: string;
  status: "running" | "accepted" | "rejected" | "halted";
  stack: string[];
};

export function BranchNode({ data }: NodeProps<Node<BranchNodeData>>) {
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
}
