import { BaseEdge, type Edge, type EdgeProps } from "@xyflow/react";

type SelfLoopEdgeData = {
  loopIndex?: number;
};

export type SelfLoopEdgeType = Edge<SelfLoopEdgeData, "selfLoop">;

const BASE_LOOP_HEIGHT = 52;
const LOOP_SPACING = 24;
const LABEL_OFFSET = 12;
const LOOP_ANCHOR_OFFSET_X = 18;
const LOOP_ANCHOR_OFFSET_Y = 18;

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
  const loopIndex = data?.loopIndex ?? 0;
  const centerX = (sourceX + targetX) / 2;
  const centerY = (sourceY + targetY) / 2;
  const loopHeight = BASE_LOOP_HEIGHT + loopIndex * LOOP_SPACING;
  const topY = centerY - loopHeight;
  const anchorY = centerY - LOOP_ANCHOR_OFFSET_Y;
  const startX = centerX + LOOP_ANCHOR_OFFSET_X;
  const endX = centerX - LOOP_ANCHOR_OFFSET_X;
  const labelX = (startX + endX) / 2;
  const labelY = topY - LABEL_OFFSET;
  const path = `M ${startX} ${anchorY} C ${startX} ${topY}, ${endX} ${topY}, ${endX} ${anchorY}`;

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
