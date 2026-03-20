import type { ComponentProps } from "react";

type InitialStateArrowProps = ComponentProps<"svg">;

export function InitialStateArrow(props: InitialStateArrowProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 16" fill="none" {...props}>
      <line x1="0" y1="8" x2="22" y2="8" stroke="currentColor" strokeWidth="2" />
      <polyline
        points="14,3 24,8 14,13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
