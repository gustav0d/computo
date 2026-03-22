import { BaseEdge, type Edge, type EdgeProps } from "@xyflow/react";

type SelfLoopEdgeData = {
  loopTier?: number;
};

export type SelfLoopEdgeType = Edge<SelfLoopEdgeData, "selfLoop">;

const BASE_LOOP_HEIGHT = 44;
const LOOP_TIER_SPACING = 36;
const LABEL_OFFSET = 12;

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
  const topY = Math.min(sourceY, targetY) - loopHeight;
  const labelX = (sourceX + targetX) / 2;
  const labelY = topY - LABEL_OFFSET;
  const path = `M ${sourceX} ${sourceY} C ${sourceX} ${topY}, ${targetX} ${topY}, ${targetX} ${targetY}`;

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
