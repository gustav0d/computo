import { describe, expect, test } from "bun:test";

import {
  HANDLE_IDS,
  SELF_LOOP_SLOT_COUNT,
  getSelfLoopRoute,
  resolveCreatedTransitionHandles,
  resolveTransitionHandles,
} from "./edge-routing";

describe("edge routing", () => {
  test("assigns three distinct upper anchors before moving to the next tier", () => {
    const first = getSelfLoopRoute(0);
    const second = getSelfLoopRoute(1);
    const third = getSelfLoopRoute(2);
    const fourth = getSelfLoopRoute(3);

    expect(new Set([first.targetHandle, second.targetHandle, third.targetHandle]).size).toBe(
      SELF_LOOP_SLOT_COUNT,
    );
    expect(first.loopTier).toBe(0);
    expect(second.loopTier).toBe(0);
    expect(third.loopTier).toBe(0);
    expect(fourth.loopTier).toBe(1);
  });

  test("preserves chosen handles for regular transitions", () => {
    const handles = resolveCreatedTransitionHandles([], "q0", "q1", {
      sourceHandle: HANDLE_IDS.sourceTopCenter,
      targetHandle: HANDLE_IDS.targetTopLeft,
    });

    expect(handles).toEqual({
      sourceHandle: HANDLE_IDS.sourceTopCenter,
      targetHandle: HANDLE_IDS.targetTopLeft,
    });
  });

  test("forces self-loops into upper slots even when created from side anchors", () => {
    const handles = resolveCreatedTransitionHandles(
      [
        {
          id: "t0",
          kind: "FA",
          from: "q0",
          to: "q0",
          input: "",
        },
      ],
      "q0",
      "q0",
      {
        sourceHandle: HANDLE_IDS.sourceRight,
        targetHandle: HANDLE_IDS.targetLeft,
      },
    );

    expect(handles).toEqual({
      sourceHandle: HANDLE_IDS.sourceTopLeft,
      targetHandle: HANDLE_IDS.targetTopCenter,
    });
  });

  test("falls back to default side anchors for legacy regular transitions", () => {
    const handles = resolveTransitionHandles({
      id: "t1",
      kind: "FA",
      from: "q0",
      to: "q1",
      input: "a",
    });

    expect(handles).toMatchObject({
      sourceHandle: HANDLE_IDS.sourceRight,
      targetHandle: HANDLE_IDS.targetLeft,
      loopSlot: null,
      loopTier: 0,
    });
  });
});
