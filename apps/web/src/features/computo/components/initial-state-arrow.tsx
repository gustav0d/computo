import type { ComponentProps } from "react";

type InitialStateArrowProps = ComponentProps<"svg">;

export function InitialStateArrow(props: InitialStateArrowProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 12 12" fill="none" {...props}>
      <polyline
        points="1.5,1.5 10.5,6 1.5,10.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
