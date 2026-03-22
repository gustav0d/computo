import { BaseEdge, type Edge, type EdgeProps } from "@xyflow/react";

import type { SelfLoopSide } from "../edge-routing";

type SelfLoopEdgeData = {
  loopTier?: number;
  loopSide?: SelfLoopSide;
};

export type SelfLoopEdgeType = Edge<SelfLoopEdgeData, "selfLoop">;

/**
 * Self-loop layout (all in this file):
 * - `BASE_LOOP_HEIGHT` — vertical distance from handle chord to arc peak (first / tier-0 loop).
 * - `LOOP_TIER_SPACING` — extra height per stacked self-loop (tier 1, 2, …); space between loops.
 * - `LABEL_OFFSET` — gap above the arc peak to the transition label (e.g. "a").
 */
const BASE_LOOP_HEIGHT = 44;
const LOOP_TIER_SPACING = 40;
const LABEL_OFFSET = 0;

/**
 * For `Position.Top`, React Flow passes the top edge of the handle box as `sourceY` / `targetY`,
 * not the center (`getHandlePosition` in @xyflow/system). Handles are visually centered on the
 * rim (state-node), so we shift Y by half the handle height (12px hidden / 10px visible → 5–6px).
 */
const TOP_HANDLE_CENTER_Y_OFFSET = 6;
const BOTTOM_HANDLE_CENTER_Y_OFFSET = -6;
const RIGHT_HANDLE_CENTER_X_OFFSET = -6;

export function SelfLoopEdge({
  data,
  interactionWidth,
  label,
  labelBgBorderRadius,
  labelBgPadding,
  labelBgStyle,
  labelShowBg,
  labelStyle,
  markerEnd,
  selected,
  sourceX,
  sourceY,
  style,
  targetX,
  targetY,
}: EdgeProps<SelfLoopEdgeType>) {
  const loopTier = data?.loopTier ?? 0;
  const loopHeight = BASE_LOOP_HEIGHT + loopTier * LOOP_TIER_SPACING;
  const loopSide = data?.loopSide ?? "top";

  const sy = sourceY + (loopSide === "top" ? TOP_HANDLE_CENTER_Y_OFFSET : 0);
  const ty = targetY + (loopSide === "top" ? TOP_HANDLE_CENTER_Y_OFFSET : 0);
  const by = sourceY + (loopSide === "bottom" ? BOTTOM_HANDLE_CENTER_Y_OFFSET : 0);
  const tyBottom = targetY + (loopSide === "bottom" ? BOTTOM_HANDLE_CENTER_Y_OFFSET : 0);
  const sx = sourceX + (loopSide === "right" ? RIGHT_HANDLE_CENTER_X_OFFSET : 0);
  const tx = targetX + (loopSide === "right" ? RIGHT_HANDLE_CENTER_X_OFFSET : 0);

  const topY = Math.min(sy, ty) - loopHeight;
  const bottomY = Math.max(by, tyBottom) + loopHeight;
  const rightX = Math.max(sx, tx) + loopHeight;

  const path =
    loopSide === "bottom"
      ? `M ${sourceX} ${by} C ${sourceX} ${bottomY}, ${targetX} ${bottomY}, ${targetX} ${tyBottom}`
      : loopSide === "right"
        ? `M ${sx} ${sourceY} C ${rightX} ${sourceY}, ${rightX} ${targetY}, ${tx} ${targetY}`
        : `M ${sourceX} ${sy} C ${sourceX} ${topY}, ${targetX} ${topY}, ${targetX} ${ty}`;

  const labelX =
    loopSide === "right" ? rightX + LABEL_OFFSET : (sourceX + targetX) / 2;
  const labelY =
    loopSide === "bottom"
      ? bottomY + LABEL_OFFSET
      : loopSide === "right"
        ? (sourceY + targetY) / 2
        : topY - LABEL_OFFSET;

  const resolvedStrokeWidth = Number.parseFloat(String(style?.strokeWidth ?? 1.6));

  return (
    <BaseEdge
      path={path}
      markerEnd={markerEnd}
      interactionWidth={interactionWidth ?? 24}
      style={
        selected
          ? {
              ...style,
              strokeWidth: Number.isFinite(resolvedStrokeWidth)
                ? resolvedStrokeWidth + 0.4
                : style?.strokeWidth,
            }
          : style
      }
      label={label}
      labelX={labelX}
      labelY={labelY}
      labelStyle={labelStyle}
      labelShowBg={labelShowBg ?? true}
      labelBgPadding={labelBgPadding ?? [6, 2]}
      labelBgBorderRadius={labelBgBorderRadius ?? 4}
      labelBgStyle={
        selected
          ? {
              ...labelBgStyle,
              stroke: typeof style?.stroke === "string" ? style.stroke : undefined,
              strokeWidth: 1,
            }
          : labelBgStyle
      }
    />
  );
}
