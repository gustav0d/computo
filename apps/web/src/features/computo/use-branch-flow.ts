import type { BranchTree } from "@computo/automata-core";
import { type Edge, MarkerType, type Node } from "@xyflow/react";
import { useMemo } from "react";

import type { BranchNodeData } from "./components/branch-node";
import type { FlowPalette } from "./theme";

export function useBranchFlow(branchTree: BranchTree | null, palette: FlowPalette) {
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
            color: palette.markerDefault,
          },
          style: {
            stroke: palette.branchEdgeStroke,
          },
          labelStyle: {
            fontSize: 10,
          },
        }) satisfies Edge,
    );

    return { nodes, edges };
  }, [branchTree, palette]);
}
